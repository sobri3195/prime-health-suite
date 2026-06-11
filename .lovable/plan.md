
# Rencana Implementasi SIM Klinik Prime Mata

Scope sangat besar — saya akan kerjakan dalam **3 iterasi berurutan** dalam satu sesi build ini. Setiap iterasi menghasilkan fitur yang sudah jalan end-to-end sebelum lanjut. Modul finance, HR, diklat lama TIDAK disentuh.

## Strategi Integrasi Tabel

Pakai ulang tabel existing, hanya extend kolom yang kurang:

| Konsep SIM Klinik | Tabel yang dipakai | Aksi |
|---|---|---|
| Pasien (RM) | `apps_pasien` | + kolom `no_rm`, `nik`, `alergi`, `patient_type`, `emergency_contact` |
| Dokter | `fin_dokter` | + kolom `sip_number`, `schedule_note` |
| Layanan/tindakan | `fin_layanan` | sudah cukup |
| Obat | tabel baru `klinik_obat` + `klinik_stock_movement` | finance tidak punya master obat |
| Appointment | `apps_booking` | + kolom `complaint`, `source` |
| Antrian | tabel baru `klinik_queue` | |
| Visit/kunjungan | tabel baru `klinik_visit` | |
| Rekam medis mata | tabel baru `klinik_medical_record` (kolom mata: visus OD/OS, TIO, slit lamp, fundus, ICD-10) | |
| Resep | tabel baru `klinik_prescription` + `klinik_prescription_item` | |
| Invoice/billing | `fin_invoice` + `fin_invoice_item` + `fin_pembayaran` | sudah ada, tinggal dipakai dari visit |
| Audit log | `clinic_audit_log` | sudah ada |
| Role | `user_roles` + enum `app_role` | + role baru jika belum ada |

## Iterasi 1 — Auth, RBAC, Master Data

1. **Migration database** (1 file)
   - Tambah role enum: `admin_klinik`, `dokter`, `perawat_optometri`, `pendaftaran`, `kasir`, `farmasi`, `manajemen` (super_admin sudah ada).
   - Extend `apps_pasien` & `fin_dokter` & `apps_booking` dengan kolom baru.
   - Tabel baru: `klinik_obat`, `klinik_stock_movement`, `klinik_queue`, `klinik_visit`, `klinik_medical_record`, `klinik_prescription`, `klinik_prescription_item`.
   - GRANT + RLS + policy via `has_role()` untuk setiap tabel baru.
   - Function `klinik_generate_no_rm()` dan `klinik_next_queue_number(date)`.
   - Seed: 20 pasien, 5 dokter, 30 obat, 20 layanan, 10 appointment + antrian hari ini, 30 visit historis, 20 invoice.

2. **RBAC frontend**
   - Extend `src/lib/rbac.tsx` dengan helper `useClinicAccess()` untuk semua role baru.
   - Sidebar role-aware di `src/lib/nav-config.ts` — tambah section "SIM Klinik".
   - Halaman `/sim-klinik/users` (manajemen user, assign role, nonaktif) — super_admin only.

3. **Master data CRUD** (komponen reusable sudah ada via `master-crud.tsx`)
   - `/sim-klinik/pasien` — list, search, filter, tambah/edit/detail, export CSV
   - `/sim-klinik/dokter` — pakai ulang/extend fin_dokter UI
   - `/sim-klinik/layanan` — pakai ulang fin_layanan
   - `/sim-klinik/obat` — CRUD + indikator stok rendah & expired

## Iterasi 2 — Workflow Klinis + Farmasi + Kasir

4. **Pendaftaran & Appointment** `/sim-klinik/pendaftaran`
   - Cari pasien (no_rm/nama/NIK/HP) atau buat baru
   - Form appointment (dokter, tanggal, jam, keluhan, jenis pasien)
   - Tombol check-in → otomatis buat queue + visit `registered`

