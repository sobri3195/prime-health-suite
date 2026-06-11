## Tujuan
Sinkronkan modul `/finance` Prime Health Suite dengan referensi prime-simon: tambah RBAC viewer/admin, audit log lengkap, filter tanggal global, dan ekspor CSV/PDF.

## 1. RBAC viewer vs admin (tanpa role baru)
Pemetaan menggunakan role yang sudah ada di tabel `user_roles`:
- **Admin finance** = `super_admin` → full CRUD master, jurnal, payroll, settings.
- **Viewer finance** = user terotentikasi lain (atau role apa pun selain `super_admin`) → read-only di seluruh `/finance`.

Implementasi:
- Helper `useFinanceAccess()` di `src/lib/rbac.tsx` mengembalikan `{ canEdit, canView }`.
- Gate route `/_authenticated/finance` (`canView`) — selain itu redirect ke `/finance/login`.
- Setiap tombol/aksi mutasi (`Tambah`, `Simpan`, `Hapus`, `Posting Jurnal`, dll.) memakai `disabled={!canEdit}` + tooltip "Hanya admin".
- Server functions mutasi (`upsertFinMaster`, `deleteFinMaster`, pendapatan, payroll) menambahkan check `has_role(uid, 'super_admin')` di handler. Tolak dengan error jika viewer.

## 2. Audit Log lengkap
Pakai tabel `clinic_audit_log` yang sudah ada (sumber = `finance`).
Cakupan yang dicatat:
- **Mutasi** master + transaksi (create/update/delete) via wrapper `withAudit()` di server fn.
- **Export** CSV/PDF: catat `action=export`, `resource=<report>`, `meta={format, from, to, filters}`.
- **View laporan sensitif**: laba-rugi, neraca, payroll → log `action=view` on mount (debounced 1×/sesi/halaman).
- **Login finance + perubahan role**: hook ke `signInWithPassword` sukses dan ke RPC `grant_role`.

Halaman audit `_authenticated.finance.audit.tsx` baru menampilkan tabel + filter (tanggal, aktor, action, resource) — hanya admin.

## 3. Filter tanggal global
- Search params di route layout `_authenticated.finance.tsx`: `from`, `to`, `preset` (today, 7d, mtd, qtd, ytd, custom).
- Persist di `localStorage` (`finance:dateRange`) dengan rehydrate on mount jika URL kosong.
- Komponen `<FinanceDateFilter />` di header — popover + preset chips + date range picker.
- Context `FinanceDateContext` agar semua chart/tabel/aktivitas terbaru membaca `from/to` yang sama.
- Refactor: `_authenticated.finance.index.tsx` (KPI, trend, payer, ranking), `pendapatan*`, `pengeluaran`, `piutang`, `jurnal`, `buku-besar`, `laba-rugi`, `neraca`, `arus-kas`, `honor-*`, `payroll`, `pajak` — semua memakai context ini.

## 4. Ekspor CSV & PDF
- Util `src/lib/finance-export.ts` membungkus `exporter.ts` dengan signature `exportCsv(rows, filename)` dan `exportPdf({title, period, columns, rows, summary})`.
- Komponen `<FinanceExportBar />` (extend `ExportBar`) di tiap laporan: pendapatan, pengeluaran, AR aging, AP aging, jurnal, L/R, neraca, arus kas, honor rekap, payroll.
- Filter periode otomatis ambil dari `FinanceDateContext`.
- Setiap export memanggil `logExport()` ke audit log.

## 5. Sinkronisasi dengan prime-simon.vercel.app
Audit halaman referensi & samakan layout/komponen utama:
- **Dashboard `/finance`**: KPI cards (revenue, ebitda, AR, AP), trend revenue vs target, perbandingan periode (sudah ada), top dokter, top layanan, payer mix, aktivitas terbaru → tata ulang sesuai grid prime-simon.
- **Pendapatan**: tab input harian / kasir harian / kartu / ranking dokter / report highlight → samakan kolom, filter, dan total row.
- **Honor dokter**: input → potongan → rekap dengan stepper & summary card.
- **Laporan keuangan**: jurnal (tabel + drill), buku besar (per akun), neraca (aset/liabilitas/ekuitas), L/R (multi-period), arus kas (operasi/investasi/pendanaan).

Detail teknis:
- File baru: `src/lib/finance-access.ts`, `src/lib/finance-audit.ts`, `src/lib/finance-export.ts`, `src/context/finance-date.tsx`, `src/components/finance-date-filter.tsx`, `src/components/finance-export-bar.tsx`, `src/routes/_authenticated.finance.audit.tsx`.
- File diubah: `src/routes/_authenticated.finance.tsx` (layout wrap context + filter bar + gate), seluruh sub-route `_authenticated.finance.*.tsx`, `src/lib/finance-master.functions.ts` + `finance-pendapatan.functions.ts` + `payroll.functions.ts` (RBAC + audit), `src/lib/nav-config.ts` (tambah menu Audit), `src/lib/rbac.tsx`.
- Migrasi DB: tidak ada tabel baru (pakai `clinic_audit_log`). Hanya tambahan grant + policy supaya `super_admin` dapat membaca seluruh audit log finance.

## Estimasi
~25 file disentuh, 6 file baru, 1 migrasi kecil (policy audit log). Implementasi bertahap: RBAC + audit → filter global → export → sinkronisasi UI prime-simon.
