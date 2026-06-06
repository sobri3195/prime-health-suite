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

export const Route = createFileRoute("/_authenticated/finance/honor-rekap")({
  component: Page,
});

const PCT: Record<string, number> = {
  "dr. Rini, Sp.M": 40, "dr. Bagas, Sp.M": 45, "dr. Anisa, Sp.M": 45,
  "dr. Hadi, Sp.M(K)": 50, "dr. Tania, Sp.M": 40, "dr. Yusuf, Sp.M": 45,
};

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);

  const rows = applyFilter(invoices, filter);
  const rekap = useMemo(() => {
    const map = new Map<string, { dokter: string; gross: number; pct: number; jasa: number; count: number }>();
    rows.forEach((r) => {
      const pct = PCT[r.doctor] ?? 40;
      const ex = map.get(r.doctor) ?? { dokter: r.doctor, gross: 0, pct, jasa: 0, count: 0 };
      ex.gross += r.total; ex.count += 1; ex.jasa += Math.round((r.total * pct) / 100);
      map.set(r.doctor, ex);
    });
    return Array.from(map.values()).sort((a, b) => b.jasa - a.jasa);
  }, [rows]);

  const totalJasa = rekap.reduce((a, r) => a + r.jasa, 0);

  const exportCSV = () => {
    const csv = toCSV(rekap, [
      { key: "dokter", label: "Dokter", get: (r) => r.dokter },
      { key: "count", label: "Jumlah Trx", get: (r) => r.count },
      { key: "gross", label: "Gross", get: (r) => r.gross },
      { key: "pct", label: "% Jasa", get: (r) => r.pct },
      { key: "jasa", label: "Jasa Medis", get: (r) => r.jasa },
    ]);
    downloadCSV(exportFileName("honor-rekap", filter.period), csv);
    toast.success(`Export ${rekap.length} dokter`);
  };

  return (
    <div>
      <PageHeader title="Rekap Jasa Medis Dokter" desc="Akumulasi jasa medis per dokter dalam periode terpilih." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm">Total Jasa Medis: <span className="font-semibold">{formatIDR(totalJasa)}</span></div>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Dokter</TableHead>
            <TableHead className="text-right">Trx</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Jasa Medis</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rekap.map((r) => (
              <TableRow key={r.dokter}>
                <TableCell className="text-sm">{r.dokter}</TableCell>
                <TableCell className="text-right text-sm">{r.count}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.gross)}</TableCell>
                <TableCell className="text-right text-sm">{r.pct}%</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium text-emerald-600">{formatIDR(r.jasa)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
