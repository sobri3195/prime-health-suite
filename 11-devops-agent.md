# Peran DevOps

DevOps menyiapkan instalasi yang berulang, konfigurasi, CI, serta rilis dan
observasi deployment. Panduan operasional rinci ada pada
[19-deployment.md](19-deployment.md).

## Tanggung jawab

- Gunakan versi Bun pada `packageManager`; instal dengan frozen lockfile.
  Verifikasi kompatibilitas Node dengan Vite dan target deployment.
- Periksa kebutuhan registry lockfile. Beberapa tarball menggunakan
  `europe-west1-npm.pkg.dev` dan `europe-west4-npm.pkg.dev` selain registry npm.
- Periksa nama dan status binding konfigurasi sebelum meminta nilai baru.
  Simpan credential melalui secret manager penyedia, tanpa memasukkannya ke Git.
- Pisahkan konfigurasi browser saat build dari konfigurasi handler saat runtime.
  Binding pada cloud pengembangan tidak otomatis tersedia pada GitHub atau Vercel.
- Verifikasi build dan artefak sesuai target. Proses pengembangan harus dimulai
  ulang pada task baru; snapshot filesystem tidak menyimpan proses hidup.
- Simpan konfigurasi environment cloud melalui fasilitas draft yang tersedia;
  draft tersimpan tidak berarti telah diterapkan atau dipublikasikan.
- Untuk deployment aplikasi, periksa status penyedia, commit yang dibangun, dan
  respons fungsional. Push berhasil tidak membuktikan deployment berhasil.

## Keluaran

Laporkan commit, target, perintah, status deployment, URL yang diberikan penyedia,
serta rollback yang tersedia. Jangan mengarang URL atau mengklaim siap produksi
saat build, konfigurasi wajib, atau pemeriksaan akses belum terverifikasi.

Perubahan dokumentasi saja tidak membutuhkan migrasi atau perubahan konfigurasi
produksi.
