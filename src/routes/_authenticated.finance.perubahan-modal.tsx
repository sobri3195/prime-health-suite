import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBalanceSheet, getProfitLoss } from "@/lib/finance-report.functions";
import { useFinanceDate } from "@/context/finance-date";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/perubahan-modal")({
  
  head: () => pageHead({ title: "Perubahan Modal — Finance", description: "Perubahan Modal pada modul keuangan klinik.", path: "/finance/perubahan-modal" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const { from, to } = useFinanceDate();
  const bsFn = useServerFn(getBalanceSheet);
  const plFn = useServerFn(getProfitLoss);

  // Modal Awal = snapshot ekuitas per akhir hari sebelum periode.
  const openingTo = from
    ? (() => { const d = new Date(from); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
    : undefined;

  const bsOpen = useQuery({
    queryKey: ["fin-bs-open", openingTo],
    queryFn: () => bsFn({ data: { to: openingTo } }),
    enabled: !!openingTo,
  });
  const bsClose = useQuery({ queryKey: ["fin-bs-close", to], queryFn: () => bsFn({ data: { to } }) });
  const pl = useQuery({ queryKey: ["fin-pl-mod", from, to], queryFn: () => plFn({ data: { from, to } }) });
  const loading = bsClose.isLoading || pl.isLoading || (!!openingTo && bsOpen.isLoading);

  const modalAwal = bsOpen.data?.totalEquity ?? 0;
  const laba = pl.data?.profit ?? 0;
  const modalAkhir = bsClose.data?.totalEquity ?? 0;
  // Prive turunan: selisih perubahan ekuitas vs laba.
  const prive = modalAwal + laba - modalAkhir;

  return (
    <div>
      <PageHeader title="Laporan Perubahan Modal" desc={`Periode ${from || "—"} s/d ${to || "—"}`} />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Komponen</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={2} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow> : (
              <>
                <TableRow><TableCell>Modal Awal</TableCell><TableCell className="text-right font-mono">{fmt(modalAwal)}</TableCell></TableRow>
                <TableRow><TableCell>(+) Laba/(Rugi) Periode</TableCell><TableCell className="text-right font-mono">{fmt(laba)}</TableCell></TableRow>
                <TableRow><TableCell>(–) Prive / Dividen (turunan)</TableCell><TableCell className="text-right font-mono">{fmt(prive)}</TableCell></TableRow>
                <TableRow className="font-semibold"><TableCell>Modal Akhir</TableCell><TableCell className="text-right font-mono">{fmt(modalAkhir)}</TableCell></TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Modal Awal diambil dari snapshot Neraca akhir hari sebelum periode. Prive/Dividen dihitung sebagai selisih (Modal Awal + Laba − Modal Akhir).</p>
    </div>
  );
}
