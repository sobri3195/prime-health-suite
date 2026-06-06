import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { journals, type Journal } from "@/lib/journal";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/jurnal")({ component: JurnalPage });

const SOURCES = ["invoice", "payment", "expense", "refund", "tax", "bank"] as const;

function JurnalPage() {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [detail, setDetail] = useState<Journal | null>(null);

  const filtered = useMemo(() => journals.filter((j) => {
    if (source !== "all" && j.source !== source) return false;
    if (q && !`${j.number} ${j.description} ${j.sourceId}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [q, source]);

  const totalDebit = filtered.reduce((a, j) => a + j.lines.reduce((b, l) => b + l.debit, 0), 0);
  const totalCredit = filtered.reduce((a, j) => a + j.lines.reduce((b, l) => b + l.credit, 0), 0);

  const exportCSV = () => {
    const flat = filtered.flatMap((j) => j.lines.map((l) => ({ j, l })));
    const csv = toCSV(flat, [
      { key: "no", label: "No Jurnal", get: (r) => r.j.number },
      { key: "date", label: "Tanggal", get: (r) => new Date(r.j.date).toLocaleDateString("id-ID") },
      { key: "src", label: "Sumber", get: (r) => `${r.j.source}/${r.j.sourceId}` },
      { key: "desc", label: "Deskripsi", get: (r) => r.j.description },
      { key: "acc", label: "Akun", get: (r) => `${r.l.account} ${r.l.accountName}` },
      { key: "deb", label: "Debit", get: (r) => r.l.debit || "" },
      { key: "cre", label: "Kredit", get: (r) => r.l.credit || "" },
    ]);
    downloadCSV(exportFileName("jurnal", "all"), csv);
    toast.success(`Export ${filtered.length} jurnal (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Jurnal" desc="Jurnal otomatis dari invoice, pembayaran, pengeluaran, pajak, refund, dan mutasi bank." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Total Jurnal</div><div className="mt-1 text-xl font-semibold">{filtered.length}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Total Debit</div><div className="mt-1 text-xl font-semibold">{formatIDR(totalDebit)}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Total Kredit</div><div className="mt-1 text-xl font-semibold">{formatIDR(totalCredit)}</div></div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no jurnal / deskripsi…" className="pl-9" />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sumber</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No Jurnal</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Kredit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Tidak ada jurnal.</TableCell></TableRow>
            ) : filtered.slice(0, 80).map((j) => {
              const d = j.lines.reduce((a, l) => a + l.debit, 0);
              const c = j.lines.reduce((a, l) => a + l.credit, 0);
              return (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs">{j.number}</TableCell>
                  <TableCell className="text-xs">{new Date(j.date).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell><Badge variant="outline">{j.source}</Badge></TableCell>
                  <TableCell className="max-w-[280px] truncate text-sm">{j.description}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatIDR(d)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatIDR(c)}</TableCell>
                  <TableCell><Badge className="bg-emerald-500/15 text-emerald-600">{j.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setDetail(j)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.number}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{detail.description}</div>
              <div className="text-xs text-muted-foreground">Sumber: <span className="font-mono">{detail.source}/{detail.sourceId}</span></div>
              <Table>
                <TableHeader><TableRow><TableHead>Akun</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Kredit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detail.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{l.account} – {l.accountName}</TableCell>
                      <TableCell className="text-right font-mono">{l.debit ? formatIDR(l.debit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono">{l.credit ? formatIDR(l.credit) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
