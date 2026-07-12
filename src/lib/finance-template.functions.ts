import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { writeFinAudit } from "./finance-audit.helper";
import { requireFinView, requireFinEdit } from "./finance-guard";

// ============ TEMPLATE INVOICE ============
const invItemSchema = z.object({
  layanan_id: z.string().uuid().nullable().optional(),
  layanan_nama: z.string().min(1),
  tarif: z.number(),
  qty: z.number().int().min(1).default(1),
});

export const listTplInvoice = createServerFn({ method: "POST" }).middleware([requireFinView]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const s = supabaseAdmin as any;
  const { data: rows } = await s.from("fin_template_invoice").select("*").order("nama");
  const { data: items } = await s.from("fin_template_invoice_item").select("*");
  return { rows: rows ?? [], items: items ?? [] };
});

export const upsertTplInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: {
    id?: string;
    nama: string;
    payer_id?: string | null;
    kategori?: string | null;
    pajak_pct?: number;
    diskon?: number;
    catatan?: string | null;
    is_active?: boolean;
    items: z.infer<typeof invItemSchema>[];
    actor?: string;
  }) => ({ ...d, items: z.array(invItemSchema).parse(d.items ?? []) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    let row: any;
    if (data.id) {
      const before = (await s.from("fin_template_invoice").select("*").eq("id", data.id).single()).data;
      const { data: r, error } = await s.from("fin_template_invoice").update({
        nama: data.nama, payer_id: data.payer_id ?? null, kategori: data.kategori ?? null,
        pajak_pct: data.pajak_pct ?? 0, diskon: data.diskon ?? 0,
        catatan: data.catatan ?? null, is_active: data.is_active ?? true,
      }).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      row = r;
      await s.from("fin_template_invoice_item").delete().eq("template_id", data.id);
      await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "edit", entity: "template_invoice", entity_id: row.id, entity_no: row.nama, before, after: row });
    } else {
      const { data: r, error } = await s.from("fin_template_invoice").insert({
        nama: data.nama, payer_id: data.payer_id ?? null, kategori: data.kategori ?? null,
        pajak_pct: data.pajak_pct ?? 0, diskon: data.diskon ?? 0,
        catatan: data.catatan ?? null, is_active: data.is_active ?? true,
      }).select().single();
      if (error) throw new Error(error.message);
      row = r;
      await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "create", entity: "template_invoice", entity_id: row.id, entity_no: row.nama, after: row });
    }
    if (data.items.length) {
      const payload = data.items.map((it) => ({ template_id: row.id, ...it }));
      await s.from("fin_template_invoice_item").insert(payload);
    }
    return { row };
  });

export const deleteTplInvoice = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; actor?: string }) => ({ id: z.string().uuid().parse(d.id), actor: d.actor }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    const before = (await s.from("fin_template_invoice").select("*").eq("id", data.id).single()).data;
    await s.from("fin_template_invoice").delete().eq("id", data.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "delete", entity: "template_invoice", entity_id: data.id, entity_no: before?.nama, before });
    return { ok: true };
  });

// ============ TEMPLATE VOUCHER ============
const vchItemSchema = z.object({
  deskripsi: z.string().min(1),
  coa_code: z.string().nullable().optional(),
  qty: z.number().default(1),
  harga: z.number().default(0),
});

export const listTplVoucher = createServerFn({ method: "POST" }).middleware([requireFinView]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const s = supabaseAdmin as any;
  const { data: rows } = await s.from("fin_template_voucher").select("*").order("nama");
  const { data: items } = await s.from("fin_template_voucher_item").select("*");
  return { rows: rows ?? [], items: items ?? [] };
});

