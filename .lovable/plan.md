# Penyempurnaan /finance (Prime SIMON)

Cakupan besar — dikerjakan bertahap dalam 4 fase. Setiap fase bisa di-review sebelum lanjut.

## Fase 0 — Aktifkan Lovable Cloud
- Enable Cloud (Postgres + Auth + Storage).
- Setup RLS pattern: `user_roles` (admin / kasir / dokter / akunting) + `has_role()` security definer.
- Semua tabel finance pakai `tenant_id` (= `auth.uid()` pemilik klinik) supaya multi-klinik aman.

## Fase 1 — Master Data (fondasi)
Buat tabel + RLS + halaman CRUD (list, create, edit, delete, search):
- `coa` (kode akun, nama, tipe, parent)
- `cost_center`
- `dokter` (nama, spesialisasi, default_fee_pct, npwp)
- `karyawan` (nama, jabatan, gaji_pokok)
- `payer` (nama, tipe: tunai / asuransi / BPJS / korporat, term hari)
- `vendor`
- `kategori_layanan` + `layanan` (tarif default)
- `tarif_pajak` (PPN, PPh21, PPh23)
- `profil_klinik` (1 row, logo, NPWP, alamat)

Semua diseed dengan data realistis di migration awal.

## Fase 2 — Pendapatan
Tabel: `invoice` (header) + `invoice_item` (detail layanan) + `pembayaran` (cash/kartu/transfer/asuransi).
Halaman:
- **Input harian**: form invoice dengan picker dokter + layanan + payer + metode bayar; auto-hitung subtotal, diskon, pajak, total.
- **Kasir harian**: rekap per kasir per hari, tutup kas.
- **Kartu**: rekap EDC per bank, MDR, settlement.
- **Ranking dokter**: leaderboard pendapatan + jumlah pasien per periode.
- **Report highlight**: top layanan, top payer, growth vs bulan lalu.
Filter periode + payer + dokter di semua halaman.

## Fase 3 — Honor Dokter
Tabel: `honor_run` (periode) + `honor_detail` (per dokter, gross/potongan/net) + `honor_potongan` (jenis: PPh21, bahan, lab, dll).
Halaman:
- **Input**: tarik otomatis dari invoice periode terpilih × persentase fee dokter.
- **Potongan**: tambah/edit potongan per dokter (PPh21 progresif otomatis dari `tarif_pajak`).
- **Rekap**: slip honor printable + total per dokter + export.

## Fase 4 — Akuntansi Inti
Tabel: `jurnal` (header) + `jurnal_line` (debit/kredit per akun + cost_center).
Auto-posting:
- Invoice lunas → Dr Kas/Bank/Piutang | Cr Pendapatan + Cr Hutang Pajak.
- Pengeluaran → Dr Beban | Cr Kas/Bank/Hutang.
- Honor run posted → Dr Beban Honor | Cr Hutang Honor + Cr Hutang PPh21.

Halaman (semua dari jurnal asli, bukan hardcode):
- **Jurnal**: list + filter + manual entry.
- **Buku besar**: per akun, saldo berjalan.
- **Neraca Saldo**: trial balance per periode.
- **Laba Rugi**: revenue – COGS – opex – pajak.
- **Arus Kas**: indirect method dari akun kas/bank.

## Catatan teknis
- Server functions (`createServerFn` + `requireSupabaseAuth`) untuk semua mutasi & report agregat.
- TanStack Query untuk caching, invalidate setelah mutate.
- `recharts` untuk grafik (sudah ada).
- Branding header /finance tetap (sudah dipisah).

## Permintaan persetujuan
Karena cakupan sangat besar (≈9 tabel baru, 20+ halaman dirombak), saya usul **mulai dari Fase 0 + Fase 1 dulu** di iterasi ini. Setelah master data jalan & disetujui, lanjut Fase 2, lalu 3, lalu 4.

**Setuju mulai dari Fase 0 + 1?** Atau ingin urutan berbeda (mis. Pendapatan duluan dengan tabel master minimal)?