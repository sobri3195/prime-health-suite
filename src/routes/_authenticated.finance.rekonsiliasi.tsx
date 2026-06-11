import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Wand2, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useFinanceDate } from "@/context/finance-date";
import { useFinanceAccess } from "@/lib/finance-access";
import { listBankStatement, importBankStatement, autoMatchStatement, unmatchStatement, adjustStatement, reconSummary } from "@/lib/finance-recon.functions";
import { parseBankCsv } from "@/lib/exporter";

export const Route = createFileRoute("/_authenticated/finance/rekonsiliasi")({
  component: RekonsiliasiPage,
});

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function RekonsiliasiPage() {
  const { from, to } = useFinanceDate();
  const { canEdit, user } = useFinanceAccess();
  const qc = useQueryClient();
  const [bank, setBank] = useState("BCA");

  const listFn = useServerFn(listBankStatement);
  const importFn = useServerFn(importBankStatement);
  const matchFn = useServerFn(autoMatchStatement);
  const unmatchFn = useServerFn(unmatchStatement);
  const adjFn = useServerFn(adjustStatement);
  const sumFn = useServerFn(reconSummary);

  const { data: list, isLoading } = useQuery({ queryKey: ["bs", from, to, bank], queryFn: () => listFn({ data: { from, to, bank } }) });
  const { data: sum } = useQuery({ queryKey: ["bs-sum", from, to, bank], queryFn: () => sumFn({ data: { from, to, bank } }) });

  const rows = list?.rows ?? [];

  // import dialog
  const [openImport, setOpenImport] = useState(false);
  const [csv, setCsv] = useState("");
  const parsed = useMemo(() => parseBankCsv(csv), [csv]);
  const validRows = parsed.rows.filter((r) => r.debit > 0 || r.kredit > 0);
  const importM = useMutation({
    mutationFn: () => importFn({ data: { bank, rows: validRows, actor: user?.email } }),
    onSuccess: (r) => { toast.success(`${r.count} mutasi diimport`); setCsv(""); setOpenImport(false); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const matchM = useMutation({
    mutationFn: () => matchFn({ data: { bank, from, to, actor: user?.email } }),
    onSuccess: (r) => { toast.success(`${r.matched} entri tercocok otomatis`); qc.invalidateQueries(); },
  });
  const unmatchM = useMutation({ mutationFn: (id: string) => unmatchFn({ data: { statement_id: id, actor: user?.email } }), onSuccess: () => { toast.success("Unmatched"); qc.invalidateQueries(); } });

  // adjust dialog
  const [adjOpen, setAdjOpen] = useState(false);
  const [adj, setAdj] = useState<{ statement_id?: string; coa_debit: string; coa_kredit: string; amount: number; keterangan: string }>({ coa_debit: "5900", coa_kredit: "1110", amount: 0, keterangan: "" });
  const adjM = useMutation({
    mutationFn: () => adjFn({ data: { ...adj, statement_id: adj.statement_id!, actor: user?.email } }),
    onSuccess: (r) => { toast.success(`Jurnal ${r.no_jurnal} dibuat`); setAdjOpen(false); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const selisih = (sum?.bookBalance ?? 0) - (sum?.lastSaldo ?? sum?.bookBalance ?? 0);

  return (
    <div>
      <PageHeader title="Rekonsiliasi Kas & Bank" desc="Bandingkan saldo buku besar dengan mutasi bank, tandai selisih, buat jurnal penyesuaian." />

      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <Kpi label="Saldo Buku" value={fmt(sum?.bookBalance ?? 0)} />
        <Kpi label="Saldo Bank (last)" value={sum?.lastSaldo != null ? fmt(sum.lastSaldo) : "—"} />
        <Kpi label="Selisih" value={fmt(selisih)} tone={Math.abs(selisih) > 1 ? "warn" : "ok"} />
        <Kpi label="Matched" value={`${sum?.matched ?? 0} / ${sum?.total ?? 0}`} tone="ok" />
        <Kpi label="Unmatched" value={String(sum?.unmatched ?? 0)} tone={sum?.unmatched ? "warn" : "ok"} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Label className="text-xs">Bank</Label>
        <Input className="w-40" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BCA / Mandiri" />
        <Button variant="outline" disabled={!canEdit} onClick={() => setOpenImport(true)}><Upload className="mr-1 h-4 w-4" /> Import CSV</Button>
        <Button variant="outline" disabled={!canEdit || matchM.isPending} onClick={() => matchM.mutate()}><Wand2 className="mr-1 h-4 w-4" /> Auto-Match</Button>
        <Button variant="outline" onClick={() => qc.invalidateQueries()}><RefreshCw className="mr-1 h-4 w-4" /> Refresh</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tanggal</TableHead><TableHead>Deskripsi</TableHead>
            <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Kredit</TableHead>
            <TableHead className="text-right">Saldo</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Belum ada mutasi. Import CSV dulu.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.tanggal}</TableCell>
                  <TableCell className="text-sm">{r.deskripsi}</TableCell>
                  <TableCell className="text-right font-mono text-rose-700">{r.debit ? fmt(r.debit) : ""}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700">{r.kredit ? fmt(r.kredit) : ""}</TableCell>
                  <TableCell className="text-right font-mono">{r.saldo != null ? fmt(r.saldo) : "—"}</TableCell>
                  <TableCell>{r.matched ? <Badge className="bg-emerald-500/15 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> matched</Badge> : <Badge variant="outline">unmatched</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {r.matched ? <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => unmatchM.mutate(r.id)}>Unmatch</Button>
                      : <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => { setAdj({ statement_id: r.id, coa_debit: r.debit > 0 ? "5900" : "1110", coa_kredit: r.debit > 0 ? "1110" : "4100", amount: r.debit || r.kredit, keterangan: r.deskripsi }); setAdjOpen(true); }}>Jurnal Penyesuaian</Button>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Import dialog */}
      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import Mutasi Bank ({bank})</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Paste CSV. Header wajib mengandung kolom: <code>tanggal, deskripsi, debit, kredit</code>. Opsional: <code>saldo, ref</code>. Format tanggal: <code>YYYY-MM-DD</code>.</p>
            <Textarea rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={`tanggal,deskripsi,debit,kredit,saldo\n2026-06-01,Setoran kasir,0,5000000,15000000`} />
            {preview.length > 0 && <div className="rounded border p-2 text-xs">Preview {preview.length}/{parseCsv(csv).length}: {preview.map((p, i) => <div key={i}>{p.tanggal} • {p.deskripsi} • D {fmt(p.debit)} • K {fmt(p.kredit)}</div>)}</div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenImport(false)}>Batal</Button><Button onClick={() => importM.mutate()} disabled={!csv || importM.isPending}>Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment dialog */}
      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jurnal Penyesuaian Rekonsiliasi</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>COA Debit</Label><Input value={adj.coa_debit} onChange={(e) => setAdj({ ...adj, coa_debit: e.target.value })} /></div>
              <div><Label>COA Kredit</Label><Input value={adj.coa_kredit} onChange={(e) => setAdj({ ...adj, coa_kredit: e.target.value })} /></div>
            </div>
            <div><Label>Jumlah</Label><Input type="number" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: Number(e.target.value) })} /></div>
            <div><Label>Keterangan</Label><Textarea rows={2} value={adj.keterangan} onChange={(e) => setAdj({ ...adj, keterangan: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdjOpen(false)}>Batal</Button><Button onClick={() => adjM.mutate()} disabled={adjM.isPending}>Post Jurnal</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}
