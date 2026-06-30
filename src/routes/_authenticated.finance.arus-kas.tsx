import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { useFinanceDate } from "@/context/finance-date";
import { getCashFlow } from "@/lib/finance-report.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { exportCsv, exportReportPdf } from "@/lib/exporter";
import { FinanceDrillDialog } from "@/components/finance-drill-dialog";

export const Route = createFileRoute("/_authenticated/finance/arus-kas")({
  head: () => pageHead({ title: 'Arus Kas — Finance', description: 'Aliran kas operasi, investasi, dan pendanaan klinik.', path: '/finance/arus-kas' }), component: ArusKas });

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function ArusKas() {
  const { from, to, label } = useFinanceDate();
  const fn = useServerFn(getCashFlow);
  const { data, isLoading } = useQuery({ queryKey: ["cf", from, to], queryFn: () => fn({ data: { from, to } }) });
  const s = data?.sections ?? { operating: 0, investing: 0, financing: 0 };
  const details = data?.details ?? [];
  const [drill, setDrill] = useState<{ entry_id?: string; title?: string } | null>(null);

  const csv = () => exportCsv(`arus-kas-${from}_${to}.csv`, [
    { key: "tanggal", header: "Tanggal" }, { key: "no_jurnal", header: "No. Jurnal" }, { key: "section", header: "Kategori" },
    { key: "sumber", header: "Sumber" }, { key: "keterangan", header: "Keterangan" }, { key: "amount", header: "Jumlah" },
  ], details, { from, to });

  const pdf = () => exportReportPdf({
    filename: `arus-kas-${from}_${to}.pdf`,
    title: "Laporan Arus Kas", subtitle: "Metode langsung — entri jurnal yang menyentuh kas/bank",
    range: { from, to },
    summary: [
      { label: "Operasi", value: fmt(s.operating) },
      { label: "Investasi", value: fmt(s.investing) },
      { label: "Pendanaan", value: fmt(s.financing) },
      { label: "Kenaikan Bersih", value: fmt(s.operating + s.investing + s.financing) },
    ],
    sections: [{
      title: "Detail Mutasi Kas/Bank",
      columns: [
        { header: "Tanggal", key: "tanggal" }, { header: "No. Jurnal", key: "no_jurnal" },
        { header: "Kategori", key: "section" }, { header: "Keterangan", key: "ket" },
        { header: "Jumlah", key: "amt", align: "right" },
      ],
      rows: details.map((d: any) => ({ tanggal: d.tanggal, no_jurnal: d.no_jurnal, section: d.section, ket: d.keterangan ?? "", amt: fmt(d.amount) })),
    }],
  });

  return (
    <div>
      <PageHeader title="Arus Kas" desc={`Metode langsung. Periode ${label}. Klik baris untuk drill-down jurnal.`} />
      <div className="mb-3 grid gap-3 md:grid-cols-4">
        <Kpi label="Operasi" value={fmt(s.operating)} tone={s.operating >= 0 ? "ok" : "warn"} />
        <Kpi label="Investasi" value={fmt(s.investing)} tone={s.investing >= 0 ? "ok" : "warn"} />
        <Kpi label="Pendanaan" value={fmt(s.financing)} tone={s.financing >= 0 ? "ok" : "warn"} />
        <Kpi label="Kenaikan Bersih" value={fmt(s.operating + s.investing + s.financing)} tone={s.operating + s.investing + s.financing >= 0 ? "ok" : "warn"} />
      </div>
      <div className="mb-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={csv}><Download className="mr-1 h-4 w-4" /> CSV</Button>
        <Button variant="outline" size="sm" onClick={pdf}><FileText className="mr-1 h-4 w-4" /> PDF</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>No. Jurnal</TableHead><TableHead>Kategori</TableHead><TableHead>Sumber</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="py-6 text-center">Loading…</TableCell></TableRow>
              : details.length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">Belum ada arus kas untuk periode ini.</TableCell></TableRow>
              : details.map((d: any, i: number) => (
                <TableRow key={i} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrill({ entry_id: d.entry_id, title: `Jurnal ${d.no_jurnal}` })}>
                  <TableCell className="text-xs">{d.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs">{d.no_jurnal}</TableCell>
                  <TableCell className="text-xs capitalize">{d.section}</TableCell>
                  <TableCell className="text-xs">{d.sumber}</TableCell>
                  <TableCell className="max-w-md truncate text-xs">{d.keterangan}</TableCell>
                  <TableCell className={`text-right font-mono ${d.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(d.amount)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <FinanceDrillDialog
        open={!!drill} onClose={() => setDrill(null)}
        entry_id={drill?.entry_id} title={drill?.title}
      />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 text-lg font-semibold ${tone === "warn" ? "text-amber-600" : "text-emerald-600"}`}>{value}</div></div>;
}
