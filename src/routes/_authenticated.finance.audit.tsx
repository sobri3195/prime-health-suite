import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { useFinanceDate } from "@/context/finance-date";
import { listFinAudit } from "@/lib/finance-report.functions";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useFinanceAccess } from "@/lib/finance-access";

export const Route = createFileRoute("/_authenticated/finance/audit")({ 
  head: () => pageHead({ title: "Audit Log Finance — Finance", description: "Audit Log Finance pada modul keuangan klinik.", path: "/finance/audit" }),
  component: AuditPage });

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700",
  edit: "bg-blue-500/15 text-blue-700",
  void: "bg-rose-500/15 text-rose-700",
  delete: "bg-rose-500/15 text-rose-700",
  pay: "bg-violet-500/15 text-violet-700",
  post: "bg-cyan-500/15 text-cyan-700",
  reconcile: "bg-amber-500/15 text-amber-700",
  import: "bg-slate-500/15 text-slate-700",
  unmatch: "bg-amber-500/15 text-amber-700",
};

function AuditPage() {
  const { isAdmin } = useFinanceAccess();
  const { from, to } = useFinanceDate();
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [detail, setDetail] = useState<any | null>(null);
  const fn = useServerFn(listFinAudit);
  const { data, isLoading } = useQuery({
    queryKey: ["fin-audit", from, to, q, entity, action],
    queryFn: () => fn({ data: { from, to, q: q || undefined, entity: entity === "all" ? undefined : entity, action: action === "all" ? undefined : action } }),
  });
  const rows = data?.rows ?? [];

  if (!isAdmin) {
    return <div><PageHeader title="Audit Log Finance" desc="Akses ditolak — hanya admin." /></div>;
  }

  return (
    <div>
      <PageHeader title="Audit Log Finance" desc="Jejak setiap aksi finance: siapa, kapan, perubahan field, alasan void." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aktor / no. / alasan…" className="pl-9" />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua entity</SelectItem>
            {["invoice", "payment", "expense", "journal", "bank_statement", "mdr_rule", "template_invoice", "template_voucher"].map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua aksi</SelectItem>
            {Object.keys(ACTION_TONE).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Waktu</TableHead><TableHead>Aktor</TableHead><TableHead>Aksi</TableHead>
            <TableHead>Entity</TableHead><TableHead>No / ID</TableHead>
            <TableHead>Field Berubah</TableHead><TableHead>Alasan</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-6 text-center">Loading…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Belum ada audit log.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{new Date(r.created_at).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-sm">{r.actor_email ?? "system"}</TableCell>
                  <TableCell><Badge className={`${ACTION_TONE[r.action] ?? "bg-muted text-foreground"} border-0`} variant="secondary">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_no ?? r.entity_id ?? "—"}</TableCell>
                  <TableCell className="text-xs">{(r.changed_fields ?? []).slice(0, 5).map((f: string) => <Badge key={f} variant="outline" className="mr-1 mb-1 text-[10px]">{f}</Badge>)}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Total {rows.length} entri (max 500).</div>
    </div>
  );
}
