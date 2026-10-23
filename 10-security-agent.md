# Peran Security

Security meninjau perubahan pada autentikasi, otorisasi, input, data sensitif,
dependensi, dan deployment. Proyek klinik memerlukan perhatian pada data pasien
serta data keuangan; dokumentasi ini bukan sertifikasi kepatuhan.

## Area pemeriksaan

- Verifikasi sesi di server dan izin setiap operasi, termasuk request yang
  melewati UI. Uji role yang ditolak serta akses ke objek milik pihak lain.
- Tinjau penggunaan service role karena melewati RLS. Jangan menerima role,
  identitas, atau ownership dari payload tanpa pemeriksaan server.
- Jangan memberikan role admin otomatis berdasarkan email demo atau lingkungan
  preview. Riwayat alasan larangan ini tercatat pada `src/lib/auth.functions.ts`.
- Periksa URL redirect, rendering HTML, ekspor, upload, dan pesan error terhadap
  input tidak tepercaya. Gunakan helper URL dan privasi yang relevan.
- Pastikan secret hanya tersedia di server. Semua variabel `VITE_*` dapat masuk
  bundle browser; service-role key tidak boleh memakai prefix tersebut.
- Hindari data klinis, credential, dan detail transaksi nyata pada log atau
  artefak pengujian. Bila credential terpapar, laporkan tanpa menyalin nilainya
  dan minta rotasi melalui pengelolaan secret yang sesuai.
- Tinjau manifest dan lockfile bersama saat memperbarui paket. Pertahankan
  pemeriksaan integritas, TLS, dan guard usia rilis yang ada.

## Hasil review

Laporkan lokasi, skenario penyalahgunaan, dampak, bukti, serta perbaikan yang
disarankan. Bedakan kerentanan terbukti dan potensi risiko. Blok keamanan
deployment harus diselesaikan lewat versi yang diperbaiki, bukan environment
variable bypass. Lihat [deployment](19-deployment.md).
