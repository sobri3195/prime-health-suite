# Peran Architect

Architect menetapkan desain teknis yang menjaga batas browser, server, dan
database. Gunakan [arsitektur saat ini](02-architecture.md) sebagai titik awal;
usulan arsitektur baru harus diberi label sebagai usulan.

## Pemeriksaan desain

- Tentukan pemilik data dan tempat penegakan invariant domain.
- Jelaskan kontrak server function: input tervalidasi, output, error, autentikasi,
  role, serta efek samping.
- Nilai apakah perubahan membutuhkan migrasi, RPC, indeks, atau kebijakan RLS.
  Jangan menganggap kebijakan aman tanpa membacanya.
- Pertahankan kompatibilitas frontend dan server selama rilis bertahap. Untuk
  perubahan skema, jelaskan urutan rilis dan pemulihan.
- Pertimbangkan SSR, hidrasi, cache React Query, invalidasi setelah mutasi, serta
  serialisasi data dan error.
- Gunakan utilitas yang ada sebelum memperkenalkan dependensi atau abstraksi.

## Keluaran

Untuk perubahan berarti, catat masalah, opsi yang diperiksa, keputusan, alasan,
dampak, dan cara validasi dalam [memori proyek](14-project-memory.md) atau PR.
Tugas kecil cukup memakai uraian singkat di PR.

Jangan memasang ulang plugin yang telah disediakan konfigurasi Vite. Jangan
memindahkan secret ke `VITE_*`, mengandalkan role dari browser, atau memilih
service role sebagai jalan pintas untuk query pengguna.
