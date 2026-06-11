import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Search } from "lucide-react";
import { getAudit, subscribeAudit, type AuditEntry } from "@/lib/audit-log";
import { useFinanceAccess } from "@/lib/finance-access";
import { useFinanceDate } from "@/context/finance-date";
import { FinanceExportBar } from "@/components/finance-export-bar";

export const Route = createFileRoute("/_authenticated/finance/audit")({
  component: FinanceAuditPage,
});

const ACTION_TONE: Record<AuditEntry["action"], string> = {
  login: "bg-emerald-500/15 text-emerald-600",
  logout: "bg-muted text-muted-foreground",
  page_access: "bg-blue-500/15 text-blue-600",
  role_change: "bg-amber-500/15 text-amber-600",
  export: "bg-cyan-500/15 text-cyan-600",
  sync: "bg-violet-500/15 text-violet-600",
};

function FinanceAuditPage() {
  const { isAdmin } = useFinanceAccess();
  const { from, to } = useFinanceDate();
  const [, setTick] = useState(0);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | AuditEntry["action"]>("all");

  useEffect(() => subscribeAudit(() => setTick((t) => t + 1)), []);

  const rows = useMemo(() => {
    const fromT = new Date(from + "T00:00:00").getTime();
    const toT = new Date(to + "T23:59:59").getTime();
    return getAudit()
      .filter((r) => {
        // scope to finance-related entries + auth (login/role)
        const isFinance = r.target?.startsWith("finance/") || r.target?.startsWith("auth:finance") || r.action === "role_change" || r.action === "login" || r.action === "logout";
        if (!isFinance) return false;
        if (actionFilter !== "all" && r.action !== actionFilter) return false;
        const t = new Date(r.ts).getTime();
        if (t < fromT || t > toT) return false;
        if (q) {
          const needle = q.toLowerCase();
          const hay = `${r.actor} ${r.target} ${JSON.stringify(r.meta ?? {})}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      });
  }, [from, to, q, actionFilter]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Audit Log Finance" desc="Akses ditolak." />
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm">
          <ShieldAlert className="mb-2 h-5 w-5 text-rose-500" />
          Hanya pengguna dengan peran <b>Super Admin / Finance Manager / Accounting</b> yang dapat melihat audit log.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Audit Log Finance" desc="Jejak aksi pengguna di modul Finance — login, perubahan data, ekspor laporan." />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktor / target / metadata…" className="pl-9" />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
        >
          <option value="all">Semua aksi</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="page_access">Page access</option>
          <option value="role_change">Mutasi data / role</option>
          <option value="export">Export</option>
          <option value="sync">Sync</option>
        </select>
        <FinanceExportBar
          resource="audit-log"
          title="Audit Log Finance"
          columns={[
            { key: "ts", header: "Waktu", format: (r: AuditEntry) => new Date(r.ts).toLocaleString("id-ID") },
            { key: "actor", header: "Aktor" },
            { key: "action", header: "Aksi" },
            { key: "target", header: "Target" },
            { key: "meta", header: "Metadata", format: (r: AuditEntry) => JSON.stringify(r.meta ?? {}) },
          ]}
          rows={rows}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Tidak ada audit log untuk periode ini.</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{new Date(r.ts).toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-sm">{r.actor}</TableCell>
                <TableCell><Badge className={`${ACTION_TONE[r.action]} border-0`} variant="secondary">{r.action}</Badge></TableCell>
                <TableCell className="text-sm">{r.target}</TableCell>
                <TableCell className="max-w-md truncate font-mono text-[11px] text-muted-foreground">{r.meta ? JSON.stringify(r.meta) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Total {rows.length} entri dalam periode dipilih</div>
    </div>
  );
}
