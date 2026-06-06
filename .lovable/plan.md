# P0 Prime Apps — Patient Portal Real Backend

Mengubah Prime Apps dari mock → portal pasien nyata dengan auth Supabase, database pasien, flow booking, dan data riwayat dari `fin_invoice` (sumber kebenaran transaksi yang sudah ada).

## Strategi auth (penting)

Sistem saat ini punya `useAuth` mock berbasis `sessionStorage` yang dipakai oleh **tiga** sistem (Apps, SIM Klinik, Finance). Mengganti seluruhnya akan merusak SIM Klinik & Finance. Solusi:

- **`/apps/*`** → pakai **Supabase Auth nyata** (email+password + Google). Pasien.
- **`/sim-klinik/*`** dan **`/finance/*`** → tetap pakai mock role-picker yang ada (staf internal — out of scope P0 ini).
- Login `/apps/login` di-rewrite jadi form Supabase. Gate `_authenticated/apps/*` cek session Supabase, bukan mock `useAuth`.

## Database baru

Tiga tabel pasien dengan RLS `auth.uid() = user_id`:

- **`apps_pasien`** — profil pasien (linked ke `auth.users`): nama, tgl_lahir, jenis_kelamin, telp, alamat, no_bpjs, alergi, kontak_darurat. Auto-created via trigger saat signup.
- **`apps_booking`** — booking pemeriksaan: tanggal, jam_slot, dokter_id (FK `fin_dokter`), keluhan, status (pending/confirmed/checked_in/done/cancelled), no_antrean (di-generate saat checked_in).
- **`apps_ai_history`** — riwayat hasil Cek AI Mata per pasien (opsional, ringan).

**Riwayat & resep** tidak butuh tabel baru — dibaca dari `fin_invoice` + `fin_invoice_item` yang sudah ada, di-filter `patient_code = profil.patient_code`. `fin_invoice` ditambah kolom `apps_user_id uuid` (nullable) untuk match cepat ke pasien.

## Server functions baru (`src/lib/apps-patient.functions.ts`)

Semua pakai `requireSupabaseAuth` middleware:

- `getMyProfile()` — profil pasien current user.
- `updateMyProfile(data)` — update profil.
- `listMyBookings()` — list booking saya (urut DESC tanggal).
- `createBooking({dokter_id, tanggal, jam_slot, keluhan})` — buat booking baru, status=pending.
- `cancelBooking({id})` — pasien batalkan booking miliknya.
- `getMyQueueToday()` — antrean aktif hari ini (status checked_in).
- `listMyInvoices()` — invoice/resep dari `fin_invoice` (filter `apps_user_id = auth.uid()` atau via `patient_code`).
- `listDoctorsForBooking()` — list `fin_dokter` aktif (read-only, untuk pilih dokter).
- `listAvailableSlots({dokter_id, tanggal})` — slot 09:00–17:00 per 30 menit, kurangi yang sudah dibooking.

## UI changes

1. **`/apps/login`** — rewrite jadi form Supabase: tab Login/Signup, email+password, tombol Google OAuth, link "Lupa password". Hapus role picker.
2. **`/reset-password`** — page baru (public) untuk update password recovery flow.
3. **`_authenticated/apps.tsx`** — ganti gate dari `useAuth` mock ke check `supabase.auth.getUser()`. Tetap pakai `AppShell`.
4. **`PatientBeranda`** — ganti data mock:
   - "Halo, {profil.nama}"
   - Antrean hari ini dari `getMyQueueToday()` (atau "Belum check-in" jika kosong)
   - Jadwal berikutnya dari `listMyBookings()` (upcoming terdekat)
   - Tombol "Booking Pemeriksaan" → Link ke `/apps/booking`
5. **`/apps/booking`** — page baru: step 1 pilih dokter (grid), step 2 pilih tanggal (7 hari kedepan), step 3 pilih slot, step 4 isi keluhan + konfirmasi. Submit → `createBooking()` → redirect ke Beranda + toast.
6. **`/apps/laporan`** (PatientLaporan) — refactor ke real data:
   - Tab "Riwayat Pemeriksaan" → `listMyInvoices()` (tanggal, dokter, layanan, total)
   - Tab "Resep" → invoice item yang mengandung kategori resep/kacamata
   - Empty state jika kosong
7. **`/apps/profil`** (PatientProfil) — form edit profil pasien dengan `updateMyProfile()`.
8. **Logout** — tombol sign out via `supabase.auth.signOut()` + clear router cache.

## File baru / diubah

**Baru:**
- `supabase/migrations/<ts>_apps_patient.sql` (tabel + RLS + trigger profil + grant)
- `src/lib/apps-patient.functions.ts`
- `src/routes/_authenticated.apps.booking.tsx`
- `src/routes/reset-password.tsx`
- `src/components/apps/booking.tsx`
- `src/components/apps/auth-form.tsx` (form Supabase reusable)

**Diubah:**
- `src/routes/apps.login.tsx` — rewrite ke Supabase form
- `src/routes/_authenticated.apps.tsx` — gate via Supabase
- `src/components/apps/patient.tsx` — Beranda + Laporan + Profil real data
- `src/routes/__root.tsx` — tambah `onAuthStateChange` filtered listener untuk Apps
- Auth: enable Google provider via `configure_social_auth`

## Out of scope (akan dibahas di fase berikut)

- Realtime antrean (postgres_changes) — masuk fase B
- Push notification, WA reminder — fase B
- Tabel `sim_*` untuk integrasi penuh dengan SIM Klinik — saat ini SIM Klinik juga masih mock, jadi sumber data klinis untuk pasien dibatasi ke `fin_invoice` dulu
- Belanja, Daily Wins gamifikasi — fase C
- PWA, accessibility audit — fase polish

## Konfirmasi yang dibutuhkan

1. Setuju **`/apps/*` pindah ke Supabase Auth**, sementara SIM Klinik & Finance tetap mock?
2. Email signup pasien: **auto-confirm** (langsung bisa login) atau **wajib verifikasi email** (default Supabase)? — Default rekomendasi: wajib verifikasi.
3. Enable **Google sign-in** untuk pasien? (rekomendasi: ya)
