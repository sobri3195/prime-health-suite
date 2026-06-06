import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gradient-hero)] text-navy-foreground shadow-[var(--shadow-card)]">
            <Activity className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">Prime Health</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/apps" className="hover:text-foreground transition-colors">Prime Apps</Link>
          <Link to="/sim-klinik" className="hover:text-foreground transition-colors">SIM Klinik</Link>
          <Link to="/finance" className="hover:text-foreground transition-colors">Finance</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Login
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-navy px-4 py-1.5 text-sm font-medium text-navy-foreground shadow-[var(--shadow-card)] hover:opacity-95"
          >
            Request demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gradient-hero)] text-navy-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-semibold">Prime Health Platform</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Ekosistem digital terintegrasi untuk Klinik Utama Mata — workspace,
            operasional klinis, dan keuangan dalam satu platform.
          </p>
        </div>
        <FooterCol title="Produk" items={["Prime Apps", "SIM Klinik Mata", "Prime Simon Finance", "Integration Hub"]} />
        <FooterCol title="Perusahaan" items={["Tentang", "Karir", "Berita", "Kontak"]} />
        <FooterCol title="Sumber" items={["Dokumentasi", "Status", "Keamanan", "Kebijakan Privasi"]} />
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Prime Health Platform · Klinik Utama Mata
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="hover:text-foreground transition-colors cursor-pointer">{i}</li>
        ))}
      </ul>
    </div>
  );
}
