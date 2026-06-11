import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/pajak-pph-honor")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const PCT: Record<string, number> = {
  "dr. Rini, Sp.M": 40, "dr. Bagas, Sp.M": 45, "dr. Anisa, Sp.M": 45,
  "dr. Hadi, Sp.M(K)": 50, "dr. Tania, Sp.M": 40, "dr. Yusuf, Sp.M": 45,
};
const PPH_RATE = 0.025; // PPh 21 final atas jasa dokter (estimasi 2.5%)

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);
  const rows = applyFilter(invoices, filter);

  const rekap = useMemo(() => {
    const m = new Map<string, { dokter: string; gross: number; jasa: number; pph: number; net: number; count: number }>();
    rows.forEach((r) => {
      const pct = PCT[r.doctor] ?? 40;
      const jasa = Math.round((r.total * pct) / 100);
      const pph = Math.round(jasa * PPH_RATE);
      const cur = m.get(r.doctor) ?? { dokter: r.doctor, gross: 0, jasa: 0, pph: 0, net: 0, count: 0 };
      cur.count += 1; cur.gross += r.total; cur.jasa += jasa; cur.pph += pph; cur.net += jasa - pph;
      m.set(r.doctor, cur);
    });
    return Array.from(m.values()).sort((a, z) => z.pph - a.pph);
  }, [rows]);

  const totals = rekap.reduce((a, r) => ({ jasa: a.jasa + r.jasa, pph: a.pph + r.pph, net: a.net + r.net }), { jasa: 0, pph: 0, net: 0 });

  const exportCsv = () => {
    const csv = toCSV(rekap, [
      { key: "dokter", label: "Dokter", get: (r) => r.dokter },
      { key: "count", label: "Tindakan", get: (r) => r.count },
      { key: "jasa", label: "Jasa Medis (Bruto)", get: (r) => r.jasa },
      { key: "pph", label: "PPh (2.5%)", get: (r) => r.pph },
      { key: "net", label: "Diterima Net", get: (r) => r.net },
    ]);
    downloadCSV(`pph-honor-${filter.period}.csv`, csv);
  };

  return (
    <div>
      <PageHeader title="PPh Honor Dokter" desc="Estimasi PPh 21 atas jasa medis dokter (tarif final 2.5%). Bisa diadjust per kontrak." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total Jasa Bruto" value={fmt(totals.jasa)} />
        <Kpi label="PPh Terhutang" value={fmt(totals.pph)} />
        <Kpi label="Diterima Dokter (Net)" value={fmt(totals.net)} />
      </div>
      <div className="mb-2 flex justify-end"><Button variant="outline" size="sm" onClick={exportCsv} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Dokter</TableHead><TableHead className="text-right">Tindakan</TableHead>
            <TableHead className="text-right">Jasa (Bruto)</TableHead><TableHead className="text-right">PPh (2.5%)</TableHead>
            <TableHead className="text-right">Net</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rekap.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
              : rekap.map((r) => (
                <TableRow key={r.dokter}>
                  <TableCell>{r.dokter}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.jasa)}</TableCell>
                  <TableCell className="text-right font-mono text-rose-600">{fmt(r.pph)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(r.net)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
