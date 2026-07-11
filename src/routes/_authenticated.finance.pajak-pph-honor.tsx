import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { downloadCSV, toCSV } from "@/lib/export";
import { useFinanceDate } from "@/context/finance-date";
import { getHonorRekap } from "@/lib/finance-dashboard.functions";
import { formatIDR } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/pajak-pph-honor")({
  head: () => pageHead({ title: "PPh Honor Dokter — Finance", description: "PPh Honor Dokter pada modul keuangan klinik.", path: "/finance/pajak-pph-honor" }),
  component: Page,
});

const PPH_RATE = 0.025;

function Page() {
  const { from, to, label } = useFinanceDate();
  const call = useServerFn(getHonorRekap);
  const q = useQuery({
    queryKey: ["fin", "honor-pph", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  const rekap = useMemo(() => {
    return (q.data?.rows ?? []).map((r) => {
      const pph = Math.round(r.jasa * PPH_RATE);
      return { dokter: r.dokter, count: r.count, jasa: r.jasa, pph, net: r.jasa - pph };
    }).sort((a, z) => z.pph - a.pph);
  }, [q.data]);

  const totals = rekap.reduce((a, r) => ({ jasa: a.jasa + r.jasa, pph: a.pph + r.pph, net: a.net + r.net }), { jasa: 0, pph: 0, net: 0 });

  const exportCsv = () => {
    const csv = toCSV(rekap, [
      { key: "dokter", label: "Dokter", get: (r) => r.dokter },
      { key: "count", label: "Tindakan", get: (r) => r.count },
      { key: "jasa", label: "Jasa Medis (Bruto)", get: (r) => r.jasa },
      { key: "pph", label: "PPh (2.5%)", get: (r) => r.pph },
      { key: "net", label: "Diterima Net", get: (r) => r.net },
    ]);
    downloadCSV(`pph-honor-${from}_${to}.csv`, csv);
  };

  return (
    <div>
      <PageHeader title="PPh Honor Dokter" desc={`Estimasi PPh 21 atas jasa medis dokter (2.5%) — periode ${label}.`} />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total Jasa Bruto" value={formatIDR(totals.jasa)} />
        <Kpi label="PPh Terhutang" value={formatIDR(totals.pph)} />
        <Kpi label="Diterima Dokter (Net)" value={formatIDR(totals.net)} />
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
            {q.isLoading ? <TableRow><TableCell colSpan={5} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rekap.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
              : rekap.map((r) => (
                <TableRow key={r.dokter}>
                  <TableCell>{r.dokter}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right font-mono">{formatIDR(r.jasa)}</TableCell>
                  <TableCell className="text-right font-mono text-rose-600">{formatIDR(r.pph)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatIDR(r.net)}</TableCell>
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
