## Tujuan
Empat fitur besar di modul `/finance`, dibangun di atas tabel transaksional yang sudah ada (`fin_invoice`, `fin_expense`, `fin_journal_*`, `fin_pembayaran`, `fin_coa`).

---

### 1. Template Invoice & Voucher
Tambah tabel master template supaya kasir/AP tinggal pilih, tidak isi ulang.

- `fin_template_invoice`: nama, payer default, kategori, daftar item default (layanan, qty, harga, diskon %, pajak id), COA pendapatan, catatan.
- `fin_template_voucher`: nama, vendor default, daftar item (deskripsi, COA biaya, jumlah, PPN id), metode bayar default.
- `fin_mdr_rule`: aturan MDR per metode bayar (Debit/Credit/QRIS) × bank/acquirer → `rate %` + COA beban MDR. Dipakai otomatis saat catat pembayaran non-tunai: hitung MDR, kurangi kas masuk, dan post jurnal `Dr Beban MDR / Cr Kas` bersamaan.
- UI: tab "Template" di halaman Pendapatan & Pengeluaran (CRUD), dan tombol **"Pakai Template"** di form invoice/voucher yang prefill seluruh baris.
- Halaman master baru `/finance/master-mdr` untuk aturan MDR.

### 2. Rekonsiliasi Kas/Bank
- Tabel `fin_bank_statement`: import mutasi bank (tanggal, deskripsi, debit, kredit, saldo, bank_id, ref). Import via paste CSV (tanpa upload file — parse client-side, kirim baris ke server fn).
- Tabel `fin_reconciliation`: pasangan `statement_id` ↔ `journal_line_id` (atau `pembayaran_id` / `expense_id`), status `matched|unmatched|adjusted`, selisih.
- Auto-match: cocokkan by tanggal ±2 hari + amount exact. Sisa = unmatched.
- UI `/finance/rekonsiliasi`: dua kolom (Mutasi Bank | Catatan Buku Besar) + tombol Match, Unmatch, dan **"Buat Jurnal Penyesuaian"** untuk selisih (mis. biaya admin bank, bunga) → langsung post ke `fin_journal_entry` dengan sumber `adjustment`.
- KPI atas: saldo buku, saldo bank, selisih, jumlah unmatched.

### 3. Audit Log Finance (server-side, bukan localStorage)
- Tabel `fin_audit_log`: `actor_id`, `actor_email`, `action` (create/edit/void/pay/post/reconcile), `entity` (invoice/expense/pembayaran/journal), `entity_id`, `before` jsonb, `after` jsonb, `changed_fields` text[], `reason`, `ip`, `created_at`.
- Helper server `logFinAudit(ctx, …)` dipanggil di setiap mutator di `finance-tx.functions.ts`.
- Void wajib `reason` (form modal — sudah ada field `void_reason` di invoice, perluas ke expense + pembayaran).
- UI `/finance/audit` diganti: baca dari `fin_audit_log`, filter actor/entity/action/tanggal, diff `before` vs `after` ditampilkan inline (badge field berubah).
- RLS: hanya `super_admin`, `finance_manager`, `accounting` boleh SELECT; semua user authenticated boleh INSERT lewat server fn (yang sudah pasti dipanggil dari handler bermiddleware).

### 4. Laporan Manajemen
Server fn `getProfitLoss`, `getTrialBalance`, `getCashFlow` — semua agregasi langsung dari `fin_journal_line` + `fin_coa.type`.

- **Laba Rugi** (`/finance/laba-rugi` — sudah ada, refactor pakai data nyata): Pendapatan − HPP − Beban Operasional = Laba, group per COA, periode bebas.
- **Neraca Saldo** (`/finance/buku-besar` tambah tab atau halaman baru `/finance/neraca-saldo`): semua COA dengan total Debit & Kredit s/d tanggal, harus balance.
- **Arus Kas** (`/finance/arus-kas` — sudah ada, refactor): metode langsung — kumpulkan jurnal yang menyentuh COA kas/bank (1100, 1110, dst), klasifikasi Operasi/Investasi/Pendanaan via flag di `fin_coa` (tambah kolom `cash_flow_section`).
- Komponen bersama `<ReportExportBar>` (CSV + PDF via `jspdf` yang sudah dipakai `exporter.ts`) — semua laporan punya filter tanggal (sudah ada `FinanceDateContext`) dan tombol ekspor.

---

### Teknis singkat
- Migrasi tunggal: `fin_template_invoice`, `fin_template_invoice_item`, `fin_template_voucher`, `fin_template_voucher_item`, `fin_mdr_rule`, `fin_bank_statement`, `fin_reconciliation`, `fin_audit_log`, kolom baru `fin_coa.cash_flow_section`, kolom `void_reason` di `fin_expense` & `fin_pembayaran`. Semua + GRANT + RLS (write = role finance, read = role finance).
- Server fn baru: `src/lib/finance-template.functions.ts`, `finance-recon.functions.ts`, `finance-report.functions.ts`, plus helper audit di file existing `finance-tx.functions.ts`.
- Pembayaran non-tunai otomatis pakai `fin_mdr_rule` (kalau ada) → jurnal MDR ikut diposting di transaksi yang sama.
- Tidak menyentuh `_authenticated/route.tsx`, `client.ts`, `types.ts`, atau auth-middleware files.

### Yang TIDAK termasuk
- Bank feed otomatis (Open Banking) — hanya import manual CSV.
- Multi-currency.
- Closing period / lock periode.

Lanjut implementasi setelah Anda setujui.