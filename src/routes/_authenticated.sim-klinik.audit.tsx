import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Search, ScrollText } from "lucide-react";
import { getAudit, subscribeAudit, type AuditEntry } from "@/lib/audit-log";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sim-klinik/audit")({
  component: AuditPage,
});

const ACTIONS: AuditEntry["action"][] = ["login", "logout", "page_access", "role_change", "export", "sync"];

const ACTION_STYLE: Record<AuditEntry["action"], string> = {
  login: "bg-emerald-500/15 text-emerald-600",
  logout: "bg-slate-500/15 text-slate-600",
  page_access: "bg-blue-500/15 text-blue-600",
  role_change: "bg-purple-500/15 text-purple-600",
  export: "bg-amber-500/15 text-amber-600",
  sync: "bg-cyan-500/15 text-cyan-600",
};

function AuditPage() {
  const [log, setLog] = useState<AuditEntry[]>(getAudit());
  const [q, setQ] = useState("");
  const [action, setAction] = useState<"all" | AuditEntry["action"]>("all");

  useEffect(() => subscribeAudit(() => setLog([...getAudit()])), []);

  const filtered = useMemo(() => log.filter((e) =>
    (action === "all" || e.action === action) &&
    (q === "" || e.actor.toLowerCase().includes(q.toLowerCase()) || e.target.toLowerCase().includes(q.toLowerCase())),
  ), [log, q, action]);

  const counters = useMemo(() => {
    const c: Record<string, number> = {};
    ACTIONS.forEach((a) => (c[a] = 0));
    log.forEach((e) => (c[e.action] = (c[e.action] ?? 0) + 1));
    return c;
  }, [log]);

  const exportCsv = () => {
    const header = "timestamp,actor,action,target\n";
    const rows = filtered.map((e) => `${e.ts},${e.actor},${e.action},"${e.target}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log diekspor");
  };

  return (
    <div>
      <PageHeader
        title="Audit Log Klinik"
        desc="Jejak aktivitas pengguna: login, akses halaman, perubahan role, ekspor data, dan sinkronisasi antar modul."
      />

      <div className="mb-4 grid grid-cols-3 gap-2 md:grid-cols-6">
        {ACTIONS.map((a) => (
          <div key={a} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.replace("_", " ")}</div>
            <div className="mt-1 text-lg font-semibold">{counters[a]}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktor atau target…" className="pl-9" />
        </div>
        <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua aksi</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1">
            <Download className="h-4 w-4" /> Ekspor CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  <ScrollText className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  Tidak ada entri audit yang cocok.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(e.ts).toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-sm font-medium">{e.actor}</TableCell>
                <TableCell>
                  <Badge className={ACTION_STYLE[e.action]}>{e.action}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{e.target}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {e.meta ? <code className="rounded bg-muted px-1.5 py-0.5">{JSON.stringify(e.meta)}</code> : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
