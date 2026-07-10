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

// Reusable primitive types
const nonEmpty = z.string().trim().min(1).max(200);
const optStr = z.string().trim().max(500).nullable().optional();
const num = z.coerce.number().finite();
const numNN = num.refine((n: number) => n >= 0, "harus ≥ 0");
const pct = num.refine((n: number) => n >= 0 && n <= 100, "0–100");
const bool = z.coerce.boolean().optional();
const uuid = z.string().uuid();

// Per-table shape validators; unknown keys are stripped by pickAllowed first.
const ROW_SCHEMAS: Record<FinTable, z.ZodTypeAny> = {
  fin_coa: z.object({ code: nonEmpty, name: nonEmpty, type: z.enum(["Asset","Liability","Equity","Revenue","Expense"]).optional(), parent_code: optStr, cash_flow_section: optStr, is_active: bool, note: optStr }).partial({ type: true }),
  fin_cost_center: z.object({ code: nonEmpty, name: nonEmpty, description: optStr, is_active: bool }),
  fin_dokter: z.object({ code: nonEmpty, name: nonEmpty, spesialisasi: optStr, default_fee_pct: pct.optional(), schedule_note: optStr, is_active: bool, user_id: uuid.nullable().optional() }),
  fin_karyawan: z.object({ code: nonEmpty, name: nonEmpty, jabatan: optStr, departemen: optStr, gaji_pokok: numNN.optional(), is_active: bool }),
  fin_payer: z.object({ code: nonEmpty, name: nonEmpty, type: optStr, contact: optStr, npwp: optStr, is_active: bool }),
  fin_vendor: z.object({ code: nonEmpty, name: nonEmpty, npwp: optStr, contact: optStr, alamat: optStr, is_active: bool }),
  fin_kategori_layanan: z.object({ code: nonEmpty, name: nonEmpty, coa_pendapatan: optStr, is_active: bool }),
  fin_layanan: z.object({ code: nonEmpty, name: nonEmpty, kategori_id: uuid.nullable().optional(), harga: numNN, coa_pendapatan: optStr, is_active: bool }),
  fin_tarif_pajak: z.object({ code: nonEmpty, name: nonEmpty, rate: pct, coa_hutang: optStr, is_active: bool, note: optStr }),
  fin_profil_klinik: z.object({ nama: nonEmpty, alamat: optStr, telepon: optStr, email: optStr, npwp: optStr, logo_url: optStr, kop_surat: optStr, tagline: optStr }),
  fin_persediaan: z.object({ kode: nonEmpty, nama: nonEmpty, kategori: optStr, satuan: optStr, harga_beli: numNN.optional(), harga_jual: numNN.optional(), min_stok: numNN.optional(), is_active: bool }),
  fin_persediaan_mutasi: z.object({ persediaan_id: uuid, tanggal: z.string(), tipe: z.enum(["masuk","keluar","penyesuaian"]), qty: num, harga: numNN.optional(), ref_no: optStr, keterangan: optStr }),
  fin_aset: z.object({ kode: nonEmpty, nama: nonEmpty, kategori: optStr, tanggal_perolehan: z.string().optional(), harga_perolehan: numNN.optional(), umur_ekonomis_bulan: numNN.optional(), metode_penyusutan: optStr, nilai_residu: numNN.optional(), lokasi: optStr, is_active: bool, note: optStr }),
  fin_aset_penyusutan: z.object({ aset_id: uuid, periode: z.string(), beban_bulan: numNN, akumulasi: numNN, nilai_buku: num }),
  fin_kas_kecil: z.object({ tanggal: z.string(), no_voucher: optStr, tipe: z.enum(["masuk","keluar"]), amount: numNN, coa_lawan: optStr, penerima: optStr, keterangan: optStr, status: optStr }),
  fin_bukti_setor: z.object({ tanggal: z.string(), no_setor: optStr, amount: numNN, bank_coa: optStr, kas_coa: optStr, ref_bank: optStr, keterangan: optStr, status: optStr }),
  fin_surat_tagih: z.object({ tanggal: z.string(), no_surat: optStr, invoice_id: uuid.nullable().optional(), payer_id: uuid.nullable().optional(), patient_code: optStr, patient_name: optStr, jumlah: numNN, jatuh_tempo: z.string().optional(), status: optStr, keterangan: optStr }),
  fin_rab: z.object({ tahun: num, kategori: optStr, coa_code: optStr, cost_center_code: optStr, bulan: num.optional(), anggaran: numNN, note: optStr }),
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
    const filtered = pickAllowed(data.table, data.row);
    if (Object.keys(filtered).length === 0) {
      throw new Error("Tidak ada kolom valid untuk disimpan");
    }
    // Strict per-table validation. Partial() on update so users can patch only
    // the fields they touched without re-supplying required columns.
    const schema = data.id ? (ROW_SCHEMAS[data.table] as any).partial() : ROW_SCHEMAS[data.table];
    const parsed = schema.safeParse(filtered);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i: any) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ");
      throw new Error(`Validasi gagal — ${msg}`);
    }
    const payload = parsed.data as Record<string, unknown>;
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
