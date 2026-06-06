import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { dashboard, visits, patients } from "@/data/clinicData";
import { formatIDR } from "@/lib/sync-log";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sim-klinik/laporan")({
  component: LaporanPage,
});

type Range = "today" | "7d" | "30d" | "ytd";

const PIE_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7"];

function LaporanPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [report, setReport] = useState<"kunjungan" | "tindakan" | "payer" | "pendapatan">("kunjungan");

  const payerData = useMemo(
    () => Object.entries(dashboard.byPayer).map(([name, value]) => ({ name, value })),
    [],
  );

  const revenuePerService = useMemo(
    () => dashboard.topActions.map((a) => ({
      name: a.name,
      revenue: a.count * (80000 + Math.round(Math.random() * 120000)),
      count: a.count,
    })),
    [],
  );

  const totalRevenue = revenuePerService.reduce((a, b) => a + b.revenue, 0);
  const totalVisits = dashboard.monthlyTrend.reduce((a, b) => a + b.visits, 0);

  const exportReport = (kind: "csv" | "pdf") => {
    addAudit({
      actor: user?.email ?? "system",
      action: "export",
      target: `sim-klinik/laporan/${report}`,
      meta: { range, format: kind },
    });
    toast.success(`Laporan ${report.toUpperCase()} (${kind.toUpperCase()}) diunduh`);
  };

  return (
    <div>
      <PageHeader
        title="Laporan Klinik"
        desc="Analitik operasional: kunjungan, tindakan, distribusi penjamin, dan pendapatan layanan."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={report} onValueChange={(v) => setReport(v as typeof report)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="kunjungan">Tren Kunjungan</SelectItem>
            <SelectItem value="tindakan">Tindakan Teratas</SelectItem>
            <SelectItem value="payer">Distribusi Penjamin</SelectItem>
            <SelectItem value="pendapatan">Pendapatan per Layanan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hari ini</SelectItem>
            <SelectItem value="7d">7 hari terakhir</SelectItem>
            <SelectItem value="30d">30 hari terakhir</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportReport("csv")}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total kunjungan" value={totalVisits.toLocaleString("id-ID")} />
        <KpiCard label="Pasien aktif" value={patients.length.toString()} />
        <KpiCard label="Estimasi pendapatan" value={formatIDR(totalRevenue)} />
        <KpiCard label="Tindakan terbanyak" value={dashboard.topActions[0]?.name ?? "—"} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {report === "kunjungan" && (
          <ChartFrame title="Tren Kunjungan Bulanan">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboard.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}

        {report === "tindakan" && (
          <ChartFrame title="Tindakan Klinis Teratas">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboard.topActions}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}

        {report === "payer" && (
          <ChartFrame title="Distribusi Penjamin">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={payerData} dataKey="value" nameKey="name" outerRadius={110} label>
                  {payerData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        )}

        {report === "pendapatan" && (
          <ChartFrame title="Pendapatan per Layanan">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Layanan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Estimasi Pendapatan</TableHead>
                    <TableHead>Kontribusi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenuePerService.map((r) => {
                    const pct = (r.revenue / totalRevenue) * 100;
                    return (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-right font-mono">{r.count}</TableCell>
                        <TableCell className="text-right font-mono">{formatIDR(r.revenue)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ChartFrame>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Kunjungan Terbaru</h3>
          <div className="space-y-2">
            {visits.slice(0, 6).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{v.patientName}</div>
                  <div className="text-xs text-muted-foreground">{v.doctor} • {v.poli}</div>
                </div>
                <Badge variant="secondary">{v.payer}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Beban Dokter Hari Ini</h3>
          <div className="space-y-2">
            {dashboard.todayDoctors.map((d) => (
              <div key={d.doctor} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{d.doctor}</span>
                  <span className="text-xs text-muted-foreground">{d.slot}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${d.load}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{d.poli} • beban {d.load}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
