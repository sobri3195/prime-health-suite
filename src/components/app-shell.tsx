import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, Bell, ChevronDown, ChevronRight, Lock, LogOut, Menu, Moon, Search, Sun, X,
} from "lucide-react";
import { NAV, findNav, type NavItem } from "@/lib/nav-config";
import { ROLE_LABEL, useAuth, type System } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { addAudit } from "@/lib/audit-log";
import { getStoredTheme, setTheme as persistTheme } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";

import { BRAND } from "@/lib/brand";

export function AppShell({ system, children }: { system: System; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { t, lang, setLang } = useI18n();
  const brand = BRAND[system];

  // Initialize from persisted theme once mounted (avoids SSR/CSR mismatch).
  useEffect(() => {
    setDark(getStoredTheme() === "dark");
  }, []);

  useEffect(() => {
    persistTheme(dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (user) addAudit({ actor: user.email, action: "page_access", target: pathname });
  }, [pathname, user]);

  const allItems = NAV[system];
  const items = allItems;
  const currentSlug = pathname.split("/").slice(3).join("/") || "";
  const current = findNav(system, currentSlug);
  const isApps = system === "apps";

  return (
    <div
      className={`flex min-h-screen ${isApps ? "flex-col" : ""}`}
      data-system={system}
      style={{ background: brand.background, color: brand.foreground }}
    >

      {/* Sidebar (hidden for Prime Apps which uses bottom nav) */}
      {!isApps && (
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-border bg-card transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <Link to={`/${system}`} className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base text-white"
              style={{ background: brand.accent }}
            >
              {brand.faviconEmoji}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{brand.name}</div>
            </div>
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label={t("shell.close_menu")}>
            <X className="h-5 w-5" />
          </button>
        </div>



        <nav className="flex-1 overflow-y-auto p-3">
          <SidebarNav system={system} items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>

        <div className="shrink-0 border-t border-border p-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          © {new Date().getFullYear()} {brand.name}
        </div>


      </aside>
      )}

      {open && !isApps && (
        <div className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
          {!isApps && (
            <button className="md:hidden" onClick={() => setOpen(true)} aria-label={t("shell.open_menu")}>
              <Menu className="h-5 w-5" />
            </button>
          )}
          {isApps && (
            <Link to={`/${system}`} className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base text-white"
                style={{ background: brand.accent }}
              >
                {brand.faviconEmoji}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{brand.name}</div>
              </div>
            </Link>
          )}

          <nav className="hidden items-center gap-1.5 text-sm md:flex">
            {!isApps && <span className="text-muted-foreground">{brand.name}</span>}
            {!isApps && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-medium">{current?.label ?? "—"}</span>
          </nav>


          <div className="ml-auto flex flex-1 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="relative hidden max-w-sm flex-1 items-center gap-2 rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-left text-sm text-muted-foreground outline-none hover:bg-muted focus:ring-2 focus:ring-ring md:flex"
              aria-label={t("shell.search_ph")}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <span className="flex-1 truncate">{t("shell.search_ph")}</span>
              <kbd className="pointer-events-none hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">Ctrl+K</kbd>
            </button>

            <button
              onClick={() => setLang(lang === "id" ? "en" : "id")}
              className="rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("shell.switch_lang")}
              title={t("shell.switch_lang")}
            >
              {lang.toUpperCase()}
            </button>

            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("shell.toggle_theme")}
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
              onLogout={async () => {
                try { await supabase.auth.signOut(); } catch { /* ignore */ }
                logout(system);
                navigate({ to: `/${system}/login`, replace: true });
              }}
            />

          </div>
        </header>

        <main className={`min-w-0 flex-1 p-6 md:p-8 ${isApps ? "pb-24" : ""}`}>{children}</main>

        {/* Bottom navigation for Prime Apps — limited to 5 primary items */}
        {isApps && (() => {
          const PRIMARY_SLUGS = ["", "ai", "belanja", "chat", "profil"];
          const primary = PRIMARY_SLUGS
            .map((s) => items.find((it) => it.slug === s))
            .filter((it): it is NavItem => Boolean(it));
          const isItemActive = (slug: string) => {
            if (slug === "") return pathname === `/${system}` || pathname === `/${system}/`;
            return pathname === `/${system}/${slug}` || pathname.startsWith(`/${system}/${slug}/`);
          };
          return (
            <nav
              className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              aria-label="Bottom navigation"
            >
              <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1.5">
                {primary.map((it) => {
                  const href = it.slug ? `/${system}/${it.slug}` : `/${system}`;
                  const active = isItemActive(it.slug);
                  return (
                    <Link
                      key={it.label}
                      to={href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-2 pt-2 pb-1.5 text-[10px] transition-colors duration-200 ease-out ${
                        active
                          ? "text-navy dark:text-cyan-accent"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`pointer-events-none absolute left-1/2 top-0 h-0.5 -translate-x-1/2 rounded-full bg-current transition-all duration-300 ease-out ${
                          active ? "w-8 opacity-100" : "w-0 opacity-0"
                        }`}
                      />
                      <it.icon
                        className={`h-5 w-5 transition-transform duration-200 ease-out ${
                          active ? "scale-110" : "group-hover:scale-105"
                        }`}
                      />
                      <span className={`truncate transition-all duration-200 ${active ? "font-semibold" : "font-normal"}`}>
                        {it.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          );
        })()}
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
    const locked = it.status === "coming_soon";
    if (locked) {
      return (
        <div
          key={it.label}
          className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
          title="Modul akan segera tersedia"
        >
          <it.icon className="h-4 w-4" />
          <span className="truncate">{it.label}</span>
          <Lock className="ml-auto h-3 w-3" />
        </div>
      );
    }
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
