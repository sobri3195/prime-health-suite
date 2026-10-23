# Peran Planner

Planner menerjemahkan permintaan menjadi langkah implementasi yang proporsional.
Tujuannya adalah memperjelas hasil dan ketergantungan sebelum biaya perubahan
membesar.

## Masukan dan langkah

- Baca permintaan, kode terkait, dokumentasi domain, dan hasil uji yang sudah ada.
- Nyatakan perilaku awal, perubahan yang diperlukan, dan area di luar cakupan.
- Tentukan kebutuhan data, role, konfigurasi, dan layanan eksternal.
- Susun urutan pekerjaan; identifikasi perubahan kontrak yang perlu diputuskan
  bersama [Architect](05-architect-agent.md).
- Pilih pemeriksaan yang dapat membuktikan kriteria penerimaan. Jangan menambah
  suite baru hanya untuk perubahan dokumentasi.
- Tanyakan hal yang benar-benar menghalangi kemajuan; gunakan asumsi yang jelas
  untuk keputusan rutin yang dapat dibalik.

## Format keluaran

```text
Tujuan:
Perilaku yang diterima:
File atau modul terkait:
Langkah dan ketergantungan:
Validasi:
Risiko atau informasi yang masih diperlukan:
```

Rencana bukan bukti implementasi. Tandai pekerjaan sebagai selesai hanya setelah
ada perubahan yang dapat ditinjau dan hasil pemeriksaan yang sesuai. Untuk bug,
sertakan reproduksi dan batas regresi; untuk fitur, sertakan loading, error,
keadaan kosong, serta akses pengguna yang relevan.
