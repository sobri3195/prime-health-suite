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
  fin_coa: ["code", "name", "type", "parent_code", "cash_flow_section", "is_active"],
  fin_cost_center: ["code", "name", "pic", "is_active"],
  fin_dokter: ["code", "name", "spesialisasi", "default_fee_pct", "npwp", "phone", "sip_number", "schedule_note", "is_ptkp_k0", "is_active"],
  fin_karyawan: ["code", "name", "jabatan", "gaji_pokok", "npwp", "is_active"],
  fin_payer: ["code", "name", "tipe", "term_hari", "is_active"],
  fin_vendor: ["code", "name", "kategori", "npwp", "term_hari", "is_active"],
  fin_kategori_layanan: ["code", "name", "is_active"],
  fin_layanan: ["code", "name", "kategori_code", "tarif", "is_kena_pajak", "is_active"],
  fin_tarif_pajak: ["code", "name", "jenis", "tarif_pct", "is_active"],
  fin_profil_klinik: ["nama", "alamat", "kota", "telp", "email", "npwp", "logo_url"],
  fin_persediaan: ["kode", "nama", "kategori", "satuan", "harga_beli", "harga_jual", "min_stok", "coa_persediaan", "is_active"],
  fin_persediaan_mutasi: ["persediaan_id", "tanggal", "tipe", "qty", "harga", "ref_no", "keterangan"],
  fin_aset: ["kode", "nama", "kategori", "cost_center_code", "tanggal_perolehan", "harga_perolehan", "nilai_residu", "umur_bulan", "metode", "akumulasi_penyusutan", "nilai_buku", "status", "coa_aset", "coa_akm_penyusutan", "coa_beban_penyusutan"],
  fin_aset_penyusutan: ["aset_id", "periode", "tanggal", "beban", "akumulasi", "nilai_buku", "posted"],
  fin_kas_kecil: ["tanggal", "no_voucher", "tipe", "amount", "coa_lawan", "penerima", "keterangan", "status"],
  fin_bukti_setor: ["tanggal", "no_setor", "amount", "bank_coa", "kas_coa", "ref_bank", "keterangan", "status"],
  fin_surat_tagih: ["no_surat", "tanggal", "payer_id", "payer_nama", "periode_dari", "periode_sampai", "invoice_ids", "total", "catatan", "status"],
  fin_rab: ["periode", "coa_code", "coa_nama", "cost_center_code", "anggaran", "catatan"],
};

// Reusable primitive types
const nonEmpty = z.string().trim().min(1).max(200);
const optStr = z.string().trim().max(500).nullable().optional();
const num = z.coerce.number().finite();
const numNN = num.refine((n: number) => n >= 0, "harus ≥ 0");
const pct = num.refine((n: number) => n >= 0 && n <= 100, "0–100");
const bool = z.coerce.boolean().optional();
const uuid = z.string().uuid();
const jsonish = z.unknown().nullable().optional();

