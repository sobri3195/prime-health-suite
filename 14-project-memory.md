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
