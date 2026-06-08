## Tujuan

Bangun alur HR end-to-end: karyawan **clock-in/out** di SIM Klinik → jam lebih dari shift terdeteksi sebagai **lembur** dengan pilihan konversi **jam (cuti) atau uang** → setelah di-approve Manager/HR, lembur masuk ke **payroll bulanan** di Finance dan ter-jurnal otomatis.

## Arsitektur Modul

```
SIM Klinik                            Finance
─────────────                         ──────────
Absensi  ──┐                          
  (clock) │                          
           ▼                          
Lembur (request + approval)  ───►  Payroll (run bulanan)
  - konversi: jam / uang              - tarik absensi + lembur approved
                                      - hitung gaji pokok + lembur uang
                                      - generate slip + jurnal
```

## 1. Database (Lovable Cloud)

Tabel baru di schema `public`:

- `hr_employee` — link `fin_karyawan` ↔ `auth.users` (opsional self-service), kolom: `karyawan_id`, `user_id`, `shift_default`, `gaji_pokok`, `tarif_lembur_per_jam`, `saldo_jam_lembur`.
- `hr_shift` — master shift: `nama`, `jam_mulai`, `jam_selesai`, `toleransi_menit`.
- `hr_attendance` — 1 baris per hari per karyawan: `tanggal`, `clock_in`, `clock_out`, `shift_id`, `lokasi_in/out` (opsional), `status` (hadir/telat/alpa/izin), `total_jam_kerja`.
- `hr_overtime` — pengajuan lembur: `attendance_id`, `karyawan_id`, `tanggal`, `jam_mulai`, `jam_selesai`, `durasi_jam`, `alasan`, `mode` (`uang` / `jam`), `nominal` (jika uang), `status` (`pending`/`approved`/`rejected`), `approved_by`, `approved_at`, `payroll_run_id`.
- `hr_payroll_run` — header batch payroll bulanan: `periode_bulan`, `periode_tahun`, `status` (`draft`/`final`/`paid`), `total_gaji`, `total_lembur`, `dibuat_oleh`.
- `hr_payroll_item` — 1 baris per karyawan per run: gaji pokok, total jam lembur uang, nominal lembur, potongan, take-home, ref `fin_invoice`/jurnal.

RLS: karyawan hanya bisa lihat absensi/lembur miliknya; role `admin_klinik`/`super_admin` lihat semua. Payroll & approval hanya `finance_manager`/`super_admin`. Semua tabel auto-grant `authenticated` + `service_role`. Server function `hr_calc_overtime(attendance_id)` menghitung selisih jam vs shift untuk auto-isi pengajuan.

## 2. SIM Klinik — Absensi

Route baru: `/sim-klinik/absensi` (group HR).

- Kartu **Clock-in / Clock-out** besar dengan jam realtime, otomatis pilih shift hari ini, tombol disable jika sudah clock-in. Simpan timestamp via serverFn `hrClockIn` / `hrClockOut`.
- Tabel **Riwayat Absensi** (filter rentang tanggal, status) + ekspor CSV/PDF lewat `ExportBar` yang sudah ada.
- Banner CTA: bila `clock_out - shift_selesai ≥ 30 menit`, tampilkan tombol **"Ajukan Lembur"** yang membuka dialog ke modul Lembur dengan prefill durasi.

## 3. SIM Klinik — Lembur

Route baru: `/sim-klinik/lembur`.

- Form pengajuan: tanggal, jam mulai/selesai (prefill dari absensi), alasan, **toggle mode**:
  - **Uang** → preview: `durasi × tarif_lembur_per_jam` (dari `hr_employee`); pakai tarif default Depnaker bila kosong.
  - **Jam** → preview: `+X jam` ke `saldo_jam_lembur`.
- Tabel pengajuan saya (pending/approved/rejected) + filter.
- **Inbox Approval** (tampil bila role manager/HR): list pending dengan tombol Approve/Reject + catatan. Approval otomatis tulis ke `clinic_audit_log` lewat `clinicAudit()` yang sudah ada, dan:
  - mode `jam` → tambah `saldo_jam_lembur` karyawan.
  - mode `uang` → siap diserap oleh payroll run berikutnya (status `approved`, `payroll_run_id` null).
- Skeleton + EmptyState konsisten dengan modul SIM Klinik lain.

## 4. Finance — Payroll

Route baru: `/finance/payroll` (group HR).

- **Daftar Payroll Run** per bulan, tombol **"Buat Run Bulan Ini"** → serverFn `createPayrollRun({ bulan, tahun })`:
  1. Tarik semua `hr_attendance` di periode.
  2. Tarik `hr_overtime` `approved` + `mode='uang'` + `payroll_run_id IS NULL` di periode.
  3. Hitung per karyawan: gaji pokok + total lembur uang − potongan dasar; tulis ke `hr_payroll_item`; tandai overtime ke run ini.
- Detail run: tabel per karyawan, drill-down ke breakdown jam & lembur. Tombol **Finalize** → buat draft jurnal otomatis via util `journal.ts` (debit Beban Gaji & Beban Lembur, kredit Hutang Gaji), generate **slip gaji PDF** dengan `lib/exporter.ts`, dan kunci run.
- `ExportBar` untuk CSV/PDF rekap run.

## 5. UX & Guard

- Sidebar SIM Klinik: tambah item **Absensi** & **Lembur** dalam group "HR" dengan ikon `Clock` & `Timer`; role `admin_klinik`/`dokter`/`perawat`/`kasir`/`front_office` lihat absensi & lembur sendiri; approval inbox hanya `admin_klinik`/`super_admin`.
- Sidebar Finance: tambah item **Payroll** dalam group "Penggajian"; visible `finance_manager`/`super_admin`.
- Semua route di bawah `_authenticated/` (guard sudah ada).
- i18n: semua label baru pakai `t()` (ID & EN) supaya tidak menambah hits di i18n-lint.

## Technical Notes

- ServerFn baru di `src/lib/hr.functions.ts` (clock in/out, list attendance, request overtime, approve overtime, get my saldo) — pakai `requireSupabaseAuth`.
- ServerFn payroll di `src/lib/payroll.functions.ts` — admin elevated via `supabaseAdmin` (di-import di dalam handler) karena perlu read lintas karyawan.
- Validasi input pakai Zod (durasi 0.25–12 jam, alasan max 500 char).
- Audit otomatis: clock in/out, request lembur, approve/reject, create/finalize payroll run → `clinicAudit()`.
- Tarif lembur default mengikuti tarif jam: `(gaji_pokok / 173) × 1.5` untuk jam pertama, `× 2` jam berikutnya, dapat di-override per karyawan.
- Tidak menyentuh modul Finance honor yang sudah ada; payroll baru ini stand-alone tapi entry jurnalnya kompatibel dengan `fin_coa`.

## Deliverable

- Migration tabel `hr_*` + RLS + grants.
- 3 route baru (`absensi`, `lembur`, `payroll`) + komponen.
- 2 file serverFn (`hr.functions.ts`, `payroll.functions.ts`).
- Update `nav-config.ts` untuk sidebar + role gating.
- Skeleton/EmptyState konsisten, ExportBar terpasang, audit log otomatis.