export const upsertTplVoucher = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: {
    id?: string;
    nama: string;
    vendor_id?: string | null;
    coa_code?: string | null;
    cost_center_code?: string | null;
    metode?: string;
    pajak_pct?: number;
    keterangan?: string | null;
    is_active?: boolean;
    items: z.infer<typeof vchItemSchema>[];
    actor?: string;
  }) => ({ ...d, items: z.array(vchItemSchema).parse(d.items ?? []) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    let row: any;
    if (data.id) {
      const before = (await s.from("fin_template_voucher").select("*").eq("id", data.id).single()).data;
      const { data: r, error } = await s.from("fin_template_voucher").update({
        nama: data.nama, vendor_id: data.vendor_id ?? null, coa_code: data.coa_code ?? null,
        cost_center_code: data.cost_center_code ?? null, metode: data.metode ?? "transfer",
        pajak_pct: data.pajak_pct ?? 0, keterangan: data.keterangan ?? null, is_active: data.is_active ?? true,
      }).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      row = r;
      await s.from("fin_template_voucher_item").delete().eq("template_id", data.id);
      await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "edit", entity: "template_voucher", entity_id: row.id, entity_no: row.nama, before, after: row });
    } else {
      const { data: r, error } = await s.from("fin_template_voucher").insert({
        nama: data.nama, vendor_id: data.vendor_id ?? null, coa_code: data.coa_code ?? null,
        cost_center_code: data.cost_center_code ?? null, metode: data.metode ?? "transfer",
        pajak_pct: data.pajak_pct ?? 0, keterangan: data.keterangan ?? null, is_active: data.is_active ?? true,
      }).select().single();
      if (error) throw new Error(error.message);
      row = r;
      await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "create", entity: "template_voucher", entity_id: row.id, entity_no: row.nama, after: row });
    }
    if (data.items.length) {
      const payload = data.items.map((it) => ({ template_id: row.id, ...it }));
      await s.from("fin_template_voucher_item").insert(payload);
    }
    return { row };
  });

export const deleteTplVoucher = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; actor?: string }) => ({ id: z.string().uuid().parse(d.id), actor: d.actor }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    const before = (await s.from("fin_template_voucher").select("*").eq("id", data.id).single()).data;
    await s.from("fin_template_voucher").delete().eq("id", data.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "delete", entity: "template_voucher", entity_id: data.id, entity_no: before?.nama, before });
    return { ok: true };
  });

// ============ MDR RULE ============
export const listMdrRule = createServerFn({ method: "POST" }).middleware([requireFinView]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const s = supabaseAdmin as any;
  const { data } = await s.from("fin_mdr_rule").select("*").order("metode").order("bank");
  return { rows: data ?? [] };
});

export const upsertMdrRule = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: {
    id?: string; metode: string; bank?: string | null; rate_pct: number;
    fixed_fee?: number; coa_code?: string; is_active?: boolean; actor?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    const payload = {
      metode: data.metode, bank: data.bank ?? null,
      rate_pct: Number(data.rate_pct) || 0, fixed_fee: Number(data.fixed_fee) || 0,
      coa_code: data.coa_code ?? "5900", is_active: data.is_active ?? true,
    };
    let row: any;
    if (data.id) {
      const before = (await s.from("fin_mdr_rule").select("*").eq("id", data.id).single()).data;
      const { data: r, error } = await s.from("fin_mdr_rule").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      row = r;
      await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "edit", entity: "mdr_rule", entity_id: row.id, before, after: row });
    } else {
      const { data: r, error } = await s.from("fin_mdr_rule").insert(payload).select().single();
      if (error) throw new Error(error.message);
      row = r;
      await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "create", entity: "mdr_rule", entity_id: row.id, after: row });
    }
    return { row };
  });

export const deleteMdrRule = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { id: string; actor?: string }) => ({ id: z.string().uuid().parse(d.id), actor: d.actor }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const s = supabaseAdmin as any;
    await s.from("fin_mdr_rule").delete().eq("id", data.id);
    await writeFinAudit({ actor_id: context.userId, actor_email: (context.claims as { email?: string } | null)?.email ?? null, action: "delete", entity: "mdr_rule", entity_id: data.id });
    return { ok: true };
  });
