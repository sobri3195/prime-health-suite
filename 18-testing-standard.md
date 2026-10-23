# Standar Pengujian

Jalankan dari root repositori. Gunakan Bun 1.2.23 sesuai manifest dan versi Node
yang kompatibel dengan Vite 7. Pilih pemeriksaan yang membuktikan perubahan;
dokumentasi saja cukup diperiksa format, tautan, dan kesesuaian dengan kode.

## Pemeriksaan kode

```bash
bun install --frozen-lockfile
bun test tests/unit
bun run lint
bun run lint:i18n:strict
bunx --no-install tsc --noEmit
bun run build
```

`bun run ci` menjalankan lint, strict i18n, lalu build secara berurutan dan berhenti
pada kegagalan pertama. Script tersebut tidak menjalankan unit test, type check
terpisah, atau E2E. Non-strict `lint:i18n` dapat keluar dengan status nol sambil
melaporkan temuan; itu bukan bukti seluruh teks telah diterjemahkan.

## E2E browser

Runner dan petunjuk dasar ada di [tests/e2e/README.md](tests/e2e/README.md).
Siapkan environment Python terpisah dan browser bila belum tersedia:

```bash
python3 -m venv /tmp/prime-health-e2e
/tmp/prime-health-e2e/bin/python -m pip install playwright
/tmp/prime-health-e2e/bin/python -m playwright install --with-deps chromium
```

Mulai server di terminal terpisah dengan `bun run dev -- --port 8080`.
Periksa respons HTML dan isi halaman, lalu jalankan:

```bash
/tmp/prime-health-e2e/bin/python tests/e2e/run_all.py
# Contoh subset; pastikan nama cocok dan tes benar-benar dieksekusi.
E2E_ONLY=sim_reg_empty.py E2E_RETRIES=0 /tmp/prime-health-e2e/bin/python tests/e2e/run_all.py
```

Suite memakai login demo dan beberapa skenario membuat pasien/booking. Jalankan
hanya terhadap database uji dengan seed yang sesuai, bukan database produksi
tanpa kewenangan. Prasyarat CI: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, dan `VITE_SUPABASE_PROJECT_ID` pada GitHub Secrets.
Secret server tetap harus disediakan bila handler yang diuji membutuhkannya.

## Pelaporan dan regresi

Catat commit, perintah, jumlah tes, exit code, dan hasil. Pisahkan gagal, dilewati,
terblokir, serta belum dijalankan. Runner menyimpan log di `tests/e2e/logs/`;
jangan commit log atau screenshot berisi data pengguna. Periksa bahwa artefak
berasal dari run saat ini. Diagnosis kegagalan lama tetap diperlukan, tetapi
jangan mengubah assertion agar bug terlihat lolos. Observasi historis ada pada
[memori proyek](14-project-memory.md).
