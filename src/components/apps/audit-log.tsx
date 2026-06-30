// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useState, useSyncExternalStore } from "react";
import { getAudit, subscribeAudit } from "@/lib/audit-log";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";

// Dummy IP per actor for mock display only.
const ipFor = (actor: string) => {
  let h = 0;
  for (const c of actor) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `10.${(h >> 16) & 255}.${(h >> 8) & 255}.${h & 255}`;
};

const ACT: { value: string; label: string }[] = [
  { value: "all", label: "Semua aksi" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "page_access", label: "Page access" },
  { value: "role_change", label: "Role change" },
  { value: "export", label: "Export" },
  { value: "sync", label: "Sync" },
];

export function AuditLogPage() {
  const audit = useSyncExternalStore(
    (cb) => { const u = subscribeAudit(cb); return () => { u; }; },
    () => getAudit(),
    () => getAudit(),
  );
  const [q, setQ] = useState("");
  const [act, setAct] = useState("all");

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return audit.filter(
      (a) =>
        (act === "all" || a.action === act) &&
        (!qq || a.actor.toLowerCase().includes(qq) || a.target.toLowerCase().includes(qq)),
    );
  }, [audit, q, act]);

  return (
    <PageContainer>
      <PageHeader title="Audit Log" desc="Jejak aktivitas pengguna di seluruh platform." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari aktor atau target…" />
        <Select value={act} onChange={setAct} options={ACT} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="Tidak ada catatan audit" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Waktu</th><th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Aksi</th><th className="px-4 py-3">Modul/Target</th>
                <th className="px-4 py-3">IP</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 100).map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(a.ts).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-2">{a.actor}</td>
                  <td className="px-4 py-2"><StatusBadge tone="info">{a.action}</StatusBadge></td>
                  <td className="px-4 py-2 font-mono text-xs">{a.target}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{ipFor(a.actor)}</td>
                  <td className="px-4 py-2"><StatusBadge tone="ok">success</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
