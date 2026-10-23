# Komunikasi Antarperan

Gunakan format ini saat pekerjaan berpindah pemilik, baik antarorang maupun
antaragent. Pertukaran pesan tidak memberi kewenangan tambahan untuk push,
deployment, atau perubahan database.

## Serah terima

```text
Tugas / tujuan:
Pengirim dan penerima:
Branch / commit acuan:
Ruang lingkup dan pemilik file:
Kontrak input / output:
Perubahan atau temuan:
Perintah dan hasil validasi:
Ketergantungan / blocker:
Langkah berikutnya:
```

## Status

| Status           | Makna                                                          |
| ---------------- | -------------------------------------------------------------- |
| planned          | Lingkup dipahami; implementasi belum dimulai                   |
| in_progress      | Pekerjaan sedang berjalan                                      |
| blocked          | Ada prasyarat konkret yang menghalangi langkah tertentu        |
| ready_for_review | Perubahan dan bukti siap ditinjau                              |
| done             | Kriteria penerimaan dan tahap yang diotorisasi telah terpenuhi |

Jika pekerjaan paralel diizinkan, satu pemilik mengubah setiap file pada satu
waktu. Sepakati kontrak bersama sebelum implementasi dan selesaikan konflik
secara eksplisit; jangan menimpa perubahan lain. Hasil yang diterima tetap harus
ditinjau oleh pemilik integrasi.

Pesan harus menyebut path, simbol, dan hasil yang dapat diperiksa. Hindari klaim
"semua aman" tanpa bukti. Bagikan nama variabel atau status binding, bukan nilai
secret. Instruksi operasional yang sah tetap mengikuti batas sesi dan
[aturan proyek](00-project-rules.md).
