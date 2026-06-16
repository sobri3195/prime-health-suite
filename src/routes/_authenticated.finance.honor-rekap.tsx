import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { formatIDR } from "@/lib/finance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";
import { useFinanceDate } from "@/context/finance-date";
import { getHonorRekap } from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/_authenticated/finance/honor-rekap")({
  component: Page,
});

function Page() {
  const { from, to, label } = useFinanceDate();
  const call = useServerFn(getHonorRekap);
  const q = useQuery({
    queryKey: ["fin", "honor-rekap", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  const rekap = q.data?.rows ?? [];
  const totalJasa = useMemo(() => rekap.reduce((a, r) => a + r.jasa, 0), [rekap]);

  const exportCSV = () => {
    const csv = toCSV(rekap, [
      { key: "dokter", label: "Dokter", get: (r) => r.dokter },
      { key: "count", label: "Jumlah Trx", get: (r) => r.count },
      { key: "gross", label: "Gross", get: (r) => r.gross },
      { key: "pct", label: "% Jasa", get: (r) => r.pct },
      { key: "jasa", label: "Jasa Medis", get: (r) => r.jasa },
    ]);
    downloadCSV(exportFileName("honor-rekap", label), csv);
    toast.success(`Export ${rekap.length} dokter`);
  };

  return (
    <div>
      <PageHeader title="Rekap Jasa Medis Dokter" desc={`Akumulasi jasa medis per dokter (live, periode ${label}). % jasa dari master Dokter.`} />

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm">Total Jasa Medis: <span className="font-semibold">{formatIDR(totalJasa)}</span></div>
        <Button variant="outline" className="gap-1" onClick={exportCSV} disabled={!rekap.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
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
            {q.isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
            ) : rekap.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Tidak ada honor pada periode ini.</TableCell></TableRow>
            ) : rekap.map((r) => (
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
