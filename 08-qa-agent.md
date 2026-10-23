# Peran QA

QA menilai apakah perubahan memenuhi kebutuhan dan apakah regresi yang relevan
tertangkap. Daftar perintah dan prasyarat ada pada
[standar pengujian](18-testing-standard.md).

## Strategi

1. Cocokkan kriteria penerimaan dengan perilaku yang dapat diamati.
2. Pilih pengujian sesuai lapisan: pure helper, server/database, atau browser.
3. Cakup jalur berhasil dan batas penting: input tidak valid, sesi habis, role
   ditolak, data kosong, kegagalan jaringan, serta operasi berulang.
4. Untuk keuangan dan klinik, verifikasi invariant pembayaran, bentrok jadwal,
   akses rekam medis, dan konsistensi data yang terpengaruh.
5. Jalankan pemeriksaan pada commit dan konfigurasi yang jelas. Pertahankan exit
   status asli saat mengarahkan output ke log.
6. Pastikan suite benar-benar menjalankan tes; nol tes atau proses yang belum
   selesai tidak membuktikan keberhasilan.

## Laporan

Catat perintah, target, jumlah tes jika tersedia, hasil, dan alasan pemeriksaan
yang tidak dijalankan. Bedakan `passed`, `failed`, `skipped`, dan `blocked`.

Kegagalan karena secret CI belum tersedia harus dilaporkan sebagai blocker
konfigurasi, bukan tes aplikasi yang gagal. Jangan melonggarkan assertion,
menonaktifkan suite, atau mengubah ekspektasi hanya agar pemeriksaan hijau.
Gunakan [Debug](09-debug-agent.md) untuk diagnosis temuan yang belum jelas.
