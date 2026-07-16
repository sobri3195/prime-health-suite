// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/lib/clinic.functions";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/apps-error";

const ACT: { value: string; label: string }[] = [
  { value: "all", label: "Semua aksi" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "page_access", label: "Page access" },
  { value: "role_change", label: "Role change" },
  { value: "export", label: "Export" },
  { value: "sync", label: "Sync" },
];

const PAGE_SIZE = 100;

type AuditRow = {
  id: string;
  ts: string;
  actor_email: string | null;
  actor_id: string | null;
  module: string;
  action: string;
  target: string | null;
};

export function AuditLogPage() {
  const call = useServerFn(listAudit);
  const [q, setQ] = useState("");
  const [act, setAct] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const auditQ = useQuery({
    queryKey: ["apps", "audit-log", act, q, limit],
    queryFn: () => call({
      data: {
        action: act === "all" ? undefined : act,
        q: q.trim() || undefined,
        limit,
      },
    }),
    staleTime: 15_000,
  });

  const items = useMemo(() => (auditQ.data ?? []) as AuditRow[], [auditQ.data]);
  const errMsg = auditQ.error ? friendlyError(auditQ.error, "Gagal memuat audit log") : null;

  return (
    <PageContainer>
      <PageHeader title="Audit Log" desc="Jejak aktivitas pengguna di seluruh platform (dari database)." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari aktor atau target…" />
        <Select value={act} onChange={setAct} options={ACT} />
        <div className="ml-auto text-xs text-muted-foreground">
          {auditQ.isFetching ? "Memuat…" : `${items.length} baris`}
        </div>
      </div>

      {errMsg ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {errMsg}
        </div>
      ) : items.length === 0 && !auditQ.isLoading ? (
        <EmptyState title="Tidak ada catatan audit" />
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Modul</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Target</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(a.ts).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2 text-xs">{a.actor_email ?? a.actor_id ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{a.module}</td>
                    <td className="px-4 py-2"><StatusBadge tone="info">{a.action}</StatusBadge></td>
                    <td className="px-4 py-2 font-mono text-xs">{a.target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length >= limit && (
            <div className="flex justify-center border-t border-border p-3">
              <Button size="sm" variant="outline" onClick={() => setLimit((n) => Math.min(500, n + PAGE_SIZE))}>
                Muat lebih banyak
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
