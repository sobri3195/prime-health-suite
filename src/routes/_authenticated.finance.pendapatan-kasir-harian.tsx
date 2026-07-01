import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listInvoices } from "@/lib/finance-pendapatan.functions";
import { formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-kasir-harian")({
  
  head: () => pageHead({ title: "Pendapatan Kasir Harian — Finance", description: "Pendapatan Kasir Harian pada modul keuangan klinik.", path: "/finance/pendapatan-kasir-harian" }),
  component: Page,
});

type Inv = {
  id: string; tanggal: string; kasir: string | null; total: number;
  fin_pembayaran: Array<{ metode: string; jumlah: number }>;
};

function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const fn = useServerFn(listInvoices);
  const q = useQuery({
    queryKey: ["fin-invoices", "kasir", from, to],
    queryFn: () => fn({ data: { from, to } }),
  });
  const rows = (q.data?.rows ?? []) as Inv[];

  const recap = useMemo(() => {
    const map = new Map<string, { date: string; kasir: string; count: number; cash: number; nonCash: number; total: number }>();
    for (const r of rows) {
      const key = `${r.tanggal}|${r.kasir ?? "-"}`;
      const ex = map.get(key) ?? { date: r.tanggal, kasir: r.kasir ?? "-", count: 0, cash: 0, nonCash: 0, total: 0 };
      ex.count += 1; ex.total += Number(r.total);
      for (const p of r.fin_pembayaran ?? []) {
        if (p.metode === "cash") ex.cash += Number(p.jumlah);
        else ex.nonCash += Number(p.jumlah);
      }
      map.set(key, ex);
    }
    return Array.from(map.values()).sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [rows]);

  const exportCSV = () => {
    const csv = toCSV(recap, [
      { key: "date", label: "Tanggal", get: (r) => r.date },
      { key: "kasir", label: "Kasir", get: (r) => r.kasir },
      { key: "count", label: "Jumlah Trx", get: (r) => r.count },
      { key: "cash", label: "Cash", get: (r) => r.cash },
      { key: "nonCash", label: "Non-Cash", get: (r) => r.nonCash },
      { key: "total", label: "Total", get: (r) => r.total },
    ]);
    downloadCSV(exportFileName("kasir-harian", `${from}_${to}`), csv);
    toast.success(`Export ${recap.length} baris kasir`);
  };

  return (
    <div>
      <PageHeader title="Pendapatan Kasir Harian" desc="Rekap pendapatan per kasir per hari (data real-time)." />
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-1.5"><Label className="text-xs">Dari</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label className="text-xs">Sampai</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="ml-auto"><Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tanggal</TableHead><TableHead>Kasir</TableHead>
            <TableHead className="text-right">Jumlah Trx</TableHead>
            <TableHead className="text-right">Cash</TableHead>
            <TableHead className="text-right">Non-Cash</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {recap.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="text-sm">{r.kasir}</TableCell>
                <TableCell className="text-right text-sm">{r.count}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.cash)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.nonCash)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">{formatIDR(r.total)}</TableCell>
              </TableRow>
            ))}
            {!q.isLoading && recap.length === 0 && <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Belum ada data invoice di periode ini.</TableCell></TableRow>}
            {q.isLoading && <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
