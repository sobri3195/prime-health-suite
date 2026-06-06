import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/finance/honor-potongan")({
  component: Page,
});

const PCT: Record<string, number> = {
  "dr. Rini, Sp.M": 40, "dr. Bagas, Sp.M": 45, "dr. Anisa, Sp.M": 45,
  "dr. Hadi, Sp.M(K)": 50, "dr. Tania, Sp.M": 40, "dr. Yusuf, Sp.M": 45,
};
const PPH21 = 0.05;

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);

  const rows = applyFilter(invoices, filter);
  const rekap = useMemo(() => {
    const map = new Map<string, { dokter: string; jasa: number; pph21: number; bpjsKes: number; lainnya: number; net: number }>();
    rows.forEach((r) => {
      const pct = PCT[r.doctor] ?? 40;
      const jasa = Math.round((r.total * pct) / 100);
      const ex = map.get(r.doctor) ?? { dokter: r.doctor, jasa: 0, pph21: 0, bpjsKes: 0, lainnya: 0, net: 0 };
      ex.jasa += jasa;
      map.set(r.doctor, ex);
    });
    return Array.from(map.values()).map((r) => {
      const pph21 = Math.round(r.jasa * PPH21);
      const bpjsKes = Math.round(r.jasa * 0.01);
      const lainnya = Math.round(r.jasa * 0.005);
      return { ...r, pph21, bpjsKes, lainnya, net: r.jasa - pph21 - bpjsKes - lainnya };
    }).sort((a, b) => b.jasa - a.jasa);
  }, [rows]);

  return (
    <div>
      <PageHeader title="Potongan Jasa Dokter" desc="Rincian potongan PPh 21, iuran BPJS Kes, dan lainnya atas jasa medis." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Dokter</TableHead>
            <TableHead className="text-right">Jasa Medis</TableHead>
            <TableHead className="text-right">PPh 21 (5%)</TableHead>
            <TableHead className="text-right">BPJS Kes (1%)</TableHead>
            <TableHead className="text-right">Lainnya (0.5%)</TableHead>
            <TableHead className="text-right">Take Home</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rekap.map((r) => (
              <TableRow key={r.dokter}>
                <TableCell className="text-sm">{r.dokter}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.jasa)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.pph21)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.bpjsKes)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-rose-600">-{formatIDR(r.lainnya)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-medium text-emerald-600">{formatIDR(r.net)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
