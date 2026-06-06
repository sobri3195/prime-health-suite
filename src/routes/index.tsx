import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Stethoscope, BarChart3, Users } from "lucide-react";
import { BRAND, faviconDataUrl } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prime Health Suite — Sistem Terpadu Klinik Mata" },
      { name: "description", content: "Tiga sistem dalam satu suite: portal pasien, sistem informasi klinik, dan dashboard keuangan." },
      { property: "og:title", content: "Prime Health Suite" },
      { property: "og:description", content: "Portal pasien, SIM klinik, dan finance dalam satu suite terpadu." },
      { property: "og:url", content: "https://prime-health-suite.lovable.app/" },
      { name: "theme-color", content: "#0c2340" },
    ],
    links: [
      { rel: "canonical", href: "https://prime-health-suite.lovable.app/" },
      { rel: "icon", type: "image/svg+xml", href: faviconDataUrl("✦") },
    ],
  }),
  component: Landing,
});

const SYSTEMS = [
  { key: "apps" as const, to: "/apps/login", icon: Users, desc: "Portal pasien: jadwal, resep digital, riwayat pemeriksaan." },
  { key: "sim-klinik" as const, to: "/sim-klinik/login", icon: Stethoscope, desc: "Registrasi, rekam medis, pemeriksaan, billing & farmasi." },
  { key: "finance" as const, to: "/finance/login", icon: BarChart3, desc: "Pendapatan, honor dokter, jurnal otomatis, laporan keuangan." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="text-amber-400">✦</span> Prime Health Suite
        </div>
        <nav className="hidden gap-6 text-sm text-slate-300 sm:flex">
          <a href="#systems" className="hover:text-white">Sistem</a>
          <a href="#about" className="hover:text-white">Tentang</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <span className="inline-block rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 text-xs text-slate-400">
          Klinik Mata · Integrated Suite
        </span>
        <h1 className="mt-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl">
          Satu suite, tiga sistem,<br />klinik berjalan tanpa hambatan.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400">
          Portal pasien, sistem informasi klinik, dan dashboard keuangan — terhubung dalam satu basis data
          dan satu identitas. Operasional lebih ringkas, laporan lebih akurat.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#systems" className="inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-amber-300">
            Mulai · Pilih Sistem <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section id="systems" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {SYSTEMS.map(({ key, to, icon: Icon, desc }) => {
            const b = BRAND[key];
            return (
              <Link
                key={key}
                to={to}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    style={{ background: `${b.accent}22`, color: b.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm text-slate-400">{b.shortName}</div>
                    <div className="font-semibold">{b.name}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">{desc}</p>
                <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-amber-300 group-hover:gap-2">
                  Masuk <ArrowRight className="h-4 w-4 transition-all" />
                </div>
                <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: b.accent }} />
              </Link>
            );
          })}
        </div>
      </section>

      <section id="about" className="border-t border-slate-800/60 bg-slate-950/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            ["Satu basis data", "Pasien, transaksi, dan jurnal hidup di satu sumber kebenaran."],
            ["Laporan real-time", "Pendapatan, honor dokter, dan laba-rugi otomatis tersusun harian."],
            ["Akses berperan", "Setiap sistem punya login tersendiri sesuai kebutuhan tim."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="text-sm font-semibold text-white">{t}</h3>
              <p className="mt-2 text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Prime Health Suite
      </footer>
    </div>
  );
}
