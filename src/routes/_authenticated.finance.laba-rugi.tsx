import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { useFinanceDate } from "@/context/finance-date";
import { getProfitLoss } from "@/lib/finance-report.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportCsv } from "@/lib/exporter";

export const Route = createFileRoute("/_authenticated/finance/laba-rugi")({ component: LabaRugi });

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function LabaRugi() {
  const { from, to, label } = useFinanceDate();
  const fn = useServerFn(getProfitLoss);
  const { data, isLoading } = useQuery({ queryKey: ["pl", from, to], queryFn: () => fn({ data: { from, to } }) });

  const csv = () => {
    const rows = [
      ...((data?.revenue ?? []).map((r: any) => ({ section: "Pendapatan", code: r.code, name: r.name, amount: r.amount }))),
      { section: "", code: "", name: "Total Pendapatan", amount: data?.totalRev ?? 0 },
      ...((data?.expense ?? []).map((r: any) => ({ section: "Beban", code: r.code, name: r.name, amount: r.amount }))),
      { section: "", code: "", name: "Total Beban", amount: data?.totalExp ?? 0 },
      { section: "", code: "", name: "Laba (Rugi) Bersih", amount: data?.profit ?? 0 },
    ];
    exportCsv(`laba-rugi-${from}_${to}.csv`, [
      { key: "section", header: "Section" }, { key: "code", header: "Kode" }, { key: "name", header: "Akun" }, { key: "amount", header: "Jumlah" },
    ], rows);
  };

  return (
    <div>
      <PageHeader title="Laba Rugi" desc={`Periode ${label}. Disusun langsung dari jurnal yang sudah ter-post.`} />
      <div className="mb-3 flex justify-end"><Button variant="outline" size="sm" onClick={csv}><Download className="mr-1 h-4 w-4" /> CSV</Button></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Akun</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30"><TableCell colSpan={3} className="font-semibold">Pendapatan</TableCell></TableRow>
            {isLoading ? <TableRow><TableCell colSpan={3} className="py-6 text-center">Loading…</TableCell></TableRow>
              : (data?.revenue ?? []).map((r: any) => (
                <TableRow key={r.code}><TableCell className="font-mono text-xs">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell></TableRow>
              ))}
            <TableRow className="border-t-2 font-semibold"><TableCell colSpan={2}>Total Pendapatan</TableCell><TableCell className="text-right font-mono">{fmt(data?.totalRev ?? 0)}</TableCell></TableRow>

            <TableRow className="bg-muted/30"><TableCell colSpan={3} className="font-semibold">Beban</TableCell></TableRow>
            {(data?.expense ?? []).map((r: any) => (
              <TableRow key={r.code}><TableCell className="font-mono text-xs">{r.code}</TableCell><TableCell>{r.name}</TableCell><TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell></TableRow>
            ))}
            <TableRow className="border-t-2 font-semibold"><TableCell colSpan={2}>Total Beban</TableCell><TableCell className="text-right font-mono">{fmt(data?.totalExp ?? 0)}</TableCell></TableRow>

            <TableRow className="border-t-4 border-foreground/20 text-base font-bold">
              <TableCell colSpan={2}>Laba (Rugi) Bersih</TableCell>
              <TableCell className={`text-right font-mono ${(data?.profit ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(data?.profit ?? 0)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
