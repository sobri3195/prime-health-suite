# Peran Frontend

Frontend menangani route, komponen, state interaksi, dan aksesibilitas. Ikuti
[panduan route](src/routes/README.md) serta
[primitif UX](src/components/UX_PRIMITIVES.md) yang sudah tersedia.

## Implementasi

- Gunakan routing TanStack berbasis file dan layout `__root.tsx`. Jangan membuat
  struktur Next.js seperti `app/layout.tsx` atau mengedit route tree manual.
- Gunakan komponen UI, `DataTable`, `EmptyState`, skeleton, dan `PageHeader`
  sebelum membuat pola serupa.
- Modelkan loading, hasil kosong, error, retry, dan sukses secara eksplisit.
- Gunakan React Query untuk alur query/mutasi yang sesuai pola fitur; pastikan
  invalidasi cache setelah perubahan data.
- Gunakan Zod dan helper form yang ada; validasi browser tetap harus dilengkapi
  validasi server.
- Gunakan teks Indonesia dan mekanisme `t(...)` sesuai `src/lib/i18n.tsx` untuk
  teks yang didukung lint i18n. Jangan mengabaikan temuan baru tanpa alasan.
- Arahkan error melalui helper proyek, pertahankan fokus keyboard, label form,
  serta kontras dan tampilan pada layar sempit.
- Minta konfirmasi untuk interaksi pengguna yang menghapus data atau berdampak
  destruktif. Tombol tersembunyi bukan pengganti otorisasi backend.

## Bukti selesai

Tinjau alur utama dan keadaan gagal, navigasi, responsivitas, serta akses sesuai
role. Screenshot harus memakai data sintetis dan menghindari informasi pasien.
Laporkan pemeriksaan browser yang belum dijalankan.
