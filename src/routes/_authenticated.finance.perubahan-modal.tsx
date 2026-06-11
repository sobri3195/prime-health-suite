import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBalanceSheet, getProfitLoss } from "@/lib/finance-report.functions";
import { useFinanceDate } from "@/context/finance-date";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/perubahan-modal")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const { from, to } = useFinanceDate();
  const bsFn = useServerFn(getBalanceSheet);
  const plFn = useServerFn(getProfitLoss);
  const bs = useQuery({ queryKey: ["fin-bs", to], queryFn: () => bsFn({ data: { to } }) });
  const pl = useQuery({ queryKey: ["fin-pl-mod", from, to], queryFn: () => plFn({ data: { from, to } }) });
  const loading = bs.isLoading || pl.isLoading;

  const modalAwal = (bs.data?.totalEquity ?? 0) - (pl.data?.profit ?? 0);
  const laba = pl.data?.profit ?? 0;
  const modalAkhir = bs.data?.totalEquity ?? 0;

  return (
    <div>
      <PageHeader title="Laporan Perubahan Modal" desc={`Periode ${from || "—"} s/d ${to || "—"}`} />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Komponen</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={2} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow> : (
              <>
                <TableRow><TableCell>Modal Awal (Estimasi)</TableCell><TableCell className="text-right font-mono">{fmt(modalAwal)}</TableCell></TableRow>
                <TableRow><TableCell>(+) Laba/(Rugi) Periode</TableCell><TableCell className="text-right font-mono">{fmt(laba)}</TableCell></TableRow>
                <TableRow><TableCell>(–) Prive / Dividen</TableCell><TableCell className="text-right font-mono">{fmt(0)}</TableCell></TableRow>
                <TableRow className="font-semibold"><TableCell>Modal Akhir</TableCell><TableCell className="text-right font-mono">{fmt(modalAkhir)}</TableCell></TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Catatan: Prive/Dividen belum dijurnalkan—silakan tambah jurnal manual jika ada.</p>
    </div>
  );
}
