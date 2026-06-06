import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { BRAND, type SystemBrand } from "@/lib/brand";
import type { System } from "@/lib/auth";

export type ProductLandingProps = {
  system: System;
  loginTo: "/apps/login" | "/sim-klinik/login" | "/finance/login";
  headline: string;
  subhead: string;
  benefits: { icon: LucideIcon; title: string; desc: string }[];
  features: string[];
  audiences: { role: string; what: string }[];
  defaultRoleLabel: string;
};

export function ProductLanding({
  system, loginTo, headline, subhead, benefits, features, audiences, defaultRoleLabel,
}: ProductLandingProps) {
  const b: SystemBrand = BRAND[system];

  return (
    <div className="min-h-screen" style={{ background: b.background, color: b.foreground }}>
      {/* Header */}
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <span style={{ color: b.accent }}>✦</span> Prime Health Suite
          </Link>
          <nav className="hidden gap-5 text-sm opacity-80 sm:flex">
            <a href="#manfaat" className="hover:opacity-100">Manfaat</a>
            <a href="#fitur" className="hover:opacity-100">Fitur</a>
            <a href="#untuk-siapa" className="hover:opacity-100">Untuk Siapa</a>
          </nav>
          <Link
            to={loginTo}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: b.accent }}
          >
            Masuk
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: `${b.accent}1f`, color: b.accent }}
            >
              {b.faviconEmoji} {b.name}
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{headline}</h1>
            <p className="mt-4 text-base opacity-75">{subhead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={loginTo}
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium text-white shadow"
                style={{ background: b.accent }}
              >
                Masuk sebagai {defaultRoleLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white/60 px-5 py-2.5 text-sm font-medium hover:bg-white"
              >
                Kembali ke Suite
              </Link>
            </div>
          </div>
          <div className="relative">
            <div
              className="overflow-hidden rounded-2xl border border-black/5 p-8 text-white shadow-xl"
              style={{ background: b.accent }}
            >
              <div className="text-6xl">{b.faviconEmoji}</div>
              <blockquote className="mt-4 text-xl font-medium leading-snug">{b.tagline}</blockquote>
              <div className="mt-1 text-xs opacity-80">{b.name}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="manfaat" className="border-y border-black/5 bg-white/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Manfaat utama</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <Icon className="h-5 w-5" style={{ color: b.accent }} />
                <div className="mt-3 text-sm font-semibold">{title}</div>
                <p className="mt-1 text-sm opacity-70">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features list */}
      <section id="fitur" className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold tracking-tight">Fitur lengkap</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 rounded-lg bg-white/60 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: b.accent }} /> {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Audiences */}
      <section id="untuk-siapa" className="border-t border-black/5 bg-white/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Untuk siapa?</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {audiences.map(({ role, what }) => (
              <div key={role} className="rounded-xl border border-black/5 bg-white p-4">
                <div className="text-sm font-semibold">{role}</div>
                <p className="mt-1 text-sm opacity-70">{what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Mulai gunakan {b.shortName} sekarang</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-70">
          Sesi login {b.name} terpisah dari sistem lain, sehingga aman digunakan bersama tim.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to={loginTo}
            className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium text-white shadow"
            style={{ background: b.accent }}
          >
            Masuk ke {b.shortName} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/5 py-6 text-center text-xs opacity-60">
        © {new Date().getFullYear()} Prime Health Suite · {b.name}
      </footer>
    </div>
  );
}
