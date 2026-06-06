import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, RefreshCw, Download, CheckCircle2, Landmark } from "lucide-react";
import { toast } from "sonner";
import { master } from "@/data/financeData";
import { bankMutations as seed, openingBankBalance } from "@/data/financeSources";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/bank")({ component: BankPage });

function BankPage() {
  const [bankId, setBankId] = useState("all");
  const [rows, setRows] = useState(seed);

  const filtered = useMemo(() =>
    rows.filter((m) => bankId === "all" || m.bankId === bankId), [rows, bankId]);

  const inflow = filtered.filter((m) => m.amount > 0).reduce((a, m) => a + m.amount, 0);
  const outflow = filtered.filter((m) => m.amount < 0).reduce((a, m) => a + Math.abs(m.amount), 0);
  const closing = openingBankBalance + inflow - outflow;
  const unmatched = filtered.filter((m) => !m.matched).length;

  const autoMatch = () => {
    setRows((arr) => arr.map((m) => m.matchedRef ? { ...m, matched: true } : m));
    toast.success("Auto-match selesai. Mutasi dengan referensi invoice/expense direkonsiliasi.");
  };

  const uploadMock = () => toast.success("File CSV/XLS diunggah (mock). 12 baris mutasi terdeteksi.");

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "date", label: "Tanggal", get: (r) => new Date(r.date).toLocaleDateString("id-ID") },
      { key: "bank", label: "Bank", get: (r) => master.banks.find((b) => b.id === r.bankId)?.name ?? r.bankId },
      { key: "description", label: "Deskripsi", get: (r) => r.description },
      { key: "in", label: "Masuk", get: (r) => r.amount > 0 ? r.amount : "" },
      { key: "out", label: "Keluar", get: (r) => r.amount < 0 ? Math.abs(r.amount) : "" },
      { key: "matched", label: "Reconciled", get: (r) => r.matched ? "Yes" : "No" },
      { key: "ref", label: "Referensi", get: (r) => r.matchedRef ?? "" },
    ]);
    downloadCSV(exportFileName("bank", bankId === "all" ? "all" : bankId), csv);
    toast.success(`Export ${filtered.length} mutasi (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Bank & Rekonsiliasi" desc="Master rekening, mutasi, dan rekonsiliasi pembayaran invoice & pengeluaran." />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          { l: "Saldo Awal", v: openingBankBalance },
          { l: "Total Masuk", v: inflow, c: "text-emerald-600" },
          { l: "Total Keluar", v: outflow, c: "text-rose-600" },
          { l: "Saldo Akhir", v: closing },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className={`mt-1 text-xl font-semibold ${k.c ?? ""}`}>{formatIDR(k.v)}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="mutasi">
        <TabsList>
          <TabsTrigger value="mutasi">Mutasi & Rekonsiliasi</TabsTrigger>
          <TabsTrigger value="master">Master Rekening</TabsTrigger>
        </TabsList>

        <TabsContent value="mutasi" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rekening</SelectItem>
                {master.banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} {b.account}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-1" onClick={uploadMock}><Upload className="h-4 w-4" /> Upload Mutasi</Button>
            <Button variant="outline" className="gap-1" onClick={autoMatch}><RefreshCw className="h-4 w-4" /> Auto-Match</Button>
            <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
            <div className="ml-auto text-xs text-muted-foreground">Belum rekonsiliasi: <span className="font-semibold text-amber-600">{unmatched}</span></div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Keluar</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Tidak ada mutasi.</TableCell></TableRow>
                ) : filtered.slice(0, 50).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{new Date(m.date).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="text-xs">{master.banks.find((b) => b.id === m.bankId)?.name}</TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600">{m.amount > 0 ? formatIDR(m.amount) : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-rose-600">{m.amount < 0 ? formatIDR(Math.abs(m.amount)) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{m.matchedRef ?? "—"}</TableCell>
                    <TableCell>
                      {m.matched
                        ? <Badge className="gap-1 bg-emerald-500/15 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Reconciled</Badge>
                        : <Badge variant="outline">Open</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="master">
          <div className="grid gap-3 sm:grid-cols-3">
            {master.banks.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Landmark className="h-4 w-4 text-primary" /> {b.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{b.account}</div>
                <div className="mt-3 text-lg font-semibold">{formatIDR(b.balance)}</div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
