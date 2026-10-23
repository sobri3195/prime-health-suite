# E2E Playwright Tests

Regression suite covering SIM Klinik registrasi flow & dokter list access.

## Scripts

- `google_oauth_smoke.py` — Verifikasi tombol Google pada ketiga sistem, callback
  sukses, pembatalan, dan sesi tidak tersedia. Request eksternal diintercept;
  tidak memerlukan akun Google/demo dan tidak menulis ke database. Jalankan
  tersendiri dengan `python3 tests/e2e/google_oauth_smoke.py` setelah dev server
  aktif; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` dapat menunjuk browser Chromium lokal.

- `sim_reg_happy.py` — Login demo, buat pasien baru, pilih dokter, submit booking.
- `sim_reg_empty.py` — Intercept `listDokter` → `[]`, verifikasi banner "Daftar dokter kosong" & tombol disabled.
- `sim_reg_denied.py` — Abort `listDokter`, verifikasi banner "Akses ditolak" & alur dihentikan.
- `sim_reg_persist.py` — Submit booking, reload halaman, verifikasi dokter sama masih dipilih.

## Run locally

```bash
npm run dev &           # http://localhost:8080
python3 -m pip install playwright && python3 -m playwright install --with-deps chromium
python3 tests/e2e/run_all.py
```

## CI

Berjalan otomatis via `.github/workflows/e2e.yml` pada setiap push / PR ke `main`.
Memerlukan repo secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Akun demo (`demo@prime.id` / `demo1234`) harus sudah ada di database (di-seed via migration).
