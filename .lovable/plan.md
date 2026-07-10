# Audit Modul Finance vs `prime-simon.vercel.app`

Saya sudah membandingkan halaman `prime-simon.vercel.app` (referensi visual + fitur) dengan modul Finance saat ini (66 route file, 40+ tabel `fin_*`, RPC posting, RLS ketat). Struktur data dan sebagian besar route sudah lengkap — gap utamanya ada di **dashboard**, **kartu KPI**, dan beberapa **widget komparasi/quick action** yang belum diseragamkan.

## Hasil komparasi cepat

Referensi memuat komponen berikut pada `/finance`:

1. 8 kartu KPI (Pendapatan MTD, Pengeluaran, Piutang, Hutang, Kas Masuk, Kas Keluar, Growth vs Bulan Lalu, Laba Bersih) — kita **7 dari 8**, kurang kartu **Growth vs Bulan Lalu** eksplisit dan urutan berbeda.
2. Chart **Tren Pendapatan & Pengeluaran** 12 bulan — sudah ada (`FinanceTrendChart`).
3. **Quick Actions** (Input Pendapatan / Buat Voucher / Tambah Vendor / Export Laporan) — kita punya action bar berbeda; belum 1-klik ke 4 aksi tsb.
4. **Pendapatan by Payer** dengan panel *Bandingkan Periode* multi-select bulan + tabel growth antar periode — kita hanya breakdown single period.
5. **Top 10 Dokter by Revenue** dengan filter Payer + rentang tanggal internal — kita punya list dokter tapi tanpa filter payer + range internal.
6. **AR Aging & AP Aging** bar mini di dashboard — kita hanya link ke halaman terpisah.
7. **Recent Activities** (kas + invoice) — kita belum ada widget aktivitas mixed feed di dashboard.
8. **Finance Alerts** (piutang JT / hutang JT / rekonsiliasi belum match) — kita belum menampilkan card alert ringkas.

## Rencana per batch

### Batch 1 — P0 (Parity data dashboard)
- Tambahkan kartu KPI **Growth vs Bulan Lalu** & samakan urutan 8 kartu ke layout referensi.
- Perluas RPC `getFinanceDashboard` agar mengembalikan: `arAgingBuckets`, `apAgingBuckets`, `recentActivities` (10 item campuran pembayaran + invoice), `alerts` (piutang JT, hutang JT, unreconciled count).
- Fix bug: label `Growth` saat ini pakai `monthlyTrend.at(-2/-1)` yang bisa `undefined` di bulan berjalan — fallback 0 dan hindari `NaN%`.

### Batch 2 — P1 (Quick Actions + Comparator)
- Buat komponen `<FinanceQuickActions />` dengan 4 tombol deep-link: Input Pendapatan → `/finance/pendapatan-input-harian`, Buat Voucher → `/finance/pengeluaran`, Tambah Vendor → `/finance/master/vendor`, Export Laporan → memicu `FinanceExportBar`.
- Buat komponen `<PayerCompareCard />`: multi-select bulan (6 opsi), Reset/Clear, tabel growth antar periode. Server function `getPayerBreakdownRange({ periods })`.
- Buat `<TopDokterCard />` dengan filter payer + date range internal, chart batang horizontal.

### Batch 3 — P2 (Widgets pendukung)
- `<AgingMiniChart />` dua kartu (AR/AP) menggunakan bucket 0-30/31-60/61-90/>90 dari RPC.
- `<RecentActivitiesFeed />` daftar 10 aktivitas terakhir (invoice + pembayaran) dengan link ke detail.
- `<FinanceAlerts />` 3 alert card + link ke halaman aging & rekonsiliasi.
- Skeleton state semua widget baru mengikuti pola Batch 4 sebelumnya.

### Batch 4 — Polish
- Sync copywriting Indonesia (label, tooltip) 1:1 dengan referensi.
- Print/PDF stylesheet: sembunyikan Quick Actions & Alerts saat print (`no-print`).
- Keyboard shortcut `1..8` untuk fokus KPI, `q` untuk buka Quick Actions.
- A11y: aria-label tiap kartu, `role="region"`, `aria-live` untuk perubahan periode.
- E2E Playwright: dashboard render 8 KPI, quick action click navigasi ke route benar, comparator memuat 2+ periode.

## Catatan teknis

- Semua server function baru pakai `requireFinView` (sudah ada di `src/lib/finance-guard.ts`).
- Reuse `fin_report_aggregate_lines` untuk aging kalau memungkinkan; kalau tidak, tambah RPC `fin_ar_aging_buckets(_asof)` + `fin_ap_aging_buckets(_asof)` (SECURITY DEFINER + `fin_can_view` check).
- Tidak menyentuh RLS/GRANT existing; hanya menambah view/RPC baca + widget UI.

Konfirmasi lanjut ke **Batch 1** setelah plan disetujui.
