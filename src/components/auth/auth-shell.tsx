import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import type { System } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Single source of truth for login/signup/forgot screens across all 3 systems.
 * Renders brand header, hero panel, and footer; consumers provide the form body.
 *
 * CSS vars `--brand-accent` / `--brand-bg` / `--brand-fg` are exposed so child
 * components can use `bg-[var(--brand-accent)]` instead of inline styles, which
 * means focus/hover states inherit the brand color automatically.
 */
export function AuthShell({
  system,
  heading,
  subheading,
  children,
  banner,
  showHeader = true,
}: {
  system: System;
  heading: string;
  subheading?: string;
  children: ReactNode;
  /** Optional region above the form (e.g. cross-system indicator). */
  banner?: ReactNode;
  showHeader?: boolean;
}) {
  const brand = BRAND[system];
  const headingId = `auth-${system}-heading`;
  return (
    <div
      className="grid min-h-dvh lg:grid-cols-2"
      style={
        {
          background: brand.background,
          color: brand.foreground,
          ["--brand-accent" as string]: brand.accent,
          ["--brand-bg" as string]: brand.background,
          ["--brand-fg" as string]: brand.foreground,
        } as React.CSSProperties
      }
    >
      <div className="pointer-events-none fixed right-4 top-4 z-50">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
      </div>
      <main
        className="flex items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] py-12"
        aria-labelledby={headingId}
      >
        <div className="w-full max-w-sm">
          {showHeader && (
            <header>
              <Link to="/login" className="inline-flex items-center gap-2 hover:opacity-80">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-white"
                  style={{ background: "var(--brand-accent)" }}
                  aria-hidden
                >
                  {brand.faviconEmoji}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{brand.name}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-60">
                    {brand.tagline}
                  </div>
                </div>
              </Link>

              <h1 id={headingId} className="mt-10 text-2xl font-semibold">
                {heading}
              </h1>
              {subheading && <p className="mt-1.5 text-sm opacity-70">{subheading}</p>}
            </header>
          )}

          {banner}

          {children}

          <footer className="mt-6 space-y-1 text-center text-[11px] opacity-60">
            <p>
              <a href="/privacy" className="underline hover:opacity-100">
                Kebijakan Privasi
              </a>
              <span aria-hidden className="mx-2">·</span>
              <a href="/terms" className="underline hover:opacity-100">
                Syarat Layanan
              </a>
            </p>
            <p>© {new Date().getFullYear()} Prime Health Suite</p>
          </footer>
        </div>
      </main>

      <aside
        className="relative hidden overflow-hidden lg:block"
        style={{ background: "var(--brand-accent)" }}
        aria-hidden
      >
        {/* Subtle radial pattern adds depth without external assets / lottie */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(0,0,0,.2) 0, transparent 50%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-6 text-7xl drop-shadow-lg">{brand.faviconEmoji}</div>
          <blockquote className="max-w-md text-2xl font-medium leading-snug">
            {brand.name}
          </blockquote>
          <div className="mt-2 text-sm text-white/80">{brand.tagline}</div>
        </div>
      </aside>
    </div>
  );
}
