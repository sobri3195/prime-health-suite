# Standar Penulisan Kode

## TypeScript dan organisasi

- Pertahankan `strict` dan gunakan tipe domain yang jelas. Validasi input eksternal
  sebelum memperlakukannya sebagai tipe internal.
- Gunakan alias `@/` untuk impor dari `src/` sesuai konfigurasi yang ada.
- Pisahkan pure helper dari efek samping agar invariant mudah diuji.
- Gunakan pola penamaan dan lokasi modul terdekat; hindari abstraksi baru tanpa
  penggunaan dan kebutuhan yang jelas.
- Jangan mengedit `src/routeTree.gen.ts` secara manual. Berkas integrasi yang
  ditandai generated harus diperbarui melalui alur pembuatnya bila tersedia.

## Browser dan server

Gunakan suffix `.server.ts` untuk kode khusus server serta batas impor TanStack
yang didukung. Jangan menambahkan paket `server-only` milik ekosistem lain.
Jangan mengimpor client admin ke komponen browser. Baca variabel server pada
waktu yang sesuai runtime; lihat `src/lib/config.server.ts`.

Validasi server tetap wajib meski form telah tervalidasi. Periksa error query,
hindari catch yang menyembunyikan kegagalan, dan gunakan helper penanganan error
proyek. Untuk perubahan akses, tinjau middleware dan RLS bersama.

## UI dan format

Ikuti [primitif UX](src/components/UX_PRIMITIVES.md), gunakan teks Indonesia dan
mekanisme i18n, serta pertahankan aksesibilitas. `.prettierrc` menetapkan lebar
100, semicolon, double quote, dan trailing comma.

```bash
# Jalankan formatter hanya pada file yang diubah.
bunx --no-install prettier --check <file-yang-diubah>
bun run lint
```

Jangan menjalankan `bun run format` untuk perubahan kecil karena script tersebut
memformat seluruh proyek. Hindari perubahan dependensi dan lockfile di luar
kebutuhan tugas. Jangan menonaktifkan aturan hanya untuk menyembunyikan masalah.
