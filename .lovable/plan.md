# Roadmap Lanjutan Finance Parity `prime-simon.vercel.app`

Masalah yang diselesaikan: alur sebelumnya berhenti karena menunggu pilihan arah. Mulai sekarang arah lanjutan ditetapkan sebagai batch berurutan agar pengguna cukup mengetik `batch 5`, `batch 6`, dst.

## Batch 5 — Master Data Parity

**Tujuan:** semua master finance siap dipakai sebagai fondasi transaksi dan laporan.

- Audit dan rapikan CRUD Master: COA, Payer, Vendor, Dokter, Karyawan, Cost Center, Tarif Pajak, Template Invoice, Template Voucher.
- Tambahkan validasi wajib: kode unik, nama wajib, status aktif, field numerik tidak negatif.
- Tambahkan empty state, skeleton, pagination, search, dan filter aktif/nonaktif konsisten.
- Pastikan tombol “Tambah Vendor” dari dashboard mengarah dan membuka workflow yang benar.
- Tambahkan E2E: master list render, create/edit validation, search/filter, dan akses route.

## Batch 6 — Laporan Finance Parity

**Tujuan:** laporan utama setara referensi dan bisa ditelusuri.

- Rapikan Laporan: Neraca, Laba Rugi, Buku Besar, Arus Kas, Perubahan Modal, Laba Rugi per Payer.
- Tambahkan drilldown dari angka laporan ke jurnal/transaksi sumber.
- Tambahkan status balanced/unbalanced dan warning data kosong/tidak lengkap.
- Tambahkan export CSV/PDF yang mengikuti filter periode.
- Optimalkan query laporan agar tidak mengambil data berlebihan di browser.
- Tambahkan E2E: laporan render, filter periode, export, dan drilldown.

## Batch 7 — Voucher, Expense, dan Kas Kecil

**Tujuan:** workflow pengeluaran siap operasional.

- Samakan workflow BKK, BBK, Voucher Kas Kecil, Pengeluaran, dan Vendor Bayar.
- Tambahkan guard nominal: angka kosong tidak menjadi `0` hardcoded kecuali user memang input 0.
- Tambahkan validasi status: draft → posted → void, dengan reversal jurnal bila dibatalkan.
- Tambahkan auto-posting jurnal saat voucher diposting.
- Tambahkan attachment/bukti bayar bila storage sudah tersedia.
- Tambahkan E2E: buat voucher draft, validasi nominal, post voucher, void/reversal.

## Batch 8 — Rekonsiliasi & Bank Statement

**Tujuan:** rekonsiliasi bank mendekati referensi, bukan sekadar daftar data.

- Rapikan halaman Rekonsiliasi agar punya summary matched/unmatched/pending.
- Tambahkan import statement CSV dengan mapping kolom aman.
- Tambahkan auto-match rule berdasarkan tanggal, nominal, dan referensi.
- Tambahkan manual match/unmatch dengan audit trail.
- Tampilkan alert dashboard untuk transaksi belum match.
- Tambahkan E2E: import CSV sample, auto-match, manual match, unmatch.

## Batch 9 — Dashboard Widgets Parity Final

**Tujuan:** dashboard Finance makin mendekati 100% referensi.

- Finalisasi 8 KPI sesuai urutan referensi.
- Pastikan Growth vs Bulan Lalu stabil dan tidak menghasilkan NaN.
- Tambahkan/rapikan Recent Activities, Finance Alerts, AR/AP Aging mini chart.
- Rapikan Payer Comparator dan Top Dokter comparator agar state URL konsisten.
- Tambahkan skeleton per-widget dan empty state konsisten.
- Tambahkan E2E: dashboard 8 KPI, quick actions, comparator, aging, alerts.

## Batch 10 — Polish, A11y, Security, dan Regression

**Tujuan:** stabil sebelum dianggap selesai.

- Audit seluruh route Finance untuk error route, blank page, dan metadata.
- Tambahkan keyboard shortcuts yang tidak mengganggu input form.
- Tambahkan print stylesheet final untuk laporan dan dashboard.
- Periksa akses server function Finance memakai guard role yang tepat.
- Jalankan E2E smoke Finance menyeluruh.
- Dokumentasikan gap tersisa bila ada yang belum bisa 100% karena referensi tidak memiliki data/API terbuka.

## Urutan Eksekusi

```text
batch 5 = Master Data
batch 6 = Laporan
batch 7 = Voucher / Expense / Kas Kecil
batch 8 = Rekonsiliasi
batch 9 = Dashboard Parity Final
batch 10 = Polish + Security + Regression
```

## Catatan Teknis

- Tidak menggunakan hash route untuk modul besar; semua route tetap mengikuti TanStack Router file-based routing.
- Server function Finance wajib memakai guard `requireFinView` atau `requireFinEdit` sesuai aksi.
- Tidak menyentuh auto-generated backend/client files.
- E2E Playwright ditambahkan bertahap per batch, bukan satu file besar yang sulit dirawat.
- Perubahan database hanya dilakukan jika diperlukan untuk workflow batch terkait, dengan RLS dan GRANT lengkap.