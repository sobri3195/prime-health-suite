import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = [
  "fin_coa",
  "fin_cost_center",
  "fin_dokter",
  "fin_karyawan",
  "fin_payer",
  "fin_vendor",
  "fin_kategori_layanan",
  "fin_layanan",
  "fin_tarif_pajak",
  "fin_profil_klinik",
  "fin_persediaan",
  "fin_persediaan_mutasi",
  "fin_aset",
  "fin_aset_penyusutan",
  "fin_kas_kecil",
  "fin_bukti_setor",
  "fin_surat_tagih",
  "fin_rab",
] as const;
export type FinTable = (typeof TABLES)[number];

const tableSchema = z.enum(TABLES);

export const listFinMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: FinTable }) => ({ table: tableSchema.parse(d.table) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from(data.table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const upsertFinMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: FinTable; row: Record<string, unknown>; id?: string }) => ({
    table: tableSchema.parse(d.table),
    row: z.record(z.string(), z.any()).parse(d.row),
    id: d.id ? z.string().uuid().parse(d.id) : undefined,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // strip system fields
    const { id: _i, created_at: _c, updated_at: _u, ...payload } = data.row as Record<string, unknown>;
    const tbl = supabaseAdmin.from(data.table) as any;
    if (data.id) {
      const { data: row, error } = await tbl.update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return { row };
    }
    const { data: row, error } = await tbl.insert(payload).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteFinMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: FinTable; id: string }) => ({
    table: tableSchema.parse(d.table),
    id: z.string().uuid().parse(d.id),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
