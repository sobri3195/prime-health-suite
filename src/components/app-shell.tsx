import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity, Bell, ChevronRight, LogOut, Menu, Moon, Search, Sun, X,
} from "lucide-react";
import { NAV, SYSTEM_LABEL, findNav } from "@/lib/nav-config";
import { ROLE_LABEL, useAuth, canAccess, type System } from "@/lib/auth";
import { addAudit } from "@/lib/audit-log";

export function AppShell({ system, children }: { system: System; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
    }
  }, [dark]);

  useEffect(() => {
    if (user) addAudit({ actor: user.email, action: "page_access", target: pathname });
  }, [pathname, user]);

  const items = NAV[system];
  const currentSlug = pathname.split("/").slice(3).join("/") || "";
  const current = findNav(system, currentSlug);


function ProfileMenu({ name, role, onLogout }: { name: string; role: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-sm hover:bg-muted"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gradient-accent)] text-xs font-semibold text-navy">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-xs font-medium">{name}</span>
          <span className="block text-[10px] text-muted-foreground">{role}</span>
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-md border border-border bg-popover shadow-[var(--shadow-elegant)]">
            <div className="border-b border-border px-3 py-2 text-xs">
              <div className="font-medium">{name}</div>
              <div className="text-muted-foreground">{role}</div>
            </div>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PageHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} desc="Modul ini akan segera tersedia. Struktur halaman sudah siap dikembangkan." />
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Activity className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted-foreground">
          Halaman <span className="font-medium text-foreground">{title}</span> sedang dalam pengembangan.
        </p>
      </div>
    </div>
  );
}
