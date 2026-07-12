import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { writeFinAudit } from "./finance-audit.helper";
import { requireFinView, requireFinEdit } from "./finance-guard";


// ---------- helpers ----------
async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function nextNo(prefix: string, table: string, col: string) {
  const sb = await adminClient();
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  const like = `${prefix}-${yyyymm}-%`;
  const { data } = await (sb.from(table) as any)
    .select(col)
    .like(col, like)
    .order(col, { ascending: false })
    .limit(1);
  const last = (data?.[0]?.[col] as string | undefined) ?? "";
  const n = Number(last.split("-").pop() ?? "0") || 0;
  return `${prefix}-${yyyymm}-${String(n + 1).padStart(4, "0")}`;
}

async function postJournal(opts: {
  sumber: "invoice" | "payment" | "expense" | "manual";
  ref_id?: string;
  ref_no?: string;
  tanggal: string;
  keterangan: string;
  lines: { coa_code: string; coa_nama?: string; debit?: number; kredit?: number; keterangan?: string }[];
  created_by?: string;
}) {
  const sb = await adminClient();
  const no_jurnal = await nextNo("JV", "fin_journal_entry", "no_jurnal");
  const total = opts.lines.reduce((a, l) => a + Number(l.debit ?? 0), 0);
  const { data: entry, error } = await sb
    .from("fin_journal_entry")
    .insert({
      no_jurnal,
      tanggal: opts.tanggal,
      sumber: opts.sumber,
      ref_id: opts.ref_id ?? null,
      ref_no: opts.ref_no ?? null,
      keterangan: opts.keterangan,
      total,
      status: "posted",
      created_by: opts.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const payload = opts.lines.map((l) => ({
    entry_id: entry.id,
    coa_code: l.coa_code,
    coa_nama: l.coa_nama ?? null,
    debit: l.debit ?? 0,
    kredit: l.kredit ?? 0,
    keterangan: l.keterangan ?? opts.keterangan,
  }));
  const { error: e2 } = await sb.from("fin_journal_line").insert(payload);
  if (e2) throw new Error(e2.message);
  return entry;
}

async function reverseJournal(sumber: string, ref_id: string, tanggal: string, reason: string) {
  const sb = await adminClient();
  const { data: entries } = await sb
    .from("fin_journal_entry")
    .select("id, no_jurnal")
    .eq("sumber", sumber)
    .eq("ref_id", ref_id)
    .eq("status", "posted");
  for (const e of entries ?? []) {
    const { data: lines } = await sb.from("fin_journal_line").select("*").eq("entry_id", e.id);
    await postJournal({
      sumber: sumber as any,
      ref_id,
      ref_no: `REV-${e.no_jurnal}`,
      tanggal,
      keterangan: `Reversal: ${reason}`,
      lines: (lines ?? []).map((l: any) => ({
        coa_code: l.coa_code,
        coa_nama: l.coa_nama,
        debit: Number(l.kredit),
        kredit: Number(l.debit),
        keterangan: l.keterangan,
      })),
    });
    await sb.from("fin_journal_entry").update({ status: "reversed" }).eq("id", e.id);
  }
}

// ---------- INVOICE ----------
const invoiceItemSchema = z.object({
  id: z.string().optional(),
  layanan_id: z.string().uuid().nullable().optional(),
  layanan_nama: z.string().min(1),
  tarif: z.number().min(0),
  qty: z.number().int().min(1),
});

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string; q?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    let q = sb.from("fin_invoice").select("*").order("tanggal", { ascending: false }).limit(500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.q) q = q.or(`no_invoice.ilike.%${data.q}%,patient_name.ilike.%${data.q}%,patient_code.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const getInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const { data: inv } = await sb.from("fin_invoice").select("*").eq("id", data.id).single();
    const { data: items } = await sb.from("fin_invoice_item").select("*").eq("invoice_id", data.id);
    const { data: pays } = await sb.from("fin_pembayaran").select("*").eq("invoice_id", data.id).order("tanggal");
    return { invoice: inv, items: items ?? [], payments: pays ?? [] };
  });

export const upsertInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: {
    id?: string;
    tanggal: string;
    patient_code: string;
    patient_name?: string;
    dokter_id?: string | null;
    payer_id?: string | null;
    kasir?: string;
    diskon?: number;
    pajak_pct?: number;
    catatan?: string;
    items: z.infer<typeof invoiceItemSchema>[];
    actor?: string;
  }) => ({
    ...d,
    id: d.id ? z.string().uuid().parse(d.id) : undefined,
    items: z.array(invoiceItemSchema).min(1).parse(d.items),
  }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const subtotal = data.items.reduce((a, it) => a + Number(it.tarif) * Number(it.qty), 0);
    const diskon = Number(data.diskon ?? 0);
    const dpp = Math.max(0, subtotal - diskon);
    const pajak = Math.round(dpp * Number(data.pajak_pct ?? 0) / 100);
    const total = dpp + pajak;

    let invoice: any;
    if (data.id) {
      const { data: row, error } = await sb.from("fin_invoice").update({
        tanggal: data.tanggal,
        patient_code: data.patient_code,
        patient_name: data.patient_name ?? null,
        dokter_id: data.dokter_id ?? null,
        payer_id: data.payer_id ?? null,
        kasir: data.kasir ?? null,
        diskon,
        subtotal,
        pajak,
        total,
        catatan: data.catatan ?? null,
      }).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      invoice = row;
      await sb.from("fin_invoice_item").delete().eq("invoice_id", data.id);
    } else {
      const no_invoice = await nextNo("INV", "fin_invoice", "no_invoice");
      const { data: row, error } = await sb.from("fin_invoice").insert({
        no_invoice,
        tanggal: data.tanggal,
        patient_code: data.patient_code,
        patient_name: data.patient_name ?? null,
        dokter_id: data.dokter_id ?? null,
        payer_id: data.payer_id ?? null,
        kasir: data.kasir ?? null,
        diskon,
        subtotal,
        pajak,
        total,
        dibayar: 0,
        status: "issued",
        catatan: data.catatan ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      invoice = row;
    }

    const itemsPayload = data.items.map((it) => ({
      invoice_id: invoice.id,
      layanan_id: it.layanan_id ?? null,
      layanan_nama: it.layanan_nama,
      tarif: it.tarif,
      qty: it.qty,
      subtotal: Number(it.tarif) * Number(it.qty),
    }));
    const { error: ie } = await sb.from("fin_invoice_item").insert(itemsPayload);
    if (ie) throw new Error(ie.message);

    if (data.id) await reverseJournal("invoice", invoice.id, data.tanggal, "Edit invoice");
    const invEntry = await postJournal({
      sumber: "invoice",
      ref_id: invoice.id,
      ref_no: invoice.no_invoice,
      tanggal: data.tanggal,
      keterangan: `Invoice ${invoice.no_invoice} - ${data.patient_name ?? data.patient_code}`,
      created_by: data.actor,
      lines: [
        { coa_code: "1-1300", coa_nama: "Piutang Pasien", debit: total },
        ...(diskon > 0 ? [{ coa_code: "4-9000", coa_nama: "Diskon Penjualan", debit: diskon }] : []),
        { coa_code: "4-1000", coa_nama: "Pendapatan Jasa Klinik", kredit: subtotal },
        ...(pajak > 0 ? [{ coa_code: "2-2100", coa_nama: "PPN Keluaran", kredit: pajak }] : []),
      ],
    });
    await sb.from("fin_invoice").update({ posted_journal_id: invEntry.id, posted_at: new Date().toISOString() }).eq("id", invoice.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: data.id ? "edit" : "create", entity: "invoice", entity_id: invoice.id, entity_no: invoice.no_invoice, after: invoice });
    return { invoice };
  });

export const voidInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; reason: string; kind?: "void" | "refunded" }) => ({
    id: z.string().uuid().parse(d.id),
    reason: z.string().min(3).parse(d.reason),
    kind: d.kind ?? "void",
  }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const { data: inv } = await sb.from("fin_invoice").select("*").eq("id", data.id).single();
    if (!inv) throw new Error("Invoice tidak ditemukan");
    // Void invoice + semua pembayaran terkait + nol-kan `dibayar` (advisory lock).
    const { error: ve } = await sb.rpc("fin_void_invoice_locked", {
      _invoice_id: data.id, _reason: data.reason, _kind: data.kind,
    });
    if (ve) throw new Error(ve.message);
    await reverseJournal("invoice", data.id, new Date().toISOString().slice(0, 10), data.reason);
    // Balikkan jurnal pembayaran juga
    const { data: pays } = await sb.from("fin_pembayaran").select("id").eq("invoice_id", data.id);
    for (const p of pays ?? []) {
      await reverseJournal("payment", p.id, new Date().toISOString().slice(0, 10), `Invoice ${data.kind}: ${data.reason}`);
    }
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "void", entity: "invoice", entity_id: data.id, entity_no: inv.no_invoice, reason: data.reason, before: inv });
    return { ok: true };
  });

// ---------- PAYMENT ----------
export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    let q = sb.from("fin_pembayaran").select("*, fin_invoice(no_invoice, patient_name, patient_code, total)").order("tanggal", { ascending: false }).limit(500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: {
    invoice_id: string;
    tanggal: string;
    metode: string;
    bank?: string;
    no_kartu_last4?: string;
    jumlah: number;
    mdr?: number;
    actor?: string;
  }) => ({
    ...d,
    invoice_id: z.string().uuid().parse(d.invoice_id),
    jumlah: z.number().positive().parse(d.jumlah),
  }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const { data: inv } = await sb.from("fin_invoice").select("*").eq("id", data.invoice_id).single();
    if (!inv) throw new Error("Invoice tidak ditemukan");

    // Auto-apply MDR rule when not explicitly provided
    let mdr = Number(data.mdr ?? 0);
    let mdrCoa = "6-3100";
    if (!data.mdr && data.metode !== "cash") {
      const { data: rules } = await sb.from("fin_mdr_rule").select("*").eq("is_active", true).eq("metode", data.metode);
      const rule = (rules ?? []).find((r: any) => !r.bank || r.bank === data.bank) ?? (rules ?? [])[0];
      if (rule) {
        mdr = Math.round((Number(data.jumlah) * Number(rule.rate_pct) / 100) + Number(rule.fixed_fee));
        mdrCoa = rule.coa_code || "6-3100";
      }
    }
    const netto = Number(data.jumlah) - mdr;
    // Atomic insert + invoice update under advisory lock (mencegah over-payment
    // saat dua kasir memproses invoice sama bersamaan).
    const { data: locked, error: le } = await sb.rpc("fin_create_payment_locked", {
      _invoice_id: data.invoice_id,
      _tanggal: data.tanggal,
      _metode: data.metode,
      _bank: data.bank ?? null,
      _no_kartu_last4: data.no_kartu_last4 ?? null,
      _jumlah: data.jumlah,
      _mdr: mdr,
    });
    if (le) throw new Error(le.message);
    const lockedRow = Array.isArray(locked) ? locked[0] : locked;
    const payId = (lockedRow as { id: string } | undefined)?.id;
    if (!payId) throw new Error("Gagal membuat pembayaran");
    const { data: pay, error } = await sb.from("fin_pembayaran").select("*").eq("id", payId).single();
    if (error || !pay) throw new Error(error?.message ?? "Gagal memuat pembayaran");

    const kasCoa = data.metode === "cash" ? "1-1000" : "1-1200";
    const payEntry = await postJournal({
      sumber: "payment",
      ref_id: pay.id,
      ref_no: `PAY-${inv.no_invoice}`,
      tanggal: data.tanggal,
      keterangan: `Pembayaran ${inv.no_invoice} via ${data.metode}`,
      created_by: data.actor,
      lines: [
        { coa_code: kasCoa, coa_nama: data.metode === "cash" ? "Kas" : "Bank", debit: netto },
        ...(mdr > 0 ? [{ coa_code: mdrCoa, coa_nama: "Beban MDR", debit: mdr }] : []),
        { coa_code: "1-1300", coa_nama: "Piutang Pasien", kredit: data.jumlah },
      ],
    });
    await sb.from("fin_pembayaran").update({ posted_journal_id: payEntry.id, posted_at: new Date().toISOString(), status: "posted" }).eq("id", pay.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "pay", entity: "payment", entity_id: pay.id, entity_no: `PAY-${inv.no_invoice}`, after: pay });
    return { payment: pay, mdr_applied: mdr };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; reason?: string; actor?: string }) => ({ id: z.string().uuid().parse(d.id), reason: d.reason, actor: d.actor }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const { data: pay } = await sb.from("fin_pembayaran").select("*").eq("id", data.id).single();
    if (!pay) throw new Error("Pembayaran tidak ditemukan");
    // Void + adjust invoice.dibayar/status atomically under advisory lock,
    // menghindari race dengan createPayment paralel.
    const { error: de } = await sb.rpc("fin_delete_payment_locked", {
      _payment_id: data.id, _reason: data.reason ?? "deleted",
    });
    if (de) throw new Error(de.message);
    await reverseJournal("payment", data.id, new Date().toISOString().slice(0, 10), data.reason ?? "Hapus pembayaran");
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "void", entity: "payment", entity_id: data.id, reason: data.reason, before: pay });
    return { ok: true };
  });

// ---------- EXPENSE / VOUCHER ----------
const expenseItemSchema = z.object({
  deskripsi: z.string().min(1),
  coa_code: z.string().optional(),
  qty: z.number(),
  harga: z.number(),
});

export const listExpenses = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string; q?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    let q = sb.from("fin_expense").select("*").order("tanggal", { ascending: false }).limit(500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.q) q = q.or(`no_voucher.ilike.%${data.q}%,vendor_nama.ilike.%${data.q}%,keterangan.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const getExpense = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const { data: hdr } = await sb.from("fin_expense").select("*").eq("id", data.id).single();
    const { data: items } = await sb.from("fin_expense_item").select("*").eq("expense_id", data.id);
    return { expense: hdr, items: items ?? [] };
  });

export const upsertExpense = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: {
    id?: string;
    tanggal: string;
    vendor_id?: string | null;
    vendor_nama?: string;
    coa_code?: string;
    cost_center_code?: string;
    keterangan?: string;
    metode: string;
    bank?: string;
    pajak_pct?: number;
    items: z.infer<typeof expenseItemSchema>[];
    actor?: string;
  }) => ({
    ...d,
    id: d.id ? z.string().uuid().parse(d.id) : undefined,
    items: z.array(expenseItemSchema).min(1).parse(d.items),
  }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const subtotal = data.items.reduce((a, it) => a + Number(it.qty) * Number(it.harga), 0);
    const pajak = Math.round(subtotal * Number(data.pajak_pct ?? 0) / 100);
    const total = subtotal + pajak;

    let hdr: any;
    if (data.id) {
      const { data: row, error } = await sb.from("fin_expense").update({
        tanggal: data.tanggal,
        vendor_id: data.vendor_id ?? null,
        vendor_nama: data.vendor_nama ?? null,
        coa_code: data.coa_code ?? null,
        cost_center_code: data.cost_center_code ?? null,
        keterangan: data.keterangan ?? null,
        subtotal, pajak, total,
        metode: data.metode,
        bank: data.bank ?? null,
      }).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      hdr = row;
      await sb.from("fin_expense_item").delete().eq("expense_id", data.id);
    } else {
      const no_voucher = await nextNo("VCH", "fin_expense", "no_voucher");
      const { data: row, error } = await sb.from("fin_expense").insert({
        no_voucher,
        tanggal: data.tanggal,
        vendor_id: data.vendor_id ?? null,
        vendor_nama: data.vendor_nama ?? null,
        coa_code: data.coa_code ?? null,
        cost_center_code: data.cost_center_code ?? null,
        keterangan: data.keterangan ?? null,
        subtotal, pajak, total,
        metode: data.metode,
        bank: data.bank ?? null,
        status: "draft",
        created_by: data.actor ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      hdr = row;
    }

    const itemsPayload = data.items.map((it) => ({
      expense_id: hdr.id,
      deskripsi: it.deskripsi,
      coa_code: it.coa_code ?? data.coa_code ?? null,
      qty: it.qty,
      harga: it.harga,
      subtotal: Number(it.qty) * Number(it.harga),
    }));
    const { error: ie } = await sb.from("fin_expense_item").insert(itemsPayload);
    if (ie) throw new Error(ie.message);

    if (data.id) await reverseJournal("expense", hdr.id, data.tanggal, "Edit voucher");
    const kasCoa = data.metode === "cash" ? "1-1000" : "1-1200";
    const expEntry = await postJournal({
      sumber: "expense",
      ref_id: hdr.id,
      ref_no: hdr.no_voucher,
      tanggal: data.tanggal,
      keterangan: `Voucher ${hdr.no_voucher} - ${data.vendor_nama ?? "-"}`,
      created_by: data.actor,
      lines: [
        ...itemsPayload.map((it) => ({
          coa_code: it.coa_code || "6-3000",
          coa_nama: "Beban",
          debit: Number(it.subtotal),
          keterangan: it.deskripsi,
        })),
        ...(pajak > 0 ? [{ coa_code: "1-1700", coa_nama: "PPN Masukan", debit: pajak }] : []),
        { coa_code: kasCoa, coa_nama: data.metode === "cash" ? "Kas" : "Bank", kredit: total },
      ],
    });
    await sb.from("fin_expense").update({ posted_journal_id: expEntry.id, posted_at: new Date().toISOString(), status: "posted" }).eq("id", hdr.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: data.id ? "edit" : "create", entity: "expense", entity_id: hdr.id, entity_no: hdr.no_voucher, after: hdr });
    return { expense: hdr };
  });

