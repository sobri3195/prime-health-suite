import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
} from "recharts";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import { ExportBar, defaultRange, type DateRange } from "@/components/export-bar";
import { exportCsv, exportPdf, type Column } from "@/lib/exporter";
import { getLaporan } from "@/lib/clinic.functions";
import { formatIDR } from "@/lib/sync-log";

export const Route = createFileRoute("/_authenticated/sim-klinik/laporan")({
  component: LaporanPage,
});

type Kind = "kunjungan" | "tindakan" | "payer" | "pendapatan" | "top_tindakan" | "doctor_monthly" | "occupancy";

function LaporanPage() {
  const [kind, setKind] = useState<Kind>("kunjungan");
  const [range, setRange] = useState<DateRange>(defaultRange(30));

  const fn = useServerFn(getLaporan);
  const { data, isLoading } = useQuery({
    queryKey: ["laporan", kind, range.from, range.to],
    queryFn: () => fn({ data: { kind, from: range.from, to: range.to } }),
  });

  const trend = data?.trend ?? [];
  const doctors = data?.doctors ?? [];
  const invoices = data?.invoices ?? [];
  const payers = (data as { payers?: Array<{ name: string; count: number; revenue: number }> } | undefined)?.payers ?? [];
  const topTindakan = (data as { topTindakan?: Array<{ name: string; count: number; revenue: number }> } | undefined)?.topTindakan ?? [];
  const doctorMonthly = (data as { doctorMonthly?: Array<{ month: string; doctor: string; count: number }> } | undefined)?.doctorMonthly ?? [];
  const occupancy = (data as { occupancy?: Array<{ doctor: string; quota: number; booked: number; rate: number }> } | undefined)?.occupancy ?? [];
  const totals = data?.totals ?? { visits: 0, invoices: 0, revenue: 0, occupancyOverall: 0 };
  const occupancyOverall = (totals as { occupancyOverall?: number }).occupancyOverall ?? 0;


  const invoiceCols: Column<{ tanggal: string; patient_code: string; patient_name: string | null; total: number }>[] = useMemo(() => [
    { key: "tanggal", header: "Tanggal" },
    { key: "patient_code", header: "Kode Pasien" },
    { key: "patient_name", header: "Pasien" },
    { key: "total", header: "Total (Rp)", format: (r) => Number(r.total).toLocaleString("id-ID") },
  ], []);

  const onCsv = () => exportCsv(`laporan-${kind}-${range.from}_${range.to}.csv`, invoiceCols, invoices, range);
  const onPdf = () => exportPdf(`laporan-${kind}-${range.from}_${range.to}.pdf`, `Laporan ${kind.toUpperCase()}`, invoiceCols, invoices, range);

  return (
    <div>
      <PageHeader
        title="Laporan Klinik"
        desc="Analitik operasional: kunjungan, tindakan, distribusi penjamin, dan pendapatan layanan."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Jenis Laporan</label>
          <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kunjungan">Tren Kunjungan</SelectItem>
              <SelectItem value="doctor_monthly">Kunjungan per Dokter/Bulan</SelectItem>
              <SelectItem value="tindakan">Beban Dokter</SelectItem>
              <SelectItem value="top_tindakan">Top 10 Tindakan</SelectItem>
              <SelectItem value="occupancy">Occupancy Rate Dokter</SelectItem>
              <SelectItem value="payer">Distribusi Penjamin</SelectItem>
              <SelectItem value="pendapatan">Pendapatan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ExportBar range={range} onRange={setRange} onCsv={onCsv} onPdf={onPdf} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Kunjungan" value={totals.visits.toLocaleString("id-ID")} />
        <Kpi label="Invoice terbit" value={totals.invoices.toLocaleString("id-ID")} />
        <Kpi label="Pendapatan" value={formatIDR(totals.revenue)} />
        <Kpi label="Occupancy" value={`${occupancyOverall}%`} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : kind === "kunjungan" ? (
          trend.length === 0
            ? <EmptyState title="Belum ada kunjungan" hint="Coba perluas rentang tanggal." />
            : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" /><YAxis /><Tooltip />
                  <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )
        ) : kind === "tindakan" ? (
          doctors.length === 0
            ? <EmptyState title="Belum ada beban dokter" />
            : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={doctors}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="doctor" /><YAxis /><Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
        ) : kind === "pendapatan" ? (
          invoices.length === 0
            ? <EmptyState title="Tidak ada invoice di rentang ini" />
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead><TableHead>Kode</TableHead><TableHead>Pasien</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs">{i.tanggal}</TableCell>
                      <TableCell className="font-mono text-xs">{i.patient_code}</TableCell>
                      <TableCell className="text-sm">{i.patient_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{formatIDR(Number(i.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
        ) : (
          payers.length === 0
            ? <EmptyState title="Belum ada distribusi penjamin" hint="Buat invoice terlebih dahulu." />
            : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payers}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(v: number, k: string) => k === "revenue" ? formatIDR(v) : String(v)} />
                  <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" radius={[6,6,0,0]} name="Invoice" />
                  <Bar yAxisId="right" dataKey="revenue" fill="hsl(var(--muted-foreground))" radius={[6,6,0,0]} name="Pendapatan" />
                </BarChart>
              </ResponsiveContainer>
            )
        )}
      </div>


      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Invoice terbaru</h3>
          {isLoading ? <SkeletonList rows={3} /> : invoices.length === 0 ? (
            <EmptyState title="Belum ada invoice" />
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 6).map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{i.patient_name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{i.patient_code} • {i.tanggal}</div>
                  </div>
                  <Badge variant="secondary">{formatIDR(Number(i.total))}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Beban dokter</h3>
          {isLoading ? <SkeletonList rows={3} /> : doctors.length === 0 ? (
            <EmptyState title="Belum ada beban dokter" />
          ) : (
            <div className="space-y-2">
              {doctors.map((d) => {
                const max = Math.max(...doctors.map((x) => x.count), 1);
                const pct = Math.round((d.count / max) * 100);
                return (
                  <div key={d.doctor} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{d.doctor}</span>
                      <span className="text-xs text-muted-foreground">{d.count} booking</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
