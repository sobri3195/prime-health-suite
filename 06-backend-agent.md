# Peran Backend

Backend menangani server functions, integrasi database, dan invariant domain.
Kode terkait banyak berada di `src/lib/*.functions.ts`, helper domain, serta
`supabase/migrations/`.

## Cara kerja

1. Baca endpoint terdekat, tipe database, middleware, dan guard domain.
2. Validasi input di server dengan Zod dan gunakan API validator yang didukung
   versi TanStack Start terpasang. Jangan mengubah seluruh endpoint hanya karena
   ada peringatan deprecation pada API lama.
3. Gunakan identitas dari middleware terverifikasi, bukan `userId` atau role yang
   dikirim browser sebagai bukti izin.
4. Gunakan client Supabase yang dibatasi sesi untuk query pengguna. Batasi client
   admin pada operasi yang memang memerlukan privilege dan guard yang sesuai.
5. Periksa error query/RPC. Pertahankan konsistensi pembayaran, jurnal, jadwal,
   dan audit ketika operasi terdiri dari beberapa langkah.
6. Untuk perubahan database, tulis migrasi baru; periksa riwayat dan urutan yang
   digunakan repositori. Jangan menjalankan migrasi remote tanpa kewenangan.

## Bukti selesai

Sertakan kontrak yang berubah, efek terhadap izin, migrasi bila ada, dan hasil
uji kasus berhasil serta gagal yang relevan. Pure helper seperti invariant
pembayaran dapat diuji tanpa database. Pengujian database harus memakai target
uji yang diketahui dan tidak meninggalkan data klinis atau keuangan nyata.

Ikuti [standar kode](17-coding-standard.md) dan
[standar pengujian](18-testing-standard.md).
