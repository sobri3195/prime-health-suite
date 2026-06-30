import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useFinanceDate } from "@/context/finance-date";
import { getProfitLoss } from "@/lib/finance-report.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { exportCsv, exportReportPdf } from "@/lib/exporter";
import { FinanceDrillDialog } from "@/components/finance-drill-dialog";

export const Route = createFileRoute("/_authenticated/finance/laba-rugi")({
  head: () => pageHead({ title: 'Laporan Laba Rugi — Finance', description: 'Pendapatan, beban, dan margin klinik per periode.', path: '/finance/laba-rugi' }), component: LabaRugi });

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function LabaRugi() {
  const { from, to, label } = useFinanceDate();
  const fn = useServerFn(getProfitLoss);
  const { data, isLoading } = useQuery({ queryKey: ["pl", from, to], queryFn: () => fn({ data: { from, to } }) });
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);

  const csvRows = () => [
    ...((data?.revenue ?? []).map((r: any) => ({ section: "Pendapatan", code: r.code, name: r.name, amount: r.amount }))),
    { section: "", code: "", name: "Total Pendapatan", amount: data?.totalRev ?? 0 },
    ...((data?.expense ?? []).map((r: any) => ({ section: "Beban", code: r.code, name: r.name, amount: r.amount }))),
    { section: "", code: "", name: "Total Beban", amount: data?.totalExp ?? 0 },
    { section: "", code: "", name: "Laba (Rugi) Bersih", amount: data?.profit ?? 0 },
  ];

  const csv = () => exportCsv(`laba-rugi-${from}_${to}.csv`,
    [{ key: "section", header: "Section" }, { key: "code", header: "Kode" }, { key: "name", header: "Akun" }, { key: "amount", header: "Jumlah" }],
    csvRows(), { from, to });

  const pdf = () => exportReportPdf({
    filename: `laba-rugi-${from}_${to}.pdf`,
    title: "Laporan Laba Rugi", subtitle: "Klinik — disusun dari jurnal posted",
    range: { from, to },
    summary: [
      { label: "Total Pendapatan", value: fmt(data?.totalRev ?? 0) },
      { label: "Total Beban", value: fmt(data?.totalExp ?? 0) },
      { label: "Laba (Rugi) Bersih", value: fmt(data?.profit ?? 0) },
    ],
    sections: [
      {
        title: "Pendapatan",
        columns: [{ header: "Kode", key: "code" }, { header: "Akun", key: "name" }, { header: "Jumlah", key: "amt", align: "right" }],
        rows: (data?.revenue ?? []).map((r: any) => ({ code: r.code, name: r.name, amt: fmt(r.amount) })),
        totalRow: { code: "", name: "Total Pendapatan", amt: fmt(data?.totalRev ?? 0) },
      },
      {
        title: "Beban",
        columns: [{ header: "Kode", key: "code" }, { header: "Akun", key: "name" }, { header: "Jumlah", key: "amt", align: "right" }],
        rows: (data?.expense ?? []).map((r: any) => ({ code: r.code, name: r.name, amt: fmt(r.amount) })),
        totalRow: { code: "", name: "Total Beban", amt: fmt(data?.totalExp ?? 0) },
      },
    ],
  });

  return (
    <div>
      <PageHeader title="Laba Rugi" desc={`Periode ${label}. Klik akun untuk drill-down ke jurnal detail.`} />
      <div className="mb-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={csv}><Download className="mr-1 h-4 w-4" /> CSV</Button>
        <Button variant="outline" size="sm" onClick={pdf}><FileText className="mr-1 h-4 w-4" /> PDF</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Akun</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30"><TableCell colSpan={3} className="font-semibold">Pendapatan</TableCell></TableRow>
            {isLoading ? <TableRow><TableCell colSpan={3} className="py-6 text-center">Loading…</TableCell></TableRow>
              : (data?.revenue ?? []).map((r: any) => (
                <TableRow key={r.code} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrill({ code: r.code, name: r.name })}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="underline-offset-2 hover:underline">{r.name}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                </TableRow>
              ))}
            <TableRow className="border-t-2 font-semibold"><TableCell colSpan={2}>Total Pendapatan</TableCell><TableCell className="text-right font-mono">{fmt(data?.totalRev ?? 0)}</TableCell></TableRow>

            <TableRow className="bg-muted/30"><TableCell colSpan={3} className="font-semibold">Beban</TableCell></TableRow>
            {(data?.expense ?? []).map((r: any) => (
              <TableRow key={r.code} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrill({ code: r.code, name: r.name })}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="underline-offset-2 hover:underline">{r.name}</TableCell>
                <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-semibold"><TableCell colSpan={2}>Total Beban</TableCell><TableCell className="text-right font-mono">{fmt(data?.totalExp ?? 0)}</TableCell></TableRow>

            <TableRow className="border-t-4 border-foreground/20 text-base font-bold">
              <TableCell colSpan={2}>Laba (Rugi) Bersih</TableCell>
              <TableCell className={`text-right font-mono ${(data?.profit ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(data?.profit ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <FinanceDrillDialog
        open={!!drill} onClose={() => setDrill(null)}
        coa_code={drill?.code} coa_name={drill?.name} from={from} to={to}
      />
    </div>
  );
}
