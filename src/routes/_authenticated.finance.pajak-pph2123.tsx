import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listExpenses, listTarifPajak } from "@/lib/finance-tx.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { exportCsv } from "@/lib/exporter";

export const Route = createFileRoute("/_authenticated/finance/pajak-pph2123")({
  
  head: () => pageHead({ title: "PPh 21 / 23 — Finance", description: "PPh 21 / 23 pada modul keuangan klinik.", path: "/finance/pajak-pph2123" }),
  component: Page,
});

const fmt = (n: number) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

function Page() {
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const fn = useServerFn(listExpenses);
  const tarFn = useServerFn(listTarifPajak);
  const { data, isLoading } = useQuery({ queryKey: ["fin-pph23"], queryFn: () => fn({ data: {} }) });
  const tarQ = useQuery({ queryKey: ["fin-tarif-pajak"], queryFn: () => tarFn() });

  const tarif = useMemo(() => {
    const rows = (tarQ.data ?? []) as Array<{ jenis: string; code: string; tarif_pct: number; name: string }>;
    const pph23 = rows.find((r) => r.code === "PJ-PPH23-JASA")?.tarif_pct;
    const pph21 = rows.filter((r) => r.jenis === "PPh21").sort((a, b) => a.tarif_pct - b.tarif_pct);
    const ppn = rows.find((r) => r.jenis === "PPN")?.tarif_pct ?? 11;
    return { pph23: (pph23 ?? 2) / 100, pph21, ppn: ppn / 100 };
  }, [tarQ.data]);

  const rows = ((data?.rows ?? []) as Array<{ id: string; no_voucher: string; tanggal: string; vendor_name?: string; total: number; status: string }>)
    .filter((r) => r.status !== "void" && (r.tanggal ?? "").startsWith(period));

  const summary = useMemo(() => {
    const total = rows.reduce((a, r) => a + Number(r.total || 0), 0);
    const dpp = total / (1 + tarif.ppn);
    const pph = Math.round(dpp * tarif.pph23);
    return { total, dpp, pph };
  }, [rows, tarif]);

  const exportEBupot = () => {
    const out = rows.map((r) => {
      const dpp = Number(r.total) / (1 + tarif.ppn);
      return { no_voucher: r.no_voucher, tanggal: r.tanggal, vendor: r.vendor_name ?? "-", dpp: Math.round(dpp), pph: Math.round(dpp * tarif.pph23) };
    });
    exportCsv(`ebupot-pph23-${period}.csv`, [
      { key: "no_voucher", header: "No Voucher" },
      { key: "tanggal", header: "Tanggal" },
      { key: "vendor", header: "Vendor" },
      { key: "dpp", header: "DPP" },
      { key: "pph", header: `PPh23 ${(tarif.pph23 * 100).toFixed(1)}%` },
    ], out);
  };

  return (
    <div>
      <PageHeader title="PPh 21 / 23" desc={`PPh 23 atas jasa vendor (${(tarif.pph23 * 100).toFixed(1)}%). Tarif diambil dari master fin_tarif_pajak.`} />

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <div><Label>Periode (YYYY-MM)</Label><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40" /></div>
        <Button variant="outline" size="sm" onClick={exportEBupot} className="gap-1"><Download className="h-4 w-4" /> Export e-Bupot (CSV)</Button>
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Total Pengeluaran" value={fmt(summary.total)} />
        <Kpi label="DPP (Estimasi)" value={fmt(summary.dpp)} />
        <Kpi label={`PPh 23 (${(tarif.pph23 * 100).toFixed(1)}%)`} value={fmt(summary.pph)} />
      </div>

      <div className="mb-3 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Tarif PPh 21 Progresif (aktif)</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {tarif.pph21.map((t) => (
            <span key={t.code} className="rounded-md border px-2 py-1"><b>{t.tarif_pct}%</b> · {t.name}</span>
          ))}
          {tarif.pph21.length === 0 && <span className="text-muted-foreground">Belum ada tarif PPh21 aktif.</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">DPP</TableHead>
            <TableHead className="text-right">PPh 23</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">Belum ada data pada periode {period}.</TableCell></TableRow>
              : rows.map((r) => {
                const dpp = Number(r.total) / (1 + tarif.ppn);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.vendor_name ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(dpp)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(dpp * tarif.pph23)}</TableCell>
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