// Per-table shape validators; unknown keys are stripped by pickAllowed first.
const ROW_SCHEMAS: Record<FinTable, z.ZodTypeAny> = {
  fin_coa: z.object({ code: nonEmpty, name: nonEmpty, type: z.enum(["Asset", "Liability", "Equity", "Revenue", "Expense"]), parent_code: optStr, cash_flow_section: optStr, is_active: bool }),
  fin_cost_center: z.object({ code: nonEmpty, name: nonEmpty, pic: optStr, is_active: bool }),
  fin_dokter: z.object({ code: nonEmpty, name: nonEmpty, spesialisasi: optStr, default_fee_pct: pct.optional(), npwp: optStr, phone: optStr, sip_number: optStr, schedule_note: optStr, is_ptkp_k0: bool, is_active: bool }),
  fin_karyawan: z.object({ code: nonEmpty, name: nonEmpty, jabatan: optStr, gaji_pokok: numNN.optional(), npwp: optStr, is_active: bool }),
  fin_payer: z.object({ code: nonEmpty, name: nonEmpty, tipe: nonEmpty, term_hari: numNN.optional(), is_active: bool }),
  fin_vendor: z.object({ code: nonEmpty, name: nonEmpty, kategori: optStr, npwp: optStr, term_hari: numNN.optional(), is_active: bool }),
  fin_kategori_layanan: z.object({ code: nonEmpty, name: nonEmpty, is_active: bool }),
  fin_layanan: z.object({ code: nonEmpty, name: nonEmpty, kategori_code: optStr, tarif: numNN, is_kena_pajak: bool, is_active: bool }),
  fin_tarif_pajak: z.object({ code: nonEmpty, name: nonEmpty, jenis: nonEmpty, tarif_pct: pct, is_active: bool }),
  fin_profil_klinik: z.object({ nama: nonEmpty, alamat: optStr, kota: optStr, telp: optStr, email: optStr, npwp: optStr, logo_url: optStr }),
  fin_persediaan: z.object({ kode: nonEmpty, nama: nonEmpty, kategori: optStr, satuan: optStr, harga_beli: numNN.optional(), harga_jual: numNN.optional(), min_stok: numNN.optional(), coa_persediaan: optStr, is_active: bool }),
  fin_persediaan_mutasi: z.object({ persediaan_id: uuid, tanggal: z.string(), tipe: z.enum(["masuk","keluar","penyesuaian"]), qty: num, harga: numNN.optional(), ref_no: optStr, keterangan: optStr }),
  fin_aset: z.object({ kode: nonEmpty, nama: nonEmpty, kategori: optStr, cost_center_code: optStr, tanggal_perolehan: z.string().optional(), harga_perolehan: numNN.optional(), nilai_residu: numNN.optional(), umur_bulan: numNN.optional(), metode: optStr, akumulasi_penyusutan: numNN.optional(), nilai_buku: num.optional(), status: optStr, coa_aset: optStr, coa_akm_penyusutan: optStr, coa_beban_penyusutan: optStr }),
  fin_aset_penyusutan: z.object({ aset_id: uuid, periode: z.string(), tanggal: z.string().optional(), beban: numNN, akumulasi: numNN, nilai_buku: num, posted: bool }),
  fin_kas_kecil: z.object({ tanggal: z.string(), no_voucher: optStr, tipe: z.enum(["masuk","keluar"]), amount: numNN, coa_lawan: optStr, penerima: optStr, keterangan: optStr, status: optStr }),
  fin_bukti_setor: z.object({ tanggal: z.string(), no_setor: optStr, amount: numNN, bank_coa: optStr, kas_coa: optStr, ref_bank: optStr, keterangan: optStr, status: optStr }),
  fin_surat_tagih: z.object({ no_surat: nonEmpty, tanggal: z.string().optional(), payer_id: uuid.nullable().optional(), payer_nama: optStr, periode_dari: z.string().nullable().optional(), periode_sampai: z.string().nullable().optional(), invoice_ids: jsonish, total: numNN.optional(), catatan: optStr, status: optStr }),
  fin_rab: z.object({ periode: nonEmpty, coa_code: nonEmpty, coa_nama: optStr, cost_center_code: optStr, anggaran: numNN, catatan: optStr }),
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

// Cross-table FK checks (Batch 4.4). Only common CSV mistakes.
const FK_CHECKS: Partial<Record<FinTable, { col: string; refTable: FinTable; refCol: string }[]>> = {
  fin_coa: [{ col: "parent_code", refTable: "fin_coa", refCol: "code" }],
  fin_layanan: [{ col: "kategori_code", refTable: "fin_kategori_layanan", refCol: "code" }],
  fin_persediaan: [{ col: "coa_persediaan", refTable: "fin_coa", refCol: "code" }],
  fin_aset: [
    { col: "cost_center_code", refTable: "fin_cost_center", refCol: "code" },
    { col: "coa_aset", refTable: "fin_coa", refCol: "code" },
    { col: "coa_akm_penyusutan", refTable: "fin_coa", refCol: "code" },
    { col: "coa_beban_penyusutan", refTable: "fin_coa", refCol: "code" },
  ],
  fin_kas_kecil: [{ col: "coa_lawan", refTable: "fin_coa", refCol: "code" }],
  fin_bukti_setor: [
    { col: "bank_coa", refTable: "fin_coa", refCol: "code" },
    { col: "kas_coa", refTable: "fin_coa", refCol: "code" },
  ],
  fin_rab: [
    { col: "coa_code", refTable: "fin_coa", refCol: "code" },
    { col: "cost_center_code", refTable: "fin_cost_center", refCol: "code" },
  ],
};

// Bulk CSV import: validate every row + FK, then insert in one round-trip.
export const bulkImportFinMaster = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { table: FinTable; rows: Record<string, unknown>[] }) => ({
    table: tableSchema.parse(d.table),
    rows: z.array(z.record(z.string(), z.any())).max(2000).parse(d.rows),
  }))
  .handler(async ({ data }) => {
    const schema = ROW_SCHEMAS[data.table];
    const valid: { row: Record<string, unknown>; idx: number }[] = [];
    const errors: { row: number; message: string }[] = [];
    data.rows.forEach((raw, idx) => {
      const filtered = pickAllowed(data.table, raw);
      if (Object.keys(filtered).length === 0) {
        errors.push({ row: idx + 1, message: "tidak ada kolom valid" });
        return;
      }
      const parsed = schema.safeParse(filtered);
      if (!parsed.success) {
        errors.push({
          row: idx + 1,
          message: parsed.error.issues.map((i: any) => `${i.path.join(".") || "row"}: ${i.message}`).join("; "),
        });
        return;
      }
      valid.push({ row: parsed.data as Record<string, unknown>, idx });
    });
    if (valid.length === 0) return { inserted: 0, errors, total: data.rows.length };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const checks = FK_CHECKS[data.table] ?? [];
    for (const c of checks) {
      const wanted = Array.from(new Set(valid
        .map((v) => v.row[c.col])
        .filter((x) => x != null && String(x).trim() !== "")
        .map(String)));
      if (!wanted.length) continue;
      const { data: found, error } = await (supabaseAdmin.from(c.refTable) as any)
        .select(c.refCol).in(c.refCol, wanted);
      if (error) throw new Error(`FK check ${c.refTable}.${c.refCol}: ${error.message}`);
      const present = new Set((found ?? []).map((r: any) => String(r[c.refCol])));
      for (let i = valid.length - 1; i >= 0; i--) {
        const v = valid[i]!;
        const ref = v.row[c.col];
        if (ref != null && String(ref).trim() !== "" && !present.has(String(ref))) {
          errors.push({ row: v.idx + 1, message: `${c.col}: "${ref}" tidak ada di ${c.refTable}.${c.refCol}` });
          valid.splice(i, 1);
        }
      }
    }
    if (valid.length === 0) return { inserted: 0, errors, total: data.rows.length };
    const { error } = await (supabaseAdmin.from(data.table) as any).insert(valid.map((v) => v.row));
    if (error) throw new Error(error.message);
    return { inserted: valid.length, errors, total: data.rows.length };
  });

// Export master rows with whitelisted columns (Batch 4.2).
export const exportFinMaster = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { table: FinTable }) => ({ table: tableSchema.parse(d.table) }))
  .handler(async ({ data }) => {
    const cols = ALLOWED_COLS[data.table];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from(data.table)
      .select(cols.join(","))
      .limit(10000);
    if (error) throw new Error(error.message);
    return { columns: cols as readonly string[], rows: (rows ?? []) as Record<string, unknown>[] };
  });
