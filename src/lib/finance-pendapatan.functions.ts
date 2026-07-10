import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFinView, requireFinEdit } from "./finance-guard";
import { writeFinAudit } from "./finance-audit.helper";

const itemSchema = z.object({
  layanan_id: z.string().uuid().nullable().optional(),
  layanan_nama: z.string().min(1).max(200),
  tarif: z.number().nonnegative(),
  qty: z.number().int().min(1),
});

const paySchema = z.object({
  metode: z.enum(["cash", "transfer", "edc", "qris", "piutang"]),
  bank: z.string().max(50).optional().nullable(),
  no_kartu_last4: z.string().max(8).optional().nullable(),
  jumlah: z.number().nonnegative(),
  mdr: z.number().nonnegative().default(0),
});

const createSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  patient_code: z.string().min(1).max(50),
  patient_name: z.string().max(120).optional().nullable(),
  dokter_id: z.string().uuid().nullable().optional(),
  payer_id: z.string().uuid().nullable().optional(),
  kasir: z.string().max(120).optional().nullable(),
  catatan: z.string().max(500).optional().nullable(),
  pajak_persen: z.number().min(0).max(100).default(11),
  items: z.array(itemSchema).min(1).max(50),
  pembayaran: z.array(paySchema).min(1).max(10),
});

async function assertFinanceEditor(context: { supabase: any; userId: string }) {
  const { data: canEdit, error } = await context.supabase.rpc("fin_can_edit", { _uid: context.userId });
  if (error) throw error;
  if (!canEdit) throw new Error("Anda tidak berhak menjalankan aksi keuangan ini");
}

async function nextJournalNo(sb: any) {
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  const { data } = await sb
    .from("fin_journal_entry")
    .select("no_jurnal")
    .like("no_jurnal", `JV-${yyyymm}-%`)
    .order("no_jurnal", { ascending: false })
    .limit(1);
  const last = (data?.[0]?.no_jurnal as string | undefined) ?? "";
  const n = Number(last.split("-").pop() ?? "0") || 0;
  return `JV-${yyyymm}-${String(n + 1).padStart(4, "0")}`;
}

export type CreateInvoiceInput = z.input<typeof createSchema>;
export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInvoiceInput) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertFinanceEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const subtotal = data.items.reduce((a, i) => a + i.tarif * i.qty, 0);
    const pajak = Math.round((subtotal * data.pajak_persen) / 100);
    const total = subtotal + pajak;
    const totalBayar = data.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    const status = totalBayar >= total ? "paid" : totalBayar > 0 ? "partial" : "issued";
    const no = `INV-${data.tanggal.replaceAll("-", "")}-${Date.now().toString().slice(-5)}`;

    const { data: inv, error: e1 } = await supabaseAdmin
      .from("fin_invoice")
      .insert({
        no_invoice: no,
        tanggal: data.tanggal,
        patient_code: data.patient_code,
        patient_name: data.patient_name ?? null,
        dokter_id: data.dokter_id ?? null,
        payer_id: data.payer_id ?? null,
        kasir: data.kasir ?? null,
        catatan: data.catatan ?? null,
        subtotal, pajak, total,
        dibayar: totalBayar,
        status,
      })
      .select()
      .single();
    if (e1) throw new Error(e1.message);

    const items = data.items.map((i) => ({
      invoice_id: inv.id,
      layanan_id: i.layanan_id ?? null,
      layanan_nama: i.layanan_nama,
      tarif: i.tarif,
      qty: i.qty,
      subtotal: i.tarif * i.qty,
    }));
    const { error: e2 } = await supabaseAdmin.from("fin_invoice_item").insert(items);
    if (e2) throw new Error(e2.message);

    const pays = data.pembayaran.map((p) => ({
      invoice_id: inv.id,
      tanggal: data.tanggal,
      metode: p.metode,
      bank: p.bank ?? null,
      no_kartu_last4: p.no_kartu_last4 ?? null,
      jumlah: p.jumlah,
      mdr: p.mdr,
      netto: p.jumlah - p.mdr,
    }));
    const { error: e3 } = await supabaseAdmin.from("fin_pembayaran").insert(pays);
    if (e3) throw new Error(e3.message);

    // Post journal for invoice (Piutang / Pendapatan / PPN)
    try {
      const no_jurnal = await nextJournalNo(supabaseAdmin);
      const { data: entry, error: je } = await (supabaseAdmin as any)
        .from("fin_journal_entry")
        .insert({
          no_jurnal,
          tanggal: data.tanggal,
          sumber: "invoice",
          ref_id: inv.id,
          ref_no: no,
          keterangan: `Invoice ${no} - ${data.patient_name ?? data.patient_code}`,
          total,
          status: "posted",
        })
        .select()
        .single();
      if (je) throw je;
      const lines = [
        { entry_id: entry.id, coa_code: "1-1300", coa_nama: "Piutang Pasien", debit: total, kredit: 0 },
        { entry_id: entry.id, coa_code: "4-1000", coa_nama: "Pendapatan Jasa Klinik", debit: 0, kredit: subtotal },
        ...(pajak > 0 ? [{ entry_id: entry.id, coa_code: "2-2100", coa_nama: "PPN Keluaran", debit: 0, kredit: pajak }] : []),
      ];
      await (supabaseAdmin as any).from("fin_journal_line").insert(lines);
      await (supabaseAdmin as any).from("fin_invoice").update({ posted_journal_id: entry.id, posted_at: new Date().toISOString() }).eq("id", inv.id);
    } catch (err) {
      // Best-effort audit; journal failure surfaces on rekonsiliasi widget.
      await writeFinAudit({
        actor_id: context.userId,
        action: "post_failed",
        entity: "invoice",
        entity_id: inv.id,
        entity_no: no,
        reason: err instanceof Error ? err.message : "post_journal_failed",
      });
    }

    await writeFinAudit({
      actor_id: context.userId,
      action: "create",
      entity: "invoice",
      entity_id: inv.id,
      entity_no: no,
      after: { total, status, dibayar: totalBayar },
    });

    return { id: inv.id, no_invoice: no, total };
  });

const listSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dokter_id: z.string().uuid().optional(),
  payer_id: z.string().uuid().optional(),
});

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("fin_invoice")
      .select("*, fin_dokter(name), fin_payer(name), fin_pembayaran(*), fin_invoice_item(*)")
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.dokter_id) q = q.eq("dokter_id", data.dokter_id);
    if (data.payer_id) q = q.eq("payer_id", data.payer_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// Void invoice (reversal via status change + journal reversal). Hard delete is
// forbidden — use voidInvoice from finance-tx for full reversal.
export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason?: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().min(3).max(500).default("Dihapus dari pendapatan") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertFinanceEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await (supabaseAdmin as any).from("fin_invoice").select("*").eq("id", data.id).single();
    if (!inv) throw new Error("Invoice tidak ditemukan");

    // Reverse posted journal entries — invoice piutang/pendapatan AND all
    // pembayaran postings so buku besar tetap balanced saat invoice divoid.
    const { data: payRows } = await (supabaseAdmin as any)
      .from("fin_pembayaran")
      .select("id, status")
      .eq("invoice_id", data.id);
    const payIds = (payRows ?? []).map((p: any) => p.id);
    const entryQuery = (supabaseAdmin as any)
      .from("fin_journal_entry")
      .select("id, no_jurnal, tanggal, keterangan, sumber, ref_id")
      .eq("status", "posted");
    const orFilter = payIds.length
      ? `and(sumber.eq.invoice,ref_id.eq.${data.id}),and(sumber.eq.pembayaran,ref_id.in.(${payIds.join(",")}))`
      : `and(sumber.eq.invoice,ref_id.eq.${data.id})`;
    const { data: entries } = await entryQuery.or(orFilter);
    for (const e of entries ?? []) {
      const { data: lines } = await (supabaseAdmin as any).from("fin_journal_line").select("*").eq("entry_id", e.id);
      const no_jurnal = await nextJournalNo(supabaseAdmin);
      const rev = (lines ?? []).map((l: any) => ({
        coa_code: l.coa_code,
        coa_nama: l.coa_nama,
        debit: Number(l.kredit),
        kredit: Number(l.debit),
        keterangan: `Reversal: ${data.reason}`,
      }));
      const total = rev.reduce((a: number, l: any) => a + Number(l.debit ?? 0), 0);
      const { data: revEntry } = await (supabaseAdmin as any)
        .from("fin_journal_entry")
        .insert({
          no_jurnal,
          tanggal: new Date().toISOString().slice(0, 10),
          sumber: e.sumber,
          ref_id: e.ref_id,
          ref_no: `REV-${e.no_jurnal}`,
          keterangan: `Reversal: ${data.reason}`,
          total,
          status: "posted",
        })
        .select()
        .single();
      if (revEntry) {
        await (supabaseAdmin as any)
          .from("fin_journal_line")
          .insert(rev.map((r: any) => ({ ...r, entry_id: revEntry.id })));
      }
      await (supabaseAdmin as any).from("fin_journal_entry").update({ status: "reversed" }).eq("id", e.id);
    }

    // Mark all payments void so rekonsiliasi tidak menghitung mereka lagi.
    if (payIds.length) {
      await (supabaseAdmin as any)
        .from("fin_pembayaran")
        .update({ status: "void", void_reason: `Invoice void: ${data.reason}` })
        .in("id", payIds);
    }

    await (supabaseAdmin as any)
      .from("fin_invoice")
      .update({ status: "void", void_reason: data.reason, dibayar: 0 })
      .eq("id", data.id);


    await writeFinAudit({
      actor_id: context.userId,
      action: "void",
      entity: "invoice",
      entity_id: data.id,
      entity_no: inv.no_invoice,
      reason: data.reason,
      before: inv,
    });

    return { ok: true };
  });
