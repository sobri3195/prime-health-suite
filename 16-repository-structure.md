# Struktur Repositori

```text
prime-health-suite/
├── 00-project-rules.md ... 20-roadmap.md  # Panduan proyek dan peran
├── .github/workflows/e2e.yml            # Workflow Playwright di GitHub
├── .lovable/                            # Metadata integrasi Lovable
├── public/                              # Aset publik
├── scripts/                             # Lint i18n dan utilitas pemeliharaan
├── src/
│   ├── components/                      # UI umum serta komponen domain
│   ├── context/                         # Context React
│   ├── data/                            # Data dan konfigurasi aplikasi
│   ├── hooks/                           # Hook yang digunakan UI
│   ├── integrations/supabase/           # Client, middleware, tipe database
│   ├── lib/                             # Helper dan server functions domain
│   ├── routes/                          # Route berbasis file TanStack
│   ├── types/                           # Tipe bersama
│   ├── routeTree.gen.ts                 # Hasil generator routing
│   ├── router.tsx                       # Pembuatan router dan QueryClient
│   ├── server.ts                        # Wrapper server entry / error SSR
│   ├── start.ts                         # Middleware Start
│   └── styles.css                       # Gaya global
├── supabase/
│   ├── config.toml                      # Konfigurasi Supabase
│   └── migrations/                      # Riwayat SQL
├── tests/
│   ├── unit/                            # Invariant, interaksi obat, terbilang
│   └── e2e/                             # Skrip Playwright Python dan runner
├── package.json                         # Dependensi, scripts, versi Bun
├── bun.lock                             # Resolusi dependensi
├── bunfig.toml                          # Pengaturan instalasi
├── tsconfig.json                        # Alias @/ dan TypeScript strict
└── vite.config.ts                       # Konfigurasi wrapper Vite / Start
```

`home.html` dan `index.js` juga ada di root. Jangan menganggap keduanya entry
build aktif tanpa menelusuri konfigurasi; entry aplikasi ditangani integrasi
TanStack Start.

`node_modules/`, `.output/`, `.tanstack/`, dan `.wrangler/` adalah lokasi lokal atau
hasil tool yang diabaikan Git. Jangan menganggap proses atau artefak di dalamnya
selalu tersedia pada checkout baru. Jangan menyalin isi `.env` ke dokumentasi.

Gunakan [panduan route](src/routes/README.md) untuk nama route. Tempatkan kode
baru dekat domain terkait dan periksa apakah helper yang dibutuhkan sudah ada.
