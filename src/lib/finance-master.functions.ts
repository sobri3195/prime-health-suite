import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFinView, requireFinEdit } from "./finance-guard";

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
  .middleware([requireFinView])
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

// Per-table allowlist of writable columns. Anything not listed is stripped
// before insert/update to prevent clients writing sensitive/system columns
// (e.g. user_id, created_by, posted_journal_id, saldo, stok komputasi, dsb).
const ALLOWED_COLS: Record<FinTable, readonly string[]> = {
  fin_coa: ["code", "name", "type", "parent_code", "cash_flow_section", "is_active", "note"],
  fin_cost_center: ["code", "name", "description", "is_active"],
  fin_dokter: ["code", "name", "spesialisasi", "default_fee_pct", "schedule_note", "is_active", "user_id"],
  fin_karyawan: ["code", "name", "jabatan", "departemen", "gaji_pokok", "is_active"],
  fin_payer: ["code", "name", "type", "contact", "npwp", "is_active"],
  fin_vendor: ["code", "name", "npwp", "contact", "alamat", "is_active"],
  fin_kategori_layanan: ["code", "name", "coa_pendapatan", "is_active"],
  fin_layanan: ["code", "name", "kategori_id", "harga", "coa_pendapatan", "is_active"],
  fin_tarif_pajak: ["code", "name", "rate", "coa_hutang", "is_active", "note"],
  fin_profil_klinik: ["nama", "alamat", "telepon", "email", "npwp", "logo_url", "kop_surat", "tagline"],
  fin_persediaan: ["kode", "nama", "kategori", "satuan", "harga_beli", "harga_jual", "min_stok", "is_active"],
  fin_persediaan_mutasi: ["persediaan_id", "tanggal", "tipe", "qty", "harga", "ref_no", "keterangan"],
  fin_aset: ["kode", "nama", "kategori", "tanggal_perolehan", "harga_perolehan", "umur_ekonomis_bulan", "metode_penyusutan", "nilai_residu", "lokasi", "is_active", "note"],
  fin_aset_penyusutan: ["aset_id", "periode", "beban_bulan", "akumulasi", "nilai_buku"],
  fin_kas_kecil: ["tanggal", "no_voucher", "tipe", "amount", "coa_lawan", "penerima", "keterangan", "status"],
  fin_bukti_setor: ["tanggal", "no_setor", "amount", "bank_coa", "kas_coa", "ref_bank", "keterangan", "status"],
  fin_surat_tagih: ["tanggal", "no_surat", "invoice_id", "payer_id", "patient_code", "patient_name", "jumlah", "jatuh_tempo", "status", "keterangan"],
  fin_rab: ["tahun", "kategori", "coa_code", "cost_center_code", "bulan", "anggaran", "note"],
};

function pickAllowed(table: FinTable, row: Record<string, unknown>) {
  const cols = new Set(ALLOWED_COLS[table] ?? []);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (cols.has(k)) out[k] = v;
  }
  return out;
}

export const upsertFinMaster = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { table: FinTable; row: Record<string, unknown>; id?: string }) => ({
    table: tableSchema.parse(d.table),
    row: z.record(z.string(), z.any()).parse(d.row),
    id: d.id ? z.string().uuid().parse(d.id) : undefined,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = pickAllowed(data.table, data.row);
    if (Object.keys(payload).length === 0) {
      throw new Error("Tidak ada kolom valid untuk disimpan");
    }
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
  .middleware([requireFinEdit])
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
