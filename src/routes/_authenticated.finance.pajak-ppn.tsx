import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listExpenses } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/pajak-ppn")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const PPN = 0.11;

function Page() {
  const invFn = useServerFn(listInvoices);
  const expFn = useServerFn(listExpenses);
  const inv = useQuery({ queryKey: ["fin-ppn-inv"], queryFn: () => invFn({ data: {} }) });
  const exp = useQuery({ queryKey: ["fin-ppn-exp"], queryFn: () => expFn({ data: {} }) });

  const sum = useMemo(() => {
    const invRows = (inv.data?.rows ?? []).filter((r: any) => r.status !== "void");
    const expRows = (exp.data?.rows ?? []).filter((r: any) => r.status !== "void");
    const ppnKeluaran = invRows.reduce((a: number, r: any) => a + (Number(r.total) / 1.11) * PPN, 0);
    const ppnMasukan = expRows.reduce((a: number, r: any) => a + (Number(r.total) / 1.11) * PPN, 0);
    return { ppnKeluaran, ppnMasukan, net: ppnKeluaran - ppnMasukan };
  }, [inv.data, exp.data]);

  const loading = inv.isLoading || exp.isLoading;

  return (
    <div>
      <PageHeader title="PPN Prepopulated" desc="Estimasi PPN Keluaran (penjualan) dan PPN Masukan (pembelian) — tarif 11%." />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="PPN Keluaran" value={fmt(sum.ppnKeluaran)} />
        <Kpi label="PPN Masukan" value={fmt(sum.ppnMasukan)} />
        <Kpi label="Net (Kurang/Lebih Bayar)" value={fmt(sum.net)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Jenis</TableHead><TableHead className="text-right">DPP</TableHead><TableHead className="text-right">PPN 11%</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={3} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow> : (
              <>
                <TableRow><TableCell>PPN Keluaran (Invoice)</TableCell><TableCell className="text-right font-mono">{fmt(sum.ppnKeluaran / PPN)}</TableCell><TableCell className="text-right font-mono">{fmt(sum.ppnKeluaran)}</TableCell></TableRow>
                <TableRow><TableCell>PPN Masukan (Pengeluaran)</TableCell><TableCell className="text-right font-mono">{fmt(sum.ppnMasukan / PPN)}</TableCell><TableCell className="text-right font-mono">{fmt(sum.ppnMasukan)}</TableCell></TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>;
}
