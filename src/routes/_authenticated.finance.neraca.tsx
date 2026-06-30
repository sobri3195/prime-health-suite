import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useFinanceDate } from "@/context/finance-date";
import { getTrialBalance } from "@/lib/finance-report.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { exportCsv, exportReportPdf } from "@/lib/exporter";
import { FinanceDrillDialog } from "@/components/finance-drill-dialog";

export const Route = createFileRoute("/_authenticated/finance/neraca")({
  head: () => pageHead({ title: 'Neraca — Finance', description: 'Posisi aset, kewajiban, dan ekuitas klinik per tanggal cut-off.', path: '/finance/neraca' }), component: NeracaSaldo });

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function NeracaSaldo() {
  const { from, to, label } = useFinanceDate();
  const fn = useServerFn(getTrialBalance);
  const { data, isLoading } = useQuery({ queryKey: ["tb", from, to], queryFn: () => fn({ data: { from, to } }) });
  const rows = data?.rows ?? [];
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);

  const csv = () => exportCsv(`neraca-saldo-${from}_${to}.csv`, [
    { key: "code", header: "Kode" }, { key: "name", header: "Akun" }, { key: "type", header: "Tipe" },
    { key: "debit_bal", header: "Debit" }, { key: "kredit_bal", header: "Kredit" },
  ], rows, { from, to });

  const pdf = () => exportReportPdf({
    filename: `neraca-saldo-${from}_${to}.pdf`,
    title: "Neraca Saldo (Trial Balance)", subtitle: "Disusun dari jurnal posted",
    range: { from, to },
    summary: [
      { label: "Total Debit", value: fmt(data?.totalDebit ?? 0) },
      { label: "Total Kredit", value: fmt(data?.totalKredit ?? 0) },
      { label: "Status", value: data?.balanced ? "Balanced" : "Tidak Balanced" },
    ],
    sections: [{
      title: "Saldo Akun",
      columns: [
        { header: "Kode", key: "code" }, { header: "Akun", key: "name" }, { header: "Tipe", key: "type" },
        { header: "Debit", key: "d", align: "right" }, { header: "Kredit", key: "k", align: "right" },
      ],
      rows: rows.map((r: any) => ({ code: r.code, name: r.name, type: r.type, d: r.debit_bal ? fmt(r.debit_bal) : "", k: r.kredit_bal ? fmt(r.kredit_bal) : "" })),
      totalRow: { code: "", name: "Total", type: "", d: fmt(data?.totalDebit ?? 0), k: fmt(data?.totalKredit ?? 0) },
    }],
  });

  return (
    <div>
      <PageHeader title="Neraca Saldo" desc={`Trial balance per ${label}. Klik akun untuk drill-down ke jurnal detail.`} />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data?.balanced
            ? <Badge className="gap-1 bg-emerald-500/15 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Balanced</Badge>
            : <Badge className="gap-1 bg-amber-500/15 text-amber-700"><AlertTriangle className="h-3 w-3" /> Tidak balanced</Badge>}
          <span className="text-xs text-muted-foreground">Total D {fmt(data?.totalDebit ?? 0)} vs K {fmt(data?.totalKredit ?? 0)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={csv}><Download className="mr-1 h-4 w-4" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={pdf}><FileText className="mr-1 h-4 w-4" /> PDF</Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Akun</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Kredit</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="py-6 text-center">Loading…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.code} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrill({ code: r.code, name: r.name })}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="underline-offset-2 hover:underline">{r.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.type}</TableCell>
                  <TableCell className="text-right font-mono">{r.debit_bal ? fmt(r.debit_bal) : ""}</TableCell>
                  <TableCell className="text-right font-mono">{r.kredit_bal ? fmt(r.kredit_bal) : ""}</TableCell>
                </TableRow>
              ))}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right font-mono">{fmt(data?.totalDebit ?? 0)}</TableCell>
              <TableCell className="text-right font-mono">{fmt(data?.totalKredit ?? 0)}</TableCell>
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
