# Memori Proyek

Dokumen ini menyimpan fakta dan keputusan yang dapat ditelusuri. Riwayat di sini
bukan status runtime langsung. Verifikasi ulang ketika kode, konfigurasi, atau
penyedia layanan berubah. Jangan simpan secret atau data pengguna.

## Fakta terverifikasi pada sesi pengembangan

| Catatan                                                                 | Bukti / batas                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Stack React 19, TanStack Start, Vite 7, Supabase                        | `package.json`, `vite.config.ts`, integrasi di `src/`                              |
| Tool paket Bun 1.2.23                                                   | Field `packageManager`                                                             |
| Start dipin ke 1.168.60 dan Router ke 1.170.41                          | Commit `3225d66`; `package.json` dan `bun.lock`                                    |
| Perbaikan tersebut menjawab blok XSS CVE-2026-102989 dari Vercel        | Log deployment yang diberikan pengguna; minimum versi yang diminta 1.168.60        |
| Instalasi frozen dan production build untuk perbaikan tersebut berhasil | Perintah dijalankan pada sesi perbaikan; bukan jaminan build commit mendatang      |
| Vercel menyatakan deployment commit `3225d66` selesai                   | Status commit GitHub dari integrasi Vercel; bukan pengujian seluruh fitur produksi |

## Temuan yang belum diselesaikan dalam sesi tersebut

- Unit test: 36 lulus, 1 gagal pada `payment: reject invalid total` di
  `tests/unit/klinik-invariants.test.ts`. Ekspektasi `Total invoice` menerima
  `Invoice sudah lunas`; telusuri urutan validasi `computePaymentStatus`.
- Strict i18n lint melaporkan 87 kandidat teks hardcoded pada pemeriksaan awal.
  Jumlah ini merupakan observasi historis, bukan target yang boleh diabaikan.
- Workflow E2E pada commit `3225d66` berhenti sebelum tes karena tiga GitHub
  Secrets `VITE_SUPABASE_*` yang diwajibkan belum tersedia. Ketersediaan `.env`
  lokal tidak membuktikan secret GitHub terpasang.
- Akses registry sempat diblokir proxy saat onboarding awal; instalasi pada sesi
  perbaikan berikutnya berhasil. Jangan menganggap blocker awal masih aktif.

## Keputusan kerja

- Pembaruan berikutnya menggunakan branch dan PR sesuai permintaan pengguna.
- Panduan peran berada pada dokumen bernomor di root. Panduan ini tidak menambahkan
  orkestrator atau agent runtime.

## Investigasi Google OAuth pada Vercel

- Kedua form login semula menggunakan broker relatif `/~oauth/initiate` yang
  disediakan hosting Lovable. Perbaikan memakai OAuth Supabase untuk host lain
  dan mempertahankan broker pada domain Lovable.
- Callback aplikasi memakai route `/login` dengan parameter `oauth=google`,
  `system`, dan redirect internal tervalidasi. Sesi diperiksa sebelum navigasi;
  guard role yang ada tetap menentukan akses klinik dan finance.
- Pemeriksaan layanan Auth menemukan Google ditandai aktif, tetapi endpoint
  authorize mengembalikan HTTP 400 `Unsupported provider: missing OAuth secret`.
  Broker Lovable juga menolak callback Vercel dengan `redirect_uri is not allowed`.
  Konfigurasi provider serta allowlist redirect memerlukan tindakan pengelola
  Auth; jangan menyimpan client secret di kode atau percakapan.
- Validasi lokal perbaikan: build produksi berhasil; tujuh unit test OAuth dan
  tujuh skenario browser dengan layanan eksternal diintercept lulus. Suite unit
  keseluruhan menghasilkan 43 lulus dan satu kegagalan invoice yang sudah ada.
  Empat diagnostik TypeScript cocok persis dengan pemeriksaan baseline `main`.
  Ini bukan bukti login Google langsung ke layanan produksi telah berhasil.
- URL preview yang dilaporkan pengguna dilindungi Vercel Authentication saat
  diperiksa. Akses Vercel merupakan lapisan berbeda dari login pengguna aplikasi.

## Akses demo bersama

- Identitas demo kasir yang sudah ada berhasil diautentikasi melalui Auth.
  Pemeriksaan RPC terverifikasi: `klinik_is_staff=true`, `fin_can_view=true`,
  `fin_can_edit=false`. Tidak ada account atau role baru yang dibuat pada sesi ini.
- Ketiga form serta chooser memakai identitas dari `src/lib/demo-account.ts`.
  Demo login tidak melakukan sign-up atau menambahkan role ketika gagal.
- Kontrol demo aktif saat development dan dapat diaktifkan pada build deployment
  demo dengan `VITE_ENABLE_DEMO_LOGIN=true`; default produksi menyembunyikannya.
  Flag tampilan tidak menggantikan pemeriksaan role pada server atau RLS.

## Format catatan baru

```text
Tanggal (sertakan zona waktu) / commit:
Kategori: fakta | keputusan | hipotesis | blocker
Konteks:
Keputusan atau hasil:
Bukti dan batas validasi:
Tindak lanjut / status:
```

Tandai catatan yang digantikan keputusan baru; pertahankan konteks yang masih
berguna. Tulis hipotesis sebagai hipotesis sampai dibuktikan.
