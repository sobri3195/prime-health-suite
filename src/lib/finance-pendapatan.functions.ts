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

export type CreateInvoiceInput = z.input<typeof createSchema>;
export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: CreateInvoiceInput) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const subtotal = data.items.reduce((a, i) => a + i.tarif * i.qty, 0);
    const pajak = Math.round((subtotal * data.pajak_persen) / 100);
    const total = subtotal + pajak;
    const totalBayar = data.pembayaran.reduce((a, p) => a + p.jumlah, 0);
    const status = totalBayar >= total ? "paid" : totalBayar > 0 ? "partial" : "issued";

    // Atomic per-month sequence — mencegah collision saat dua kasir input bersamaan.
    const yyyymm = data.tanggal.slice(0, 7).replace("-", "");
    const { data: noInv, error: noErr } = await sb.rpc("fin_next_doc_no", {
      _prefix: "INV", _yyyymm: yyyymm,
    });
    if (noErr) throw new Error(noErr.message);
    const no = String(noInv);

    // Actor label bersumber dari sesi terverifikasi (tidak boleh spoof dari client).
    const actorEmail = (context.claims as { email?: string } | null)?.email ?? null;
    const actorLabel = actorEmail ?? context.userId ?? null;

    const { data: inv, error: e1 } = await sb
      .from("fin_invoice")
      .insert({
        no_invoice: no,
        tanggal: data.tanggal,
        patient_code: data.patient_code,
        patient_name: data.patient_name ?? null,
        dokter_id: data.dokter_id ?? null,
        payer_id: data.payer_id ?? null,
        kasir: data.kasir ?? actorLabel,
        catatan: data.catatan ?? null,
        subtotal, pajak, total,
        dibayar: totalBayar,
        status,
        created_by: actorLabel,
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
    const { error: e2 } = await sb.from("fin_invoice_item").insert(items);
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
      created_by: actorLabel,
    }));
    const { error: e3 } = await sb.from("fin_pembayaran").insert(pays);
    if (e3) throw new Error(e3.message);

    // Post jurnal invoice via SECURITY DEFINER RPC — atomic (entry+lines) + no race pada no_jurnal.
    const invoiceLines: Array<{ coa_code: string; debit?: number; kredit?: number; keterangan?: string }> = [
      { coa_code: "1-1300", debit: total, keterangan: `Piutang ${no}` },
      { coa_code: "4-1000", kredit: subtotal, keterangan: `Pendapatan ${no}` },
    ];
    if (pajak > 0) invoiceLines.push({ coa_code: "2-2100", kredit: pajak, keterangan: `PPN ${no}` });

    const { data: entryId, error: je } = await sb.rpc("fin_post_journal", {
      _tanggal: data.tanggal,
      _sumber: "invoice",
      _ref_id: inv.id,
      _ref_no: no,
      _keterangan: `Invoice ${no} - ${data.patient_name ?? data.patient_code}`,
      _lines: invoiceLines,
    });
    if (je) {
      await writeFinAudit({
        actor_id: context.userId, actor_email: actorEmail,
        action: "post_failed", entity: "invoice", entity_id: inv.id, entity_no: no,
        reason: je.message,
      });
    } else if (entryId) {
      await sb.from("fin_invoice").update({ posted_journal_id: entryId, posted_at: new Date().toISOString() }).eq("id", inv.id);
    }

    await writeFinAudit({
      actor_id: context.userId,
      actor_email: actorEmail,
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
  .middleware([requireFinView])
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

// Void invoice via RPC atomic (lock + reverse jurnal + void payments). Hard delete dilarang.
export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; reason?: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().min(3).max(500).default("Dihapus dari pendapatan") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data: inv } = await sb.from("fin_invoice").select("*").eq("id", data.id).single();
    if (!inv) throw new Error("Invoice tidak ditemukan");

    const email = (context.claims as { email?: string } | null)?.email ?? null;
    const { error: ve } = await sb.rpc("fin_void_invoice_atomic", {
      _invoice_id: data.id,
      _reason: data.reason,
      _kind: "void",
      _actor_id: context.userId,
      _actor_email: email,
    });
    if (ve) throw new Error(ve.message);

    await writeFinAudit({
      actor_id: context.userId,
      actor_email: email,
      action: "void",
      entity: "invoice",
      entity_id: data.id,
      entity_no: inv.no_invoice,
      reason: data.reason,
      before: inv,
    });

    return { ok: true };
  });
