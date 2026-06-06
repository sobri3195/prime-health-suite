import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export const createInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const subtotal = data.items.reduce((a, i) => a + i.tarif * i.qty, 0);
    const pajak = Math.round((subtotal * data.pajak_persen) / 100);
    const total = subtotal + pajak;
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
        status: "paid",
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

    return { id: inv.id, no_invoice: no, total };
  });

const listSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dokter_id: z.string().uuid().optional(),
  payer_id: z.string().uuid().optional(),
});

export const listInvoices = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("fin_invoice")
      .select("*, fin_dokter(nama), fin_payer(nama), fin_pembayaran(*), fin_invoice_item(*)")
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

export const deleteInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("fin_invoice").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
