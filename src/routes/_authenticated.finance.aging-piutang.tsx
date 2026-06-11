import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInvoices } from "@/lib/finance-tx.functions";
import { downloadCSV, toCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/finance/aging-piutang")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const daysBetween = (a: string) => Math.floor((Date.now() - new Date(a).getTime()) / 86400000);
const bucketOf = (d: number) => (d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : ">90");

function Page() {
  const fn = useServerFn(listInvoices);
  const { data, isLoading } = useQuery({ queryKey: ["fin-aging-piutang-detail"], queryFn: () => fn({ data: {} }) });
  const rows = (data?.rows ?? []).filter((r: any) => r.status !== "void" && Number(r.total) > Number(r.dibayar ?? 0));

  const summary = useMemo(() => {
    const b: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
    const byPayer = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const sisa = Number(r.total) - Number(r.dibayar ?? 0);
      const bk = bucketOf(daysBetween(r.tanggal));
      b[bk] += sisa;
      const payer = r.payer_name ?? r.patient_name ?? "Tunai/Pribadi";
      const cur = byPayer.get(payer) ?? { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 };
      cur[bk] += sisa;
      byPayer.set(payer, cur);
    }
    return { b, byPayer: Array.from(byPayer.entries()).map(([nama, v]) => ({ nama, ...v, total: v["0-30"] + v["31-60"] + v["61-90"] + v[">90"] })).sort((a, z) => z.total - a.total) };
  }, [rows]);
  const total = Object.values(summary.b).reduce((a, b) => a + b, 0);

  const exportCsv = () => {
    const csv = toCSV(rows, [
      { key: "no", label: "No Invoice", get: (r: any) => r.no_invoice },
      { key: "tgl", label: "Tanggal", get: (r: any) => r.tanggal },
      { key: "pasien", label: "Pasien", get: (r: any) => r.patient_name ?? "" },
      { key: "payer", label: "Payer", get: (r: any) => r.payer_name ?? "Tunai" },
      { key: "total", label: "Total", get: (r: any) => r.total },
      { key: "bayar", label: "Dibayar", get: (r: any) => r.dibayar ?? 0 },
      { key: "sisa", label: "Sisa", get: (r: any) => Number(r.total) - Number(r.dibayar ?? 0) },
      { key: "umur", label: "Umur (hari)", get: (r: any) => daysBetween(r.tanggal) },
    ]);
    downloadCSV(`aging-piutang.csv`, csv);
  };

  return (
    <div>
      <PageHeader title="Aging Piutang (Detail)" desc="Detail outstanding invoice per umur, dengan ringkasan per payer/asuransi." />
      <div className="mb-3 grid gap-3 md:grid-cols-5">
        <Kpi label="Total Piutang" value={fmt(total)} />
        {Object.entries(summary.b).map(([k, v]) => <Kpi key={k} label={`Umur ${k}`} value={fmt(v)} />)}
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold">Ringkasan per Payer</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Payer / Pasien</TableHead><TableHead className="text-right">0-30</TableHead>
            <TableHead className="text-right">31-60</TableHead><TableHead className="text-right">61-90</TableHead>
            <TableHead className="text-right">&gt;90</TableHead><TableHead className="text-right">Total</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {summary.byPayer.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">-</TableCell></TableRow>
              : summary.byPayer.map((p) => (
                <TableRow key={p.nama}>
                  <TableCell>{p.nama}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p["0-30"])}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p["31-60"])}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p["61-90"])}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(p[">90"])}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(p.total)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="mb-2 flex justify-end"><Button variant="outline" size="sm" onClick={exportCsv} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Pasien</TableHead><TableHead>Payer</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Sisa</TableHead>
            <TableHead className="text-right">Umur</TableHead><TableHead>Bucket</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Tidak ada piutang outstanding.</TableCell></TableRow>
              : rows.map((r: any) => {
                const sisa = Number(r.total) - Number(r.dibayar ?? 0);
                const umur = daysBetween(r.tanggal);
                const bk = bucketOf(umur);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.no_invoice}</TableCell>
                    <TableCell>{r.tanggal}</TableCell>
                    <TableCell>{r.patient_name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.payer_name ?? "Tunai"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmt(sisa)}</TableCell>
                    <TableCell className="text-right">{umur} hari</TableCell>
                    <TableCell><Badge variant="secondary" className={bk === ">90" ? "bg-rose-500/15 text-rose-700" : bk === "61-90" ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}>{bk}</Badge></TableCell>
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
