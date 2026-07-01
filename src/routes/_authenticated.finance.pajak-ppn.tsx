import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInvoices, listExpenses, listTarifPajak } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { exportCsv } from "@/lib/exporter";

export const Route = createFileRoute("/_authenticated/finance/pajak-ppn")({
  
  head: () => pageHead({ title: "PPN Prepopulated — Finance", description: "PPN Prepopulated pada modul keuangan klinik.", path: "/finance/pajak-ppn" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const invFn = useServerFn(listInvoices);
  const expFn = useServerFn(listExpenses);
  const tarFn = useServerFn(listTarifPajak);
  const inv = useQuery({ queryKey: ["fin-ppn-inv"], queryFn: () => invFn({ data: {} }) });
  const exp = useQuery({ queryKey: ["fin-ppn-exp"], queryFn: () => expFn({ data: {} }) });
  const tarQ = useQuery({ queryKey: ["fin-tarif-pajak"], queryFn: () => tarFn() });

  const ppnTarif = useMemo(() => {
    const t = (tarQ.data ?? []).find((x: { jenis: string }) => x.jenis === "PPN") as { tarif_pct: number } | undefined;
    return t ? Number(t.tarif_pct) / 100 : 0.11;
  }, [tarQ.data]);

  const inPeriod = (d: string) => (d ?? "").startsWith(period);

  const sum = useMemo(() => {
    const div = 1 + ppnTarif;
    const invRows = (inv.data?.rows ?? []).filter((r: { status?: string; tanggal?: string }) => r.status !== "void" && inPeriod(r.tanggal ?? ""));
    const expRows = (exp.data?.rows ?? []).filter((r: { status?: string; tanggal?: string }) => r.status !== "void" && inPeriod(r.tanggal ?? ""));
    const dppOut = invRows.reduce((a: number, r: { total: number }) => a + Number(r.total) / div, 0);
    const dppIn = expRows.reduce((a: number, r: { total: number }) => a + Number(r.total) / div, 0);
    return {
      ppnKeluaran: dppOut * ppnTarif, ppnMasukan: dppIn * ppnTarif,
      dppOut, dppIn, net: (dppOut - dppIn) * ppnTarif,
      invRows, expRows,
    };
  }, [inv.data, exp.data, ppnTarif, period]);

  const loading = inv.isLoading || exp.isLoading || tarQ.isLoading;

  const exportEBupot = () => {
    const rows = [
      { jenis: "PPN Keluaran (Penjualan)", dpp: sum.dppOut, ppn: sum.ppnKeluaran },
      { jenis: "PPN Masukan (Pembelian)", dpp: sum.dppIn, ppn: sum.ppnMasukan },
      { jenis: `NET (${sum.net >= 0 ? "Kurang Bayar" : "Lebih Bayar"})`, dpp: 0, ppn: Math.abs(sum.net) },
    ];
    exportCsv(`ebupot-ppn-${period}.csv`, [
      { key: "jenis", header: "Jenis" },
      { key: "dpp", header: "DPP", format: (r) => Math.round(r.dpp).toString() },
      { key: "ppn", header: "PPN", format: (r) => Math.round(r.ppn).toString() },
    ], rows);
  };

  return (
    <div>
      <PageHeader title="PPN Bulanan" desc={`Tarif aktif ${(ppnTarif * 100).toFixed(2)}% dari master fin_tarif_pajak. Basis DPP diturunkan dari total (inklusif PPN).`} />

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <div><Label>Periode (YYYY-MM)</Label><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40" /></div>
        <Button variant="outline" size="sm" onClick={exportEBupot} className="gap-1"><Download className="h-4 w-4" /> Export e-Bupot (CSV)</Button>
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="PPN Keluaran" value={fmt(sum.ppnKeluaran)} />
        <Kpi label="PPN Masukan" value={fmt(sum.ppnMasukan)} />
        <Kpi label={sum.net >= 0 ? "Kurang Bayar" : "Lebih Bayar"} value={fmt(Math.abs(sum.net))} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Jenis</TableHead><TableHead className="text-right">DPP</TableHead><TableHead className="text-right">PPN {(ppnTarif * 100).toFixed(2)}%</TableHead><TableHead className="text-right">Jumlah Dokumen</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow> : (
              <>
                <TableRow><TableCell>PPN Keluaran (Invoice)</TableCell><TableCell className="text-right font-mono">{fmt(sum.dppOut)}</TableCell><TableCell className="text-right font-mono">{fmt(sum.ppnKeluaran)}</TableCell><TableCell className="text-right">{sum.invRows.length}</TableCell></TableRow>
                <TableRow><TableCell>PPN Masukan (Pengeluaran)</TableCell><TableCell className="text-right font-mono">{fmt(sum.dppIn)}</TableCell><TableCell className="text-right font-mono">{fmt(sum.ppnMasukan)}</TableCell><TableCell className="text-right">{sum.expRows.length}</TableCell></TableRow>
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
