# Roadmap

Daftar ini adalah usulan berdasarkan inspeksi repositori dan hasil sesi kerja.
Urutan dapat berubah sesuai kebutuhan pengguna; tidak ada tanggal rilis atau
fitur baru yang dianggap telah disetujui hanya karena tercantum di sini.

## Prioritas 1: kesiapan pengembangan

| Usulan                                         | Kriteria selesai                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Selesaikan invariant total invoice tidak valid | Reproduksi dan perbaikan pada `computePaymentStatus`; suite unit relevan lulus tanpa melonggarkan ekspektasi      |
| Lengkapi konfigurasi CI E2E                    | Binding GitHub tersedia, database uji teridentifikasi, seed demo sesuai, runner benar-benar mengeksekusi tes      |
| Tangani temuan strict i18n                     | Teks baru dan temuan lama diselesaikan bertahap; strict lint melaporkan hasil yang dapat dipertanggungjawabkan    |
| Selaraskan versi tool CI                       | Evaluasi Bun `latest` pada workflow terhadap pin `packageManager`; validasi instalasi dan suite setelah perubahan |

## Prioritas 2: keamanan dan operasional

- Tinjau guard server, pemakaian service role, serta kebijakan RLS per domain.
  Selesai ketika akses yang diizinkan dan ditolak memiliki bukti uji relevan.
- Audit pengelolaan `.env` yang sudah dilacak dan pemisahan konfigurasi penyedia.
  Inventarisasi nama serta status binding tanpa menyalin nilai; rotasi hanya bila
  diperlukan berdasarkan temuan.
- Dokumentasikan preset Nitro dan artefak aktual untuk setiap target deployment.
  Selesai ketika build dan smoke test target dapat diulang dari instruksi tersebut.
- Tetapkan prosedur pemantauan advisory dan pembaruan dependensi dengan frozen
  lockfile, pemeriksaan kompatibilitas, serta rencana rollback.

## Prioritas 3: kualitas alur produk

- Tambahkan cakupan regresi berdasarkan risiko pada booking, pembayaran parsial,
  pembatalan, jurnal, serta akses rekam medis lintas role.
- Evaluasi konsistensi loading, empty, error, retry, aksesibilitas, dan ekspor
  menggunakan primitif UI yang sudah tersedia.
- Rapikan deprecation validator TanStack pada modul yang disentuh setelah API
  pengganti dan dampaknya terhadap kontrak diuji.

Setiap item baru memerlukan pemilik, lingkup, kriteria penerimaan, dan bukti
selesai. Catat fakta dan keputusan yang berubah pada
[14-project-memory.md](14-project-memory.md); gunakan
[15-workflow.md](15-workflow.md) untuk implementasi.
