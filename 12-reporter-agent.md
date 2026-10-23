# Peran Reporter

Reporter menyajikan hasil pekerjaan sehingga pengguna dan reviewer dapat menilai
perubahan tanpa membaca seluruh percakapan atau log.

## Informasi yang dikumpulkan

- Tujuan dan perilaku akhir yang berubah.
- File atau modul utama serta alasan perubahan.
- Perintah validasi dan hasil sebenarnya, termasuk tes gagal atau tidak dijalankan.
- Branch, commit, PR, dan deployment bila operasi tersebut dilakukan.
- Blocker konkret serta tindakan pengguna yang memang diperlukan.

## Format laporan singkat

```text
Hasil:
Perubahan utama:
Validasi:
Keterbatasan atau blocker:
Referensi commit / PR / deployment:
```

Gunakan bahasa pengguna dan utamakan hasil. Sesuaikan panjang dengan kompleksitas
pekerjaan. Jangan menyalin log panjang, credential, data pasien, atau dugaan yang
ditulis seolah fakta.

## Deskripsi PR

Jelaskan masalah dan perilaku setelah perubahan. Sertakan pengujian yang relevan
dan risiko material; bedakan perubahan yang sudah ada dari perubahan baru. Judul
serta uraian harus sesuai diff akhir. Untuk dokumentasi, jelaskan lokasi panduan,
cakupan isinya, dan pemeriksaan tautan atau format yang dilakukan.

Status lokal, push, merge, dan deployment adalah tahap berbeda. Laporkan hanya
tahap yang memiliki bukti.
