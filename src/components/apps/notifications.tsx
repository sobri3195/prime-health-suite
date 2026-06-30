// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useState } from "react";
import { notifications as seed } from "@/data/apps-demo-seed";
import type { NotificationCategory, NotificationStatus } from "@/types/apps";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";

const CATS: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua kategori" },
  { value: "system", label: "Sistem" },
  { value: "approval", label: "Approval" },
  { value: "sync", label: "Sync" },
  { value: "claim", label: "Klaim/Piutang" },
  { value: "schedule", label: "Jadwal" },
  { value: "patient", label: "Data pasien" },
];
const STATS: { value: NotificationStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "unread", label: "Belum dibaca" },
  { value: "read", label: "Dibaca" },
  { value: "archived", label: "Diarsipkan" },
];

export function NotificationsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<NotificationCategory | "all">("all");
  const [st, setSt] = useState<NotificationStatus | "all">("all");

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return seed.filter(
      (n) =>
        (cat === "all" || n.category === cat) &&
        (st === "all" || n.status === st) &&
        (!qq || n.title.toLowerCase().includes(qq) || n.body.toLowerCase().includes(qq)),
    );
  }, [q, cat, st]);

  return (
    <PageContainer>
      <PageHeader title="Notifications" desc="Pusat notifikasi seluruh sistem." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari notifikasi…" />
        <Select value={cat} onChange={setCat} options={CATS} />
        <Select value={st} onChange={setSt} options={STATS} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="Tidak ada notifikasi" hint="Coba ubah filter atau kata kunci pencarian." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-4 p-4">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  n.severity === "critical"
                    ? "bg-destructive"
                    : n.severity === "warning"
                    ? "bg-amber-500"
                    : "bg-cyan-accent"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm ${n.status === "unread" ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                    {n.title}
                  </span>
                  <StatusBadge tone={n.status === "unread" ? "info" : n.status === "archived" ? "muted" : "ok"}>
                    {n.status}
                  </StatusBadge>
                  <StatusBadge tone="muted">{n.category}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(n.ts).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
