# Deployment

Repositori memakai Vite dan TanStack Start dengan konfigurasi Lovable serta
Nitro. Integrasi GitHub–Vercel telah melaporkan deployment berhasil untuk commit
`3225d66`. Ini membuktikan rilis tersebut selesai, bukan status deployment
mendatang atau verifikasi seluruh alur aplikasi.

## Konfigurasi

| Variabel                        | Penggunaan                                         |
| ------------------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`             | URL publik untuk client browser saat build         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Key publishable untuk browser; bukan service role  |
| `VITE_SUPABASE_PROJECT_ID`      | Identitas proyek; diwajibkan validasi workflow E2E |
| `SUPABASE_URL`                  | URL untuk handler server                           |
| `SUPABASE_PUBLISHABLE_KEY`      | Client autentikasi server yang dibatasi sesi       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Operasi server berprivilege yang memakainya        |

Sediakan binding melalui pengaturan penyedia dan bedakan preview, produksi,
cloud pengembangan, serta GitHub Actions. Kehadiran variabel lokal tidak
menyediakannya pada layanan lain. Jangan menaruh service-role key dalam `VITE_*`
atau Git. Audit pola konfigurasi `.env` yang sudah ada sebelum menambahkan file;
jangan menyalin nilainya ke PR atau dokumentasi.

## Persiapan dan rilis

1. Pilih commit yang ditinjau dan periksa diff dependensi beserta lockfile.
2. Jalankan instalasi frozen, pemeriksaan relevan, dan `bun run build`. Laporkan
   kegagalan yang belum selesai; lint tidak dapat menggantikan build.
3. Periksa target dan output Nitro. Konfigurasi wrapper memiliki default
   Cloudflare; jangan menganggap artefak `_worker.js` otomatis menjadi fungsi
   Vercel. Pastikan penyedia mendeteksi preset dan artefak yang benar.
4. Untuk integrasi Git, merge ke branch produksi yang dikonfigurasi setelah review
   dan otorisasi. Periksa pengaturan proyek; jangan menganggap setiap push produksi.
5. Pantau deployment penyedia hingga status akhir, cocokkan SHA, dan simpan URL
   dari respons penyedia. Jangan menebak domain deployment.
6. Setelah rilis, periksa beranda, halaman login, dan operasi baca yang representatif
   dengan akun uji yang sesuai. Jangan membuat data pasien nyata sebagai smoke test.

## Pemeriksaan status dari GitHub

Jika akses API tersedia, status integrasi dapat dibaca tanpa memicu rilis baru:

```bash
gh api repos/sobri3195/prime-health-suite/commits/<sha>/status
gh run list --commit <sha>
```

Status Vercel, workflow E2E, dan respons aplikasi adalah bukti yang berbeda.
E2E yang terblokir secret tidak membuktikan build Vercel gagal.

## Blok dependensi dan rollback

Blok CVE-2026-102989 pada Start 1.167.50 diperbaiki dengan pin Start 1.168.60,
Router 1.170.41, dan pembaruan lockfile pada commit `3225d66`. Jangan memakai
`DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS` untuk melewati blok. Untuk
pembaruan berikutnya, verifikasi advisory, kompatibilitas peer, dan build kembali.

Jika rilis bermasalah, catat SHA dan gejalanya. Gunakan rollback penyedia atau
revert yang ditinjau sesuai kewenangan; jangan kembali ke versi rentan tanpa
menilai risikonya. Rollback aplikasi tidak membatalkan perubahan database.
Migrasi memerlukan rencana kompatibilitas dan pemulihan tersendiri.
