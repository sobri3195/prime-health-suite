import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-kasir-harian")({
  component: Page,
});

const KASIRS = ["Sari Wulandari", "Andi Pratama", "Dewi Lestari"];

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);

  const rows = applyFilter(invoices, filter);
  // Group by date+kasir (deterministic mock kasir from id hash)
  const recap = useMemo(() => {
    const map = new Map<string, { date: string; kasir: string; total: number; count: number; cash: number; nonCash: number }>();
    rows.forEach((r) => {
      const date = new Date(r.date).toISOString().slice(0, 10);
      const kasir = KASIRS[r.id.charCodeAt(r.id.length - 1) % KASIRS.length];
      const key = `${date}|${kasir}`;
      const ex = map.get(key) ?? { date, kasir, total: 0, count: 0, cash: 0, nonCash: 0 };
      ex.total += r.total; ex.count += 1;
      if (r.payer === "Umum") ex.cash += r.total; else ex.nonCash += r.total;
      map.set(key, ex);
    });
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
    downloadCSV(exportFileName("kasir-harian", filter.period), csv);
    toast.success(`Export ${recap.length} baris kasir`);
  };

  return (
    <div>
      <PageHeader title="Pendapatan Kasir Harian" desc="Rekap pendapatan per kasir per hari." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />
      <div className="mb-3 flex justify-end">
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
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
            {recap.length === 0 && <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
