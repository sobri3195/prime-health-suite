# Audit Modul Apps (Portal Pasien)

Catatan: URL `https://prime-simon.vercel.app/apps` mengembalikan 404 — prime-simon **tidak mengekspos modul Apps** publik. Baseline "cocokkan 100%" tidak berlaku untuk modul ini; audit murni internal.

---

## Batch A1 — P0 (Blocker / Data Risk)

Tujuan: hentikan kebocoran UI/data operator ke akun pasien dan buang mock data.

1. **Role-gate section Apps** di `src/routes/_authenticated.apps.$section.tsx`:
   - Pisahkan `PATIENT_SECTIONS` vs `STAFF_SECTIONS` (staff = notifications, helpdesk, documents, users, integration, audit-log, launcher).
   - Tambahkan `beforeLoad` yang membaca `context.auth` (role): pasien murni (tanpa role staff) → `throw notFound()` untuk staff sections.
   - Konsekuensi UX: sidebar/menu pasien juga harus tidak menampilkan link staff (`src/lib/nav-config.ts` — verifikasi).

2. **Hapus mock in-memory audit & sync log** (`src/lib/audit-log.ts`, `src/lib/sync-log.ts`).
   - Audit Log: baca dari `apps_audit_log` + `clinic_audit_log` + `fin_audit_log` via server function baru `listCombinedAudit` (role-gated: super_admin/admin_klinik/manajemen).
   - Integration/Sync Log: pakai `app_health_check()` RPC yang sudah ada + tabel event nyata; buang seed palsu (`admin@klinikmata.id` dsb).

3. **Guard `app_health_check` RPC** di frontend: hanya panggil dari komponen staff (Integration / AI Insight), bukan dari komponen yang bisa dijangkau pasien. Pindahkan `AIInsightPanel` (saat ini dead code) ke halaman staff atau hapus.

4. **Verifikasi RLS lintas-pasien** untuk `apps_notif`, `apps_ticket`, `clinic_document`:
   - Konfirmasi policy SELECT scoped ke `auth.uid()` untuk role pasien.
   - Kalau belum, tambahkan migrasi RESTRICTIVE policy.

---

## Batch A2 — P1 (Fitur utama)

**Booking**
- Cancel booking dengan alasan (enum: jadwal_bentrok, kondisi_membaik, biaya, lainnya) + field `cancel_reason` di `apps_booking`.
- Estimasi tunggu dinamis: RPC `apps_avg_service_minutes(dokter_id, tanggal)` menggantikan konstanta 15 menit.
- Konfirmasi UNIQUE index `(dokter_id, tanggal, jam_slot)` untuk cegah race reschedule.

**Edukasi**
- Filter kategori + search server-side.
- Pagination / "muat lagi".
- Tombol Share (WhatsApp/Copy Link) + rating 1–5 (tabel `apps_artikel_rating`).

**Belanja**
- Nomor rekening dinamis dari `fin_coa` (kas/bank aktif) di halaman checkout transfer.
- Field tracking (kurir, no_resi) di `apps_order` + tampilan di `OrderTimeline`.
- URL-state filter kategori & search di list produk.

**Notifikasi**
- Rapikan duplikasi: hapus `/apps/notifications` (operator-view) dari section pasien; pertahankan hanya `/apps/notifikasi` (`NotificationsPagePatient`).
- Realtime channel dengan filter `user_id=eq.<uid>` (bukan tabel penuh) untuk cegah storm.

**Profil**
- Re-auth (`signInWithPassword`) sebelum ganti password.
- Validasi format BPJS (13 digit) & NIK (16 digit).

**Chat**
- Upload lampiran (bucket `apps-mata`) + read receipt.

**Reward / Leaderboard**
- Tab periode leaderboard (mingguan/bulanan/all-time).
- Tampilkan expiry voucher redeem.

**Privacy**
- Toggle revoke consent marketing (UU PDP).

**Auth**
- Server-side enforcement password strength (min 8, mixed) sebelum `signUp`.

---

## Batch A3 — P2 (UX / Konsistensi)

1. `LauncherPage` — tarik dari config berbasis role, bukan seed statis; sembunyikan menu app yang user tidak punya akses.
2. `DocumentsPage` — ganti EmptyState "Memuat…" dengan `SkeletonList` (a11y).
3. i18n hardcoded strings di `patient.tsx` (Reset, IGD banner, "Rujuk ke Booking Dokter (segera)", "Chat FO") → pindah ke `useI18n`.
4. Pagination `listMyInvoices` di `PatientLaporan` (tombol "muat lagi").
5. URL-state filter belanja & booking (persist saat refresh).

---

## Batch A4 — Polish

1. Tap-target min 44×44 untuk icon buttons di notif & cart qty.
2. Sanitasi `deep_link` di NotificationsPagePatient — hanya izinkan path internal (`/apps/**`).
3. Watermark + no_rm pada PDF resep.
4. `apps_reward` — tampilkan sisa stok & expiry di card reward.
5. Skeleton konsisten pakai `TableSkeleton`/`SkeletonList` di semua halaman apps.
6. Empty state visual (illustration) untuk halaman utama (Beranda, Belanja kosong, Notifikasi kosong).

---

## Setelah Apps selesai
Lanjut ke SIM Klinik (audit + batch), lalu Finance.
