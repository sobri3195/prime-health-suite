import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Stethoscope, BarChart3, Users, ShieldCheck, Workflow,
  Database, Clock, Lock, CheckCircle2, TrendingUp, FileBarChart, Activity,
} from "lucide-react";
import { BRAND, faviconDataUrl } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const SITE = "https://prime-health-suite.lovable.app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prime Health Suite — Sistem Terpadu Klinik Mata" },
      { name: "description", content: "Tiga sistem dalam satu suite: portal pasien (Apps), sistem informasi klinik (SIM Klinik), dan dashboard keuangan (Finance). Satu basis data, laporan real-time, akses berperan." },
      { property: "og:title", content: "Prime Health Suite — Sistem Terpadu Klinik Mata" },
      { property: "og:description", content: "Portal pasien, SIM klinik, dan finance dalam satu suite terpadu untuk klinik mata modern." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/` },
      { property: "og:site_name", content: "Prime Health Suite" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0c2340" },
    ],
    links: [
      { rel: "canonical", href: `${SITE}/` },
      { rel: "icon", type: "image/svg+xml", href: faviconDataUrl("✦") },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Prime Health Suite",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        description: "Suite terpadu untuk klinik mata: portal pasien, SIM klinik, dan dashboard keuangan.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
      }),
    }],
  }),
  component: Landing,
});

const SYSTEMS = [
  { key: "apps" as const, infoTo: "/produk/apps", loginTo: "/apps/login", icon: Users,
    desc: "Portal pasien: jadwal, resep digital, riwayat pemeriksaan, dan notifikasi." },
  { key: "sim-klinik" as const, infoTo: "/produk/sim-klinik", loginTo: "/sim-klinik/login", icon: Stethoscope,
    desc: "Registrasi, rekam medis, pemeriksaan mata, tindakan, billing, dan farmasi." },
  { key: "finance" as const, infoTo: "/produk/finance", loginTo: "/finance/login", icon: BarChart3,
    desc: "Pendapatan, honor dokter, jurnal otomatis, neraca, laba-rugi, dan arus kas." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="text-amber-400">✦</span> Prime Health Suite
          </Link>
          <nav className="hidden gap-6 text-sm text-slate-300 sm:flex">
            <a href="#problem" className="hover:text-white">Masalah</a>
            <a href="#systems" className="hover:text-white">Sistem</a>
            <a href="#workflow" className="hover:text-white">Alur</a>
            <a href="#security" className="hover:text-white">Keamanan</a>
          </nav>
          <Link to="/apps/login" className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-300">
            Masuk
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 text-center">
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
            Pilih Sistem <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#workflow" className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900">
            Lihat Alur Kerja
          </a>
        </div>

        <LoginHub />
      </section>

      {/* Problem */}
      <section id="problem" className="border-t border-slate-800/60 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-amber-400">Masalah</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Data klinik tersebar, laporan tertunda.</h2>
            <p className="mt-3 text-slate-400">
              Kebanyakan klinik mata masih memisah aplikasi pasien, rekam medis, dan keuangan.
              Akibatnya: rekonsiliasi manual, honor dokter lambat dihitung, dan keputusan menunggu rekap akhir bulan.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Data terpisah", "Excel, kertas, dan aplikasi berbeda untuk setiap fungsi."],
              ["Laporan tertunda", "Pendapatan harian dan honor dokter baru selesai mingguan."],
              ["Risiko salah hitung", "Rekonsiliasi manual rentan selisih kasir dan pajak."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="text-sm font-semibold text-white">{t}</div>
                <p className="mt-2 text-sm text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution overview */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400">Solusi</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Satu basis data, tiga pengalaman.</h2>
            <p className="mt-3 text-slate-400">
              Prime Health Suite menyatukan pasien, operasional klinik, dan keuangan dalam satu sumber kebenaran.
              Setiap tim punya antarmuka khusus, namun semua angka berasal dari database yang sama.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                "Sinkronisasi real-time antar sistem",
                "Jurnal otomatis dari transaksi klinik",
                "Akses berperan (RBAC) per sistem",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                {SYSTEMS.map(({ key, icon: Icon }) => {
                  const b = BRAND[key];
                  return (
                    <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <Icon className="mx-auto h-5 w-5" style={{ color: b.accent }} />
                      <div className="mt-2 font-medium text-white">{b.shortName}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Database className="h-4 w-4" /> Lovable Cloud · single source of truth
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Product cards */}
      <section id="systems" className="border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Tiga sistem, satu suite</h2>
            <p className="mt-2 text-sm text-slate-400">Pilih sistem yang relevan dengan peran Anda.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SYSTEMS.map(({ key, infoTo, loginTo, icon: Icon, desc }) => {
              const b = BRAND[key];
              return (
                <div
                  key={key}
                  className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                      style={{ background: `${b.accent}22`, color: b.accent }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm text-slate-400">{b.shortName}</div>
                      <div className="font-semibold">{b.name}</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">{desc}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link to={loginTo} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-slate-950"
                      style={{ background: b.accent }}>
                      Masuk <ArrowRight className="h-3 w-3" />
                    </Link>
                    <Link to={infoTo} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800">
                      Pelajari
                    </Link>
                  </div>
                  <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-2xl" style={{ background: b.accent }} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature highlight */}
      <section className="border-t border-slate-800/60 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Fitur unggulan</h2>
            <p className="mt-2 text-sm text-slate-400">Yang membuat operasional klinik mata jadi lebih cepat.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              [Activity, "Rekam medis mata", "Template pemeriksaan visus, refraksi, dan tonometri siap pakai."],
              [TrendingUp, "Ranking dokter", "Pendapatan, jumlah pasien, dan honor dokter terpantau harian."],
              [FileBarChart, "Jurnal otomatis", "Setiap invoice & pembayaran membentuk jurnal sesuai COA."],
              [Clock, "Laporan real-time", "Neraca, laba-rugi, dan arus kas selalu sinkron dengan transaksi."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Activity;
              return (
                <div key={t as string} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                  <I className="h-5 w-5 text-amber-400" />
                  <div className="mt-3 text-sm font-semibold text-white">{t as string}</div>
                  <p className="mt-1 text-sm text-slate-400">{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow ecosystem */}
      <section id="workflow" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-amber-400">Ekosistem</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Alur kerja end-to-end</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
            Pasien daftar via Apps → diperiksa di SIM Klinik → transaksi otomatis membentuk jurnal di Finance.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { i: Users, t: "1 · Apps", d: "Pasien booking jadwal, isi data diri, melihat hasil dan resep digital." },
            { i: Stethoscope, t: "2 · SIM Klinik", d: "Front office registrasi, dokter input pemeriksaan, kasir membuat invoice." },
            { i: BarChart3, t: "3 · Finance", d: "Invoice → jurnal → laporan keuangan & honor dokter terhitung otomatis." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <Icon className="h-6 w-6 text-amber-400" />
              <div className="mt-3 font-semibold">{t}</div>
              <p className="mt-2 text-sm text-slate-400">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Workflow className="h-4 w-4" /> Satu data mengalir di tiga sistem, tanpa input ganda.
        </div>
      </section>

      {/* Security & compliance */}
      <section id="security" className="border-t border-slate-800/60 bg-slate-950/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-400">Keamanan & Kepatuhan</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Data klinik aman, akses terkendali.</h2>
              <p className="mt-3 text-slate-400">
                Setiap sistem memiliki sesi login terpisah, peran (RBAC) tersendiri, dan semua aktivitas
                tercatat di audit log. Database dilindungi Row Level Security.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [ShieldCheck, "Row Level Security", "Setiap query difilter sesuai peran pengguna."],
                [Lock, "Sesi terpisah per sistem", "Login Apps, SIM, dan Finance independen."],
                [Database, "Backup harian", "Snapshot terjadwal di Lovable Cloud."],
                [CheckCircle2, "Audit log", "Setiap aksi penting tercatat & dapat ditelusuri."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <div key={t as string} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <I className="h-5 w-5 text-emerald-400" />
                    <div className="mt-2 text-sm font-semibold text-white">{t as string}</div>
                    <p className="mt-1 text-xs text-slate-400">{d as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard preview mockup */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Pratinjau dashboard</h2>
          <p className="mt-2 text-sm text-slate-400">Tampilan ringkas dashboard Finance yang akan Anda dapatkan.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-3 text-xs text-slate-500">finance.prime-health-suite</span>
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-4">
            {[
              ["Pendapatan Hari Ini", "Rp 18,7 Jt", "+12%"],
              ["Pasien Aktif", "84", "+6"],
              ["Honor Dokter", "Rp 4,2 Jt", "harian"],
              ["Saldo Kas", "Rp 312 Jt", "stabil"],
            ].map(([t, v, h]) => (
              <div key={t} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">{t}</div>
                <div className="mt-2 text-xl font-semibold text-white">{v}</div>
                <div className="mt-1 text-xs text-emerald-400">{h}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 px-3 pb-3 md:grid-cols-3">
            <div className="md:col-span-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs text-slate-400">Tren Pendapatan 7 Hari</div>
              <div className="mt-3 flex h-28 items-end gap-2">
                {[42, 60, 38, 75, 55, 82, 96].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-500/60 to-amber-300/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs text-slate-400">Top Dokter</div>
              <ul className="mt-3 space-y-2 text-sm">
                {[["dr. Andini", "Rp 8,2 Jt"], ["dr. Budi", "Rp 6,4 Jt"], ["dr. Citra", "Rp 4,1 Jt"]].map(([n, v]) => (
                  <li key={n} className="flex items-center justify-between text-slate-300">
                    <span>{n}</span><span className="text-xs text-slate-500">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/60 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Siap menjalankan klinik dari satu suite?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            Mulai dari sistem yang paling relevan. Anda dapat menambah sistem lain kapan saja.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {SYSTEMS.map(({ key, loginTo }) => {
              const b = BRAND[key];
              return (
                <Link key={key} to={loginTo}
                  className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium text-slate-950"
                  style={{ background: b.accent }}>
                  Masuk {b.shortName} <ArrowRight className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 text-sm text-slate-400 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <span className="text-amber-400">✦</span> Prime Health Suite
            </div>
            <p className="mt-2 text-xs">Suite terpadu untuk klinik mata modern.</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sistem</div>
            <ul className="mt-2 space-y-1 text-xs">
              <li><Link to="/produk/apps" className="hover:text-white">Apps</Link></li>
              <li><Link to="/produk/sim-klinik" className="hover:text-white">SIM Klinik</Link></li>
              <li><Link to="/produk/finance" className="hover:text-white">Finance</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Masuk</div>
            <ul className="mt-2 space-y-1 text-xs">
              <li><Link to="/apps/login" className="hover:text-white">Login Apps</Link></li>
              <li><Link to="/sim-klinik/login" className="hover:text-white">Login SIM Klinik</Link></li>
              <li><Link to="/finance/login" className="hover:text-white">Login Finance</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Tentang</div>
            <ul className="mt-2 space-y-1 text-xs">
              <li><a href="#problem" className="hover:text-white">Masalah</a></li>
              <li><a href="#workflow" className="hover:text-white">Alur kerja</a></li>
              <li><a href="#security" className="hover:text-white">Keamanan</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Prime Health Suite
        </div>
      </footer>
    </div>
  );
}

function LoginHub() {
  const { userFor, hydrated } = useAuth();
  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left shadow-xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Login Hub
        </div>
        <div className="text-[10px] text-slate-500">Sesi terpisah per sistem</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {SYSTEMS.map(({ key, loginTo, icon: Icon }) => {
          const b = BRAND[key];
          const u = hydrated ? userFor(key) : null;
          const homeTo = key === "sim-klinik" ? "/sim-klinik" : key === "finance" ? "/finance" : "/apps";
          return (
            <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ background: `${b.accent}22`, color: b.accent }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="text-sm font-semibold text-white">{b.shortName}</div>
              </div>
              {u ? (
                <>
                  <div className="mt-3 truncate text-[11px] text-emerald-400" title={u.email}>
                    ● {u.email}
                  </div>
                  <Link
                    to={homeTo}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-slate-950"
                    style={{ background: b.accent }}
                  >
                    Buka <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              ) : (
                <>
                  <div className="mt-3 text-[11px] text-slate-500">Belum masuk</div>
                  <Link
                    to={loginTo}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-slate-950"
                    style={{ background: b.accent }}
                  >
                    Masuk <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

