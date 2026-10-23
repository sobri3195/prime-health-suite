# Aturan Proyek Prime Health Suite

Dokumen ini menjadi titik masuk panduan pengembangan. Dokumen bernomor di root
menjelaskan proyek dan kontrak kerja peran agent; dokumen ini tidak memasang atau
menjalankan sistem multi-agent secara otomatis.

## Aturan utama

- Baca kode, konfigurasi, dan instruksi repositori sebelum mengubahnya. Ikuti
  permintaan pengguna dan batas kewenangan yang berlaku pada sesi kerja.
- Gunakan checkout yang tersedia. Tugas cloud sudah terisolasi; buat Git worktree
  hanya jika diminta pengguna.
- Batasi perubahan pada tujuan tugas. Pertahankan pekerjaan pengguna dan hindari
  perubahan format massal atau refaktor yang tidak terkait.
- Gunakan branch dan pull request untuk pembaruan berikutnya. Publikasi produksi,
  migrasi database jarak jauh, dan operasi destruktif harus sesuai kewenangan tugas.
- Jangan masukkan credential, data pasien, atau rincian transaksi nyata ke Git,
  percakapan, log, screenshot, fixture, maupun dokumentasi.
- Autentikasi dan otorisasi harus ditegakkan di server. Pembatasan tampilan di UI
  tidak menggantikan middleware, pemeriksaan role, dan kebijakan database.
- Gunakan Bun sesuai `packageManager` dan pertahankan `bun.lock`. Jangan
  menonaktifkan pemeriksaan TLS, integritas paket, atau blok keamanan deployment.
- Laporkan hasil pemeriksaan yang benar-benar dijalankan. Bedakan kegagalan kode,
  konfigurasi yang kurang, pemeriksaan yang dilewati, dan hasil yang belum diketahui.

## Urutan baca

| Kebutuhan                    | Dokumen                                                  |
| ---------------------------- | -------------------------------------------------------- |
| Gambaran produk              | [01-system-overview.md](01-system-overview.md)           |
| Arsitektur dan batas modul   | [02-architecture.md](02-architecture.md)                 |
| Koordinasi pekerjaan         | [03-orchestrator.md](03-orchestrator.md)                 |
| Perencanaan                  | [04-planner-agent.md](04-planner-agent.md)               |
| Desain teknis                | [05-architect-agent.md](05-architect-agent.md)           |
| Implementasi server          | [06-backend-agent.md](06-backend-agent.md)               |
| Implementasi antarmuka       | [07-frontend-agent.md](07-frontend-agent.md)             |
| Verifikasi                   | [08-qa-agent.md](08-qa-agent.md)                         |
| Diagnosis                    | [09-debug-agent.md](09-debug-agent.md)                   |
| Keamanan                     | [10-security-agent.md](10-security-agent.md)             |
| Operasional                  | [11-devops-agent.md](11-devops-agent.md)                 |
| Pelaporan                    | [12-reporter-agent.md](12-reporter-agent.md)             |
| Serah terima                 | [13-agent-communication.md](13-agent-communication.md)   |
| Fakta dan keputusan tercatat | [14-project-memory.md](14-project-memory.md)             |
| Alur perubahan               | [15-workflow.md](15-workflow.md)                         |
| Peta repositori              | [16-repository-structure.md](16-repository-structure.md) |
| Standar kode                 | [17-coding-standard.md](17-coding-standard.md)           |
| Standar pengujian            | [18-testing-standard.md](18-testing-standard.md)         |
| Rilis dan rollback           | [19-deployment.md](19-deployment.md)                     |
| Usulan prioritas             | [20-roadmap.md](20-roadmap.md)                           |
