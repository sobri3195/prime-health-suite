# SIM Klinik Mata — Backend, RBAC, Exports, Audit

Scope is large; splitting into 4 milestones so each can ship and be reviewed independently. After your "go" I execute M1→M4 in order.

## M1 — Backend wiring + Skeleton/EmptyState (Laporan, Dokumen, Audit, Settings)

New tables (migration, with RLS + grants):
- `clinic_document` — id, patient_code, patient_name, doc_type, title, mime, size_bytes, storage_path, uploaded_by, uploaded_at
- `clinic_audit_log` — id, ts, actor_email, actor_role, module, action, target, meta jsonb, ip
- `clinic_setting` — singleton row (key/value jsonb) for klinik profile, notif, security, integrations

Server functions (`src/lib/clinic-*.functions.ts`) using `requireSupabaseAuth`:
- `listDocuments({ q, type, from, to })`, `uploadDocument`, `deleteDocument`
- `listAudit({ q, action, module, actor, from, to, limit })`, `appendAudit(entry)`
- `getSettings`, `saveSettings`
- `getLaporan({ kind: "kunjungan"|"tindakan"|"payer"|"pendapatan", from, to })` — aggregates over `fin_invoice` + `apps_booking`

Route updates:
- `laporan/dokumen/audit/settings.tsx` use `useSuspenseQuery` + `queryOptions` (per `tanstack-query-integration`)
- Loaders prime cache via `ensureQueryData`
- `<Skeleton />` rows + `<EmptyState />` reused from `apps/ui.tsx`

## M2 — RBAC for SIM Klinik

- Add `app_role` enum + `user_roles` table + `has_role()` security-definer (per platform `<user-roles>` rules). Roles: `super_admin`, `dokter`, `perawat`, `kasir`, `pasien`.
- `src/lib/rbac.ts` — `useRole()`, `requireRole(['super_admin'])`
- `src/lib/nav-config.ts` — each NavItem gains `roles?: AppRole[]` and `status?: "ready"|"coming_soon"`
- `AppShell` sidebar filters items by role; "coming soon" items render as disabled with a lock badge
- `_authenticated/sim-klinik/route.tsx` — `beforeLoad` redirects non-super-admin to `/sim-klinik/forbidden`
- Server fns also enforce role (defense in depth)

## M3 — Unified CSV/PDF export with date range

- `src/lib/exporter.ts` — `exportCsv(filename, columns, rows, range)` and `exportPdf(...)` using `jspdf` + `jspdf-autotable` (already in deps if present, else `bun add`)
- Shared `<ExportBar>` component (range picker + CSV/PDF buttons) used in Laporan, Audit, Billing
- Column schema per report so headers are stable and human-readable; date range filter actually applied to query

## M4 — Automatic audit logging on key actions

`appendAudit()` server fn called from:
- Pasien: create/update/delete
- Registrasi & Kunjungan: create/check-in/complete
- Tindakan: create/edit
- Billing: create/issue/sendToFinance/paid
- Dokumen: upload/delete
- Settings: save

Each entry stores `{ module, action, target, meta }`. Audit page filters: `user`, `module`, `action`, date range (uses M3 range picker).

---

**Confirm to proceed with M1**, or tell me to reorder / drop a milestone.
Notes:
- Existing mock helpers (`addAudit`, `addSync`) get thin shims that also call the server `appendAudit` so old call sites keep working.
- `fin_dokter` and `fin_invoice` are reused for Laporan aggregates — no duplication.
