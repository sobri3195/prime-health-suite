## Finance Polish — Paralel Batch

Empat area polish dijalankan berurutan tapi tiap area independen (bisa direview terpisah).

### A. Import/Export (Batch 4.2–4.4)
- **Export CSV** semua 9 tabel master via `exportFinMaster` (server fn, streaming rows, header sesuai `ALLOWED_COLS`).
- **Template lanjutan**: template CSV dengan contoh 1 baris + kolom opsional ditandai `?`.
- **Validasi lintas-tabel**: cek referensi FK sebelum insert (mis. `fin_dokter.coa_id` harus ada di `fin_coa`), report per-baris.

### B. Dashboard polish
- **Skeleton loading** (`Skeleton` shadcn) untuk kartu KPI, chart, tabel top-dokter.
- **Empty states** konsisten via `EmptyState` component (ikon + copy + CTA).
- **Chart tooltip** custom (`ChartTooltipContent`) dengan format Rupiah + persen delta.

### C. Neraca / Laba Rugi print & PDF
- **Print CSS** dedicated: `@media print` sembunyikan sidebar/nav, page-break per section, header ulang tiap halaman.
- **Export PDF** via `jsPDF + autoTable` — tombol "Unduh PDF" di Neraca, Laba Rugi, Arus Kas. Meta: nama klinik, periode, timestamp.

### D. A11y & keyboard shortcut finance
- Aria-label lengkap untuk icon buttons (delete, edit, export).
- Focus ring visible (`focus-visible:ring-2 ring-ring`) di tombol/link finance.
- Shortcut tambahan: `N` = new invoice, `E` = export, `Esc` = close dialog, `G L` = go Laporan, `G N` = go Neraca. Registrasi via hook `useHotkeys` global + `?` menampilkan cheatsheet updated.

### Urutan eksekusi
1. B (dashboard) — visual quick win
2. A (import/export server) — butuh migrasi ringan? tidak, murni server fn
3. C (print/PDF) — tambah dep `jspdf`, `jspdf-autotable`
4. D (a11y/shortcut) — sweep terakhir

### Catatan teknis
- Tanpa perubahan skema DB.
- Deps baru: `jspdf`, `jspdf-autotable`.
- Semua server fn baru pakai `requireFinView` / `requireFinEdit` middleware existing.
- Typecheck + unit test wajib hijau tiap batch.
