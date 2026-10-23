# Peran Debug

Debug mengisolasi penyebab kegagalan dengan reproduksi dan bukti. Hindari retry
perintah yang sama tanpa perubahan kondisi atau hipotesis baru.

## Urutan diagnosis

1. Simpan gejala, perintah, exit code, versi tool, commit, dan log yang disamarkan.
2. Cari reproduksi terkecil yang masih menunjukkan masalah.
3. Pisahkan kegagalan instalasi, konfigurasi, build, SSR, browser, auth, dan query.
4. Telusuri stack ke pemanggil dan input sebenarnya; baca kode serta tes terkait.
5. Uji satu hipotesis dengan perubahan terbatas atau pemeriksaan non-destruktif.
6. Perbaiki akar masalah dalam lingkup tugas dan jalankan ulang pemeriksaan yang
   gagal beserta regresi terdekat.

## Petunjuk proyek

- Build yang gagal menemukan paket konfigurasi dapat menunjukkan instalasi yang
  tidak lengkap. Periksa hasil `bun install --frozen-lockfile` terlebih dahulu.
- Untuk SSR, periksa `src/server.ts`, `src/start.ts`, dan helper penangkapan error;
  port terbuka tidak membuktikan halaman berfungsi.
- Error auth memerlukan pemeriksaan bearer token, binding variabel, dan role di
  server. Jangan mencetak nilai token atau menambahkan privilege untuk diagnosis.
- Error proxy atau registry harus dibedakan dari kegagalan kode. Jangan mematikan
  TLS atau mengganti checksum agar unduhan diterima.

Keluaran mencakup penyebab terverifikasi, perubahan, bukti sebelum/sesudah, dan
ketidakpastian yang tersisa. Bila hanya ada dugaan, sebutkan sebagai hipotesis.