export const voidExpense = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; reason: string; actor?: string }) => ({
    id: z.string().uuid().parse(d.id),
    reason: z.string().min(3).parse(d.reason),
    actor: d.actor,
  }))
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    const { data: before } = await sb.from("fin_expense").select("*").eq("id", data.id).single();
    await sb.from("fin_expense").update({ status: "void", void_reason: data.reason }).eq("id", data.id);
    await reverseJournal("expense", data.id, new Date().toISOString().slice(0, 10), data.reason);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "void", entity: "expense", entity_id: data.id, entity_no: before?.no_voucher, reason: data.reason, before });
    return { ok: true };
  });

// ---------- JOURNAL ----------
export const listJournal = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const sb = await adminClient();
    let q = sb.from("fin_journal_entry").select("*, fin_journal_line(*)").order("tanggal", { ascending: false }).limit(500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// Master lookups used by forms
export const listLookups = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .handler(async () => {
    const sb = await adminClient();
    const [dokter, payer, vendor, layanan, coa] = await Promise.all([
      sb.from("fin_dokter").select("id, code, name").eq("is_active", true).order("name"),
      sb.from("fin_payer").select("id, code, name").order("name"),
      sb.from("fin_vendor").select("id, code, name").order("name"),
      sb.from("fin_layanan").select("id, code, name, tarif").eq("is_active", true).order("name"),
      sb.from("fin_coa").select("code, name, type").eq("is_active", true).order("code"),
    ]);
    return {
      dokter: dokter.data ?? [],
      payer: payer.data ?? [],
      vendor: vendor.data ?? [],
      layanan: layanan.data ?? [],
      coa: coa.data ?? [],
    };
  });

export const listTarifPajak = createServerFn({ method: "GET" })
  .middleware([requireFinView])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("fin_tarif_pajak")
      .select("id, code, name, jenis, tarif_pct, is_active")
      .eq("is_active", true).order("jenis").order("code");
    if (error) throw error;
    return data ?? [];
  });
