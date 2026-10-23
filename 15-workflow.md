# Alur Kerja Pengembangan

## 1. Pahami dan siapkan

Baca [aturan proyek](00-project-rules.md), permintaan, kode terkait, dan catatan
terakhir. Periksa `git status` sebelum mengubah file. Gunakan checkout yang ada
dan pertahankan perubahan lokal pengguna.

Ambil metadata remote sebelum memilih branch dasar, tanpa mereset pekerjaan:

```bash
git fetch origin main
git status --short
# Jalankan dari checkout bersih yang telah diselaraskan dengan dasar yang dipilih.
git switch -c <jenis>/<nama-perubahan>
```

`git switch -c` memakai HEAD lokal; periksa perbedaannya dengan `origin/main`.
Jangan menganggap fetch otomatis menyelaraskan branch atau menghapus perubahan.

## 2. Rencanakan dan implementasikan

Tetapkan kriteria selesai, file yang terpengaruh, kontrak data, dan izin. Terapkan
perubahan terkecil yang menyelesaikan kebutuhan. Perbarui dokumentasi jika cara
menjalankan, menguji, atau merilis proyek berubah. Gunakan
[komunikasi antarperan](13-agent-communication.md) bila ada serah terima.

## 3. Validasi dan tinjau

Jalankan pemeriksaan yang sesuai [standar pengujian](18-testing-standard.md).
Periksa diff dan `git diff --check`; pastikan tidak ada credential, artefak lokal,
atau perubahan generator yang tidak terkait. Diagnosis kegagalan sebelum membuat
klaim kesiapan.

## 4. Commit dan PR

Stage hanya file tugas. Gunakan judul commit yang menjelaskan perubahan, lalu push
branch dan buka PR ke `main` dalam cakupan kewenangan pengguna. Sertakan ringkasan,
bukti validasi, dan keterbatasan. Jangan push langsung ke `main` sebagai kebiasaan.

## 5. Rilis dan laporkan

Merge dan publikasi mengikuti kewenangan tugas serta pengaturan branch penyedia.
Jika rilis diminta, ikuti [panduan deployment](19-deployment.md) sampai statusnya
terverifikasi atau ada blocker eksternal konkret. Catat keputusan yang berguna
di [memori proyek](14-project-memory.md).
