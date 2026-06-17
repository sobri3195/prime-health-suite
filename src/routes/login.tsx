import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Stethoscope, BarChart3 } from "lucide-react";
import { BRAND, faviconDataUrl } from "@/lib/brand";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — Prime Health Suite" },
      { name: "description", content: "Pilih sistem untuk masuk: Prime Apps (pasien), SIM Klinik, atau Simon Finance." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: faviconDataUrl("✦") }],
  }),
  component: ChooserPage,
});

const SYSTEMS = [
  {
    key: "apps" as const,
    to: "/apps/login" as const,
    icon: Users,
    desc: "Portal pasien — booking, resep, riwayat pemeriksaan.",
  },
  {
    key: "sim-klinik" as const,
    to: "/sim-klinik/login" as const,
    icon: Stethoscope,
    desc: "Front office, dokter, perawat, kasir, farmasi.",
  },
  {
    key: "finance" as const,
    to: "/finance/login" as const,
    icon: BarChart3,
    desc: "Manajemen keuangan, jurnal, honor dokter, laporan.",
  },
];

function ChooserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-300 hover:text-white">
            <span className="text-amber-400">✦</span> Prime Health Suite
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Pilih sistem untuk masuk</h1>
          <p className="mt-2 text-sm text-slate-400">
            Setiap sistem punya sesi & peran terpisah. Akun yang sama bisa dipakai di ketiganya.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
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
                    <div className="text-xs text-slate-400">{b.shortName}</div>
                    <div className="font-semibold">{b.name}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">{desc}</p>
                <div className="mt-6 inline-flex items-center gap-1 text-xs font-medium" style={{ color: b.accent }}>
                  Masuk <ArrowRight className="h-3 w-3" />
                </div>
                <span
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-2xl"
                  style={{ background: b.accent }}
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-400">
          Akun demo bersama: <b className="text-slate-200">demo@prime.id</b> · <b className="text-slate-200">demo1234</b>
        </div>
      </div>
    </div>
  );
}
