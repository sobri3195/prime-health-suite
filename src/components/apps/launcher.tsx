// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Stethoscope, Wallet, FileText, LifeBuoy, Plug, Users, ScrollText, Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { launcherItems } from "@/data/appsData";
import { PageHeader } from "@/components/app-shell";
import { SearchInput, useFiltered, PageContainer } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope, wallet: Wallet, "file-text": FileText,
  "life-buoy": LifeBuoy, plug: Plug, users: Users, "scroll-text": ScrollText,
};

export function LauncherPage() {
  const [q, setQ] = useState("");
  const filtered = useFiltered(launcherItems, q, ["name", "description", "category"]);
  return (
    <PageContainer>
      <PageHeader title="App Launcher" desc="Akses cepat ke seluruh aplikasi internal." />
      <SearchInput value={q} onChange={setQ} placeholder="Cari aplikasi…" />
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Tidak ada aplikasi yang cocok dengan pencarian.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const Icon = ICONS[a.icon] ?? Search;
            return (
              <Link
                key={a.id}
                to={a.to}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-navy-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.category}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{a.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
