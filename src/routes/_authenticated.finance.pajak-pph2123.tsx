import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/pajak-pph2123")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const PPH23 = 0.02;

function Page() {
  const fn = useServerFn(listExpenses);
  const { data, isLoading } = useQuery({ queryKey: ["fin-pph23"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void");

  const summary = useMemo(() => {
    const total = rows.reduce((a: number, r: any) => a + Number(r.total || 0), 0);
    const dpp = total / 1.11;
    const pph = Math.round(dpp * PPH23);
    return { total, dpp, pph };
  }, [rows]);

  return (
    <div>
      <PageHeader title="PPh 21 / 23" desc="Perhitungan estimasi PPh 23 atas jasa vendor (2% dari DPP). PPh 21 dihitung dari payroll." />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total Pengeluaran" value={fmt(summary.total)} />
        <Kpi label="DPP (Estimasi)" value={fmt(summary.dpp)} />
        <Kpi label="PPh 23 (2%)" value={fmt(summary.pph)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">DPP</TableHead>
            <TableHead className="text-right">PPh 23 (2%)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">Belum ada data.</TableCell></TableRow>
              : rows.map((r: any) => {
                const dpp = Number(r.total) / 1.11;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.vendor_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(dpp)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(dpp * PPH23)}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