5. **Antrian** `/sim-klinik/antrian`
   - List antrian hari ini, filter counter/dokter
   - Tombol Panggil / Mulai / Selesai
   - Display mode (besar) untuk layar antrian
   - Auto-refresh via TanStack Query refetchInterval 5s

6. **Rekam Medis** `/sim-klinik/rekam-medis`
   - Daftar pasien hari ini (dokter login)
   - Form pemeriksaan mata lengkap + 7 template cepat (katarak, glaukoma, dll)
   - Timeline riwayat kunjungan
   - Tombol "Buat Resep" dan "Tambah Tindakan ke Invoice"
   - Final record locked (kecuali admin, dengan audit)

7. **Farmasi** `/sim-klinik/farmasi`
   - Daftar resep masuk (status sent_to_pharmacy)
   - Dispense → kurangi stok via `klinik_stock_movement` (transaksi)
   - Cegah dispense jika stok kurang
   - Sub-tab: Stock In, Stock Out, Adjustment, Riwayat, Alert (low stock/expired)

8. **Kasir** `/sim-klinik/kasir`
   - Daftar visit `billing` → generate invoice (auto-pull tindakan + obat dispensed)
   - Form pembayaran (tunai/transfer/QRIS/debit/asuransi), partial allowed
   - Cetak invoice (window.print + style A5)
   - Saat lunas: invoice paid + visit done

## Iterasi 3 — Dashboard, Laporan, Audit, Notif

9. **Dashboard** `/sim-klinik` — 11 KPI cards clickable, grafik kunjungan 30 hari, grafik pendapatan 12 bulan, distribusi jenis pasien (donut), top 10 layanan, aktivitas terbaru. Global date filter (today/7d/30d/MTD/YTD/custom).

10. **Laporan** `/sim-klinik/laporan` (10 sub-tab) — semua filter date + dokter + status, ringkasan + tabel + grafik + export CSV + print.

11. **Notification Bell** di header — query alert (low stock, invoice unpaid >7 hari, resep pending, appointment hari ini).

12. **Audit Log Viewer** `/sim-klinik/audit` — pakai `clinic_audit_log`, filter user/action/table/tanggal, diff before/after JSON readable.

## Detail Teknis

- Stack: TanStack Start (existing), Supabase, TanStack Query, RHF + Zod, Recharts, shadcn/ui, sonner toast.
- Server functions: `src/lib/klinik-*.functions.ts` per modul, `requireSupabaseAuth` middleware.
- Audit log: helper `withAudit()` di `src/lib/clinic-audit.ts` (sudah ada) dipakai di setiap mutasi.
- RLS: setiap tabel klinik baru pakai pola `has_role(auth.uid(), 'super_admin') OR has_role(... role lain ...)`. Dokter hanya bisa lihat medical_record/visit yang dia handle.
- Sidebar: tambah group "SIM Klinik" di `nav-config.ts`, role filter sudah ada.
- Reusable: `master-crud.tsx`, `finance-export-bar.tsx`, `finance-date-filter.tsx` (rename context jadi generic).
- Bahasa Indonesia untuk semua label.
- Responsive: grid `md:grid-cols-2`, table wrap di overflow-x-auto.

## Hal yang TIDAK dikerjakan iterasi ini

- Mobile app `/apps` (pasien) — tetap apa adanya, hanya `apps_pasien` di-extend.
- WhatsApp/email notification beneran (cukup toast + bell in-app).
- PDF native (pakai `window.print` + CSS print).
- Online appointment booking publik (sudah ada di `/apps/booking`).

## Risiko & Catatan

- Iterasi ini menambah ~9 tabel + ~30 file baru. Saya akan commit migration paling dulu (perlu approval Anda), lalu lanjut implementasi setelah migration jalan.
- Modul lama (finance/HR/diklat) hanya disentuh untuk nav-config (tambah group baru di atas/bawah).
- Setelah Iterasi 1 selesai, saya konfirmasi singkat sebelum Iterasi 2 supaya Anda bisa review arah.

**Apakah rencana ini disetujui? Saya mulai dengan migration database + seed sebagai langkah pertama.**
