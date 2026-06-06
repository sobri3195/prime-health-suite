## Goal
Bring `/finance` (Prime Simon) to feature-parity with prime-simon.vercel.app. The reference site is a single-page SPA — all sections render on `/`; deep URLs return 404 — so the structure is one mega-dashboard with a grouped collapsible sidebar.

## Scope to add

### 1. Sidebar restructure (grouped, collapsible)
Replace the flat finance nav with grouped sections matching prime-simon:
- **Dashboard** — Overview Finance
- **Master Data** — Profil Klinik, Dokter, Karyawan, Vendor, Payer/Asuransi, COA, Cost Center, Tarif Pajak, Kategori Layanan
- **Pendapatan** — Input Pendapatan Harian, Detail Pendapatan, Ranking Dokter, Report Highlight, Pendapatan Kasir Harian, Kartu Debit/Kredit
- **Dokter & Honor** — Input Jasa Medis, Rekap Jasa Medis Dokter, Potongan Jasa Dokter
- **Pengeluaran, Pajak, Bank, Voucher, Jurnal, Buku Besar, Laporan** (already exist — regroup)

Implement via `NAV` config change + `AppShell` rendering collapsible groups for `system === "finance"`.

### 2. Dashboard polish (already done in last turn — keep)
Already mirrors prime-simon hero, KPI cards, Quick Actions, Pendapatan by Payer, Top Dokter, Saldo Bank, Alert, AI Insight.

Add the missing dashboard widgets from the reference:
- **AR Aging** bar chart (current / 30 / 60 / 90+)
- **AP Aging** bar chart
- **Recent Activities** list (RC-xxx receipts + KEU vouchers)
- **Finance Alerts** trio (piutang jatuh tempo, hutang jatuh tempo, belum rekonsiliasi)
- **Bandingkan Periode** chip selector on Pendapatan by Payer

### 3. New Master Data pages (mock CRUD, CSV export)
- `/finance/master/profil-klinik` — single profile form
- `/finance/master/dokter`, `/karyawan`, `/vendor`, `/payer`, `/coa`, `/cost-center`, `/tarif-pajak`, `/kategori-layanan` — list + add/edit modal + delete + CSV export

### 4. Pendapatan module expansion
- `/finance/pendapatan/input-harian` — daily revenue entry form (date, kasir, payer, items, total) → push to invoices state
- `/finance/pendapatan/detail` — invoice line detail with filters/export (rename existing list)
- `/finance/pendapatan/ranking-dokter` — dokter ranking with payer filter + bar chart
- `/finance/pendapatan/report-highlight` — period highlights (top day, top dokter, top payer)
- `/finance/pendapatan/kasir-harian` — kasir daily recap
- `/finance/pendapatan/kartu` — debit/credit card transactions log

### 5. Dokter & Honor module (new)
- `/finance/honor/input` — input jasa medis per kunjungan
- `/finance/honor/rekap` — rekap per dokter (period filter, export)
- `/finance/honor/potongan` — potongan/pajak jasa dokter

### 6. Shared infrastructure
- Add `src/data/financeExtra.ts` for kasir, kartu, jasa-medis mock data
- Add `src/lib/aging.ts` for AR/AP aging buckets
- Reuse existing `applyFilter`, `formatIDR`, `exportCsv`
- All actions remain mock (toast + in-memory)

## Technical notes
- All new routes under `src/routes/_authenticated.finance.<group>.<page>.tsx`
- Sidebar groups implemented in `AppShell` via a `group` field added to `NavItem`, rendered with chevron-toggle sections, persisted in `useState`
- No backend; CSV export uses existing helper
- All buttons have toast handlers
- Build-safe for Vercel

## Estimated additions
~20 new route files + 1 sidebar refactor + 2 data files + AR/AP/Activities/Alerts widgets on dashboard.

## Out of scope
- Real persistence (still mock state, resets on refresh — same as prime-simon)
- Authentication/RBAC changes
- Touching `/sim-klinik` or `/apps`

Confirm to proceed and I'll implement in one pass.
