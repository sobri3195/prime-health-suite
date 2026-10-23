# Gambaran Sistem

Prime Health Suite adalah aplikasi web untuk operasional klinik mata, keuangan,
dan layanan pendukung pasien. Repositori ini memuat frontend, server functions,
integrasi Supabase, migrasi database, serta pengujian dalam satu proyek.

## Area produk

| Area       | Cakupan yang terlihat di repositori                                     |
| ---------- | ----------------------------------------------------------------------- |
| SIM Klinik | Pendaftaran, pasien, jadwal dokter, rekam medis, resep, billing         |
| Finance    | Master data, transaksi, pendapatan, rekonsiliasi, jurnal, laporan, aset |
| Apps       | Portal pasien, konten, bantuan, percakapan, privasi, toko               |
| Pendukung  | HR, payroll, diklat, audit, ekspor CSV/PDF                              |

Daftar tersebut menunjukkan keberadaan kode, bukan jaminan setiap alur sudah
terverifikasi di produksi. Periksa implementasi dan hasil uji untuk fitur tertentu.

## Teknologi

- React 19 dan TypeScript dengan pemeriksaan `strict`.
- TanStack Start untuk server functions dan rendering; TanStack Router untuk
  routing berbasis berkas; React Query untuk pengelolaan data asinkron.
- Vite 7, Tailwind CSS 4, Radix UI, dan komponen UI yang tersedia di repositori.
- Supabase untuk autentikasi dan akses database; SQL berada di `supabase/migrations/`.
- Bun 1.2.23 sesuai `packageManager`; Python Playwright untuk E2E.

## Akses dan lingkungan

Route publik mencakup beranda dan halaman produk. Area klinik, finance, dan apps
memiliki alur login dan role masing-masing. Baca implementasi server untuk
menentukan izin sebenarnya; sesi UI tidak cukup untuk mengotorisasi akses data.

Pengembangan membutuhkan konfigurasi Supabase. Build, browser, dan handler server
dapat membaca variabel pada waktu berbeda; lihat [deployment](19-deployment.md).
Gunakan data sintetis dan database uji untuk pengembangan alur yang menulis data.
