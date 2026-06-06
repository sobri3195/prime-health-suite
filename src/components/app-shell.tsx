import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, Bell, ChevronDown, ChevronRight, LogOut, Menu, Moon, Search, Sun, X,
} from "lucide-react";
import { NAV, SYSTEM_LABEL, findNav, type NavItem } from "@/lib/nav-config";
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
  const isApps = system === "apps";

  return (
    <div
      className={`flex min-h-screen bg-background ${isApps ? "flex-col" : ""}`}
      style={isApps ? { background: "#f7eccb" } : undefined}
    >
      {/* Sidebar (hidden for Prime Apps which uses bottom nav) */}
      {!isApps && (
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-border bg-card transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gradient-hero)] text-navy-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold">{SYSTEM_LABEL[system]}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Prime Health
              </div>
            </div>
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <SidebarNav system={system} items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className="mb-1.5 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Switch system
          </div>
          <div className="space-y-1">
            {(Object.keys(SYSTEM_LABEL) as System[]).map((s) => {
              const allowed = user ? canAccess(user.role, s) : false;
              return (
                <button
                  key={s}
                  disabled={!allowed}
                  onClick={() => navigate({ to: `/${s}` })}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                    s === system
                      ? "bg-muted font-medium text-foreground"
                      : allowed
                      ? "text-muted-foreground hover:bg-muted"
                      : "cursor-not-allowed text-muted-foreground/40"
                  }`}
                >
                  {SYSTEM_LABEL[s]} {!allowed && "·  🔒"}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
      )}

      {open && !isApps && (
        <div className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
          {!isApps && (
            <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          )}
          {isApps && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gradient-hero)] text-navy-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold">{SYSTEM_LABEL[system]}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Prime Health</div>
              </div>
            </Link>
          )}

          <nav className="hidden items-center gap-1.5 text-sm md:flex">
            {!isApps && <span className="text-muted-foreground">{SYSTEM_LABEL[system]}</span>}
            {!isApps && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-medium">{current?.label ?? "—"}</span>
          </nav>

          <div className="ml-auto flex flex-1 items-center justify-end gap-2">
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Cari pasien, transaksi, dokumen…"
                className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-accent" />
            </button>

            <ProfileMenu
              name={user?.name ?? "User"}
              role={user ? ROLE_LABEL[user.role] : ""}
              onLogout={() => {
                logout();
                navigate({ to: "/login" });
              }}
            />
          </div>
        </header>

        <main className={`min-w-0 flex-1 p-6 md:p-8 ${isApps ? "pb-24" : ""}`}>{children}</main>

        {/* Bottom navigation for Prime Apps */}
        {isApps && (
          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1.5">
              {items.map((it) => {
                const href = it.slug ? `/${system}/${it.slug}` : `/${system}`;
                const active = pathname === href || (it.slug === "" && pathname === `/${system}`);
                return (
                  <Link
                    key={it.label}
                    to={href}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] transition-colors ${
                      active
                        ? "text-navy dark:text-cyan-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <it.icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
                    <span className="truncate">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}



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

function SidebarNav({
  system, items, pathname, onNavigate,
}: { system: System; items: NavItem[]; pathname: string; onNavigate: () => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    items.forEach((it) => {
      const g = it.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    });
    return Array.from(map.entries());
  }, [items]);

  const linkOf = (it: NavItem) => (it.slug ? `/${system}/${it.slug}` : `/${system}`);
  const isActive = (it: NavItem) => {
    const href = linkOf(it);
    return pathname === href || (it.slug === "" && pathname === `/${system}`);
  };
  const activeGroup = items.find((it) => isActive(it))?.group ?? "";

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isOpen = (g: string) => openGroups[g] ?? (g === "" || g === activeGroup || g === "Dashboard");

  const Item = (it: NavItem) => {
    const active = isActive(it);
    return (
      <Link
        key={it.label}
        to={linkOf(it)}
        onClick={onNavigate}
        className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-navy text-navy-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <it.icon className="h-4 w-4" />
        <span className="truncate">{it.label}</span>
      </Link>
    );
  };

  return (
    <div className="space-y-1">
      {groups.map(([group, list]) => {
        if (!group) return <div key="_root" className="space-y-0.5">{list.map(Item)}</div>;
        const open = isOpen(group);
        return (
          <div key={group} className="space-y-0.5">
            <button
              type="button"
              onClick={() => setOpenGroups((s) => ({ ...s, [group]: !open }))}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/60"
            >
              <span>{group}</span>
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {open && <div className="space-y-0.5">{list.map(Item)}</div>}
          </div>
        );
      })}
    </div>
  );
}
