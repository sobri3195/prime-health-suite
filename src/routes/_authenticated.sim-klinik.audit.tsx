import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ScrollText } from "lucide-react";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import { ExportBar, defaultRange, type DateRange } from "@/components/export-bar";
import { exportCsv, exportPdf, type Column } from "@/lib/exporter";
import { listAudit } from "@/lib/clinic.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/audit")({
  component: AuditPage,
});

const MODULES = ["Pasien", "Registrasi", "Jadwal", "Tindakan", "Resep", "Billing", "Dokumen", "Settings", "Auth"];

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-600",
  update: "bg-blue-500/15 text-blue-600",
  delete: "bg-rose-500/15 text-rose-600",
  upload: "bg-cyan-500/15 text-cyan-600",
  save: "bg-amber-500/15 text-amber-600",
  login: "bg-emerald-500/15 text-emerald-600",
  logout: "bg-slate-500/15 text-slate-600",
};

type AuditRow = {
  id: string; ts: string; actor_email: string | null; actor_role: string | null;
  module: string; action: string; target: string | null; meta: unknown;
};

function AuditPage() {
  const [q, setQ] = useState("");
  const [moduleF, setModuleF] = useState("all");
  const [actor, setActor] = useState("");
  const [range, setRange] = useState<DateRange>(defaultRange(30));

  const fn = useServerFn(listAudit);
  const { data, isLoading } = useQuery({
    queryKey: ["audit", q, moduleF, actor, range.from, range.to],
    queryFn: () => fn({ data: {
      q: q || undefined,
      module: moduleF === "all" ? undefined : moduleF,
      actor: actor || undefined,
      from: range.from ? `${range.from}T00:00:00Z` : undefined,
      to: range.to ? `${range.to}T23:59:59Z` : undefined,
      limit: 500,
    } }),
  });

  const rows = (data ?? []) as AuditRow[];

  const moduleCounts = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.module] = (m[r.module] ?? 0) + 1));
    return m;
  }, [rows]);

  const cols: Column<AuditRow>[] = [
    { key: "ts", header: "Waktu", format: (r) => new Date(r.ts).toLocaleString("id-ID") },
    { key: "actor_email", header: "Aktor", format: (r) => r.actor_email ?? "—" },
    { key: "actor_role", header: "Role", format: (r) => r.actor_role ?? "—" },
    { key: "module", header: "Modul" },
    { key: "action", header: "Aksi" },
    { key: "target", header: "Target", format: (r) => r.target ?? "—" },
    { key: "meta", header: "Meta", format: (r) => (r.meta ? JSON.stringify(r.meta) : "—") },
  ];

  return (
    <div>
      <PageHeader title="Audit Log Klinik" desc="Jejak aktivitas pengguna lintas modul. Filter berdasarkan user, modul, dan rentang waktu." />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari target / email…" className="pl-9" />
        </div>
        <Select value={moduleF} onValueChange={setModuleF}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua modul</SelectItem>
            {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Email user…" className="w-48" />
        <ExportBar
          range={range}
          onRange={setRange}
          onCsv={() => exportCsv(`audit-${range.from}_${range.to}.csv`, cols, rows, range)}
          onPdf={() => exportPdf(`audit-${range.from}_${range.to}.pdf`, "Audit Log Klinik", cols, rows, range)}
        />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 md:grid-cols-6">
        {MODULES.map((m) => (
          <div key={m} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m}</div>
            <div className="mt-1 text-lg font-semibold">{moduleCounts[m] ?? 0}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="Tidak ada entri audit" hint="Coba ubah filter atau perluas rentang tanggal." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead><TableHead>Aktor</TableHead><TableHead>Modul</TableHead>
                <TableHead>Aksi</TableHead><TableHead>Target</TableHead><TableHead>Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(e.ts).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{e.actor_email ?? "—"}</div>
                    {e.actor_role && <div className="text-xs text-muted-foreground">{e.actor_role}</div>}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{e.module}</Badge></TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ACTION_STYLE[e.action] ?? "bg-muted text-muted-foreground"}`}>
                      {e.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.target ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.meta ? <code className="rounded bg-muted px-1.5 py-0.5">{JSON.stringify(e.meta)}</code> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && rows.length === 0 && <ScrollText className="hidden" />}
    </div>
  );
}
