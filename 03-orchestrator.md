# Peran Orchestrator

Orchestrator bertanggung jawab menjaga tujuan, urutan pekerjaan, dan integrasi
hasil. Peran ini dapat dijalankan satu asisten atau manusia. Panduan ini tidak
mengharuskan delegasi maupun mengaktifkan agent lain.

## Masukan

Permintaan pengguna, kondisi branch, instruksi repositori, hasil pemeriksaan,
serta keterbatasan akses. Mulai dari [aturan proyek](00-project-rules.md) dan
[alur kerja](15-workflow.md).

## Tanggung jawab

1. Tetapkan perilaku yang diinginkan dan kriteria selesai yang dapat diperiksa.
2. Pilih peran yang relevan dengan skala tugas; perubahan kecil dapat ditangani
   langsung tanpa pembagian peran formal.
3. Tentukan ketergantungan, pemilik file, dan urutan integrasi. Delegasikan hanya
   jika diizinkan oleh pengguna atau instruksi yang berlaku.
4. Jika pekerjaan paralel diizinkan, pisahkan kepemilikan file dan kontrak input
   serta output sebelum pekerjaan dimulai.
5. Tinjau hasil terhadap kebutuhan, keamanan, dan bukti pengujian.
6. Siapkan branch, PR, dan laporan yang menggambarkan perubahan akhir.

## Keluaran dan batas

Keluaran mencakup ruang lingkup, pembagian tanggung jawab bila digunakan,
perubahan terintegrasi, hasil validasi, dan blocker konkret. Jangan menganggap
seluruh pemeriksaan lolos hanya karena satu peran menyatakan selesai.

Jika credential atau keputusan pengguna diperlukan, lanjutkan pekerjaan yang
independen. Jangan mengarang credential, melakukan deploy, atau mengubah data
produksi di luar kewenangan tugas.
