import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Wallet, TrendingUp, TrendingDown, Receipt, Landmark, AlertTriangle, Sparkles,
  PiggyBank, ShieldCheck, FileWarning, ArrowDownCircle, ArrowUpCircle, Activity,
  Printer, Download, RotateCcw, Plus, FileText, UserPlus, BadgeCheck, Calendar,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { invoices, monthlyTrend, expenseMTD, bankBalance, anomalies } from "@/data/financeData";
import {
  applyFilter, sumOutstanding, byPayer, topBy, netProfit, aging,
  formatIDR, formatCompactIDR, generateInsights,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/")({
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const navigate = useNavigate();
  const [period] = useState("Mei 2026");

  const filter = useMemo(() => ({ period: "mtd", doctor: "all", service: "all", payer: "all", status: "all", from: "", to: "" } as const), []);
  const filtered = useMemo(() => applyFilter(invoices, filter), [filter]);

  const mtdRev = filtered.reduce((a, r) => a + r.total, 0);
  const outstanding = sumOutstanding(filtered);
  const hutang = 37_800_000;
  const kasMasuk = filtered.reduce((a, r) => a + r.paid, 0) + 20_000_000;
  const kasKeluar = expenseMTD;
  const target = monthlyTrend[monthlyTrend.length - 1]?.target ?? 0;
  const targetPct = target ? Math.round((mtdRev / target) * 100) : 0;
  const growth = (() => {
    const a = monthlyTrend.at(-2)?.revenue ?? 0;
    const b = monthlyTrend.at(-1)?.revenue ?? 0;
    return a ? Math.round(((b - a) / a) * 100) : 0;
  })();
  const laba = netProfit(mtdRev, kasKeluar);
  const byP = byPayer(filtered);
  const topDokter = topBy(filtered, "doctor", 10);
  const insights = generateInsights(filtered, monthlyTrend);

  return (
    <div className="-mx-6 -my-6 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 dark:from-slate-950 dark:via-background dark:to-slate-900 md:-mx-8 md:-my-8 md:p-8">
      {/* Top action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <Calendar className="mr-1.5 h-3 w-3" /> Periode aktif: {period}
          </Badge>
          <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <BadgeCheck className="mr-1.5 h-3 w-3" /> Tersimpan
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Export disiapkan")}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Quick Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Demo direset")}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Demo
          </Button>
        </div>
      </div>

      {/* Hero header */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-accent">
              Finance Operations
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Ringkasan eksekutif Finance Operations Klinik Utama Prime Mata untuk periode aktif {period}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* KPI row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Pendapatan Bulan Ini" value={formatIDR(mtdRev)} icon={Wallet} tone="emerald" hint={`Target ${targetPct}%`} />
        <Kpi label="Total Pengeluaran" value={formatIDR(kasKeluar)} icon={TrendingDown} tone="rose" />
        <Kpi label="Piutang Outstanding" value={formatIDR(outstanding)} icon={Receipt} tone="amber" />
        <Kpi label="Hutang Outstanding" value={formatIDR(hutang)} icon={FileWarning} tone="rose" />
      </div>

      {/* KPI row 2 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Kas Masuk" value={formatIDR(kasMasuk)} icon={ArrowDownCircle} tone="sky" />
        <Kpi label="Kas Keluar" value={formatIDR(kasKeluar)} icon={ArrowUpCircle} tone="amber" />
        <Kpi label="Growth vs Bulan Lalu" value={`${growth}%`} icon={TrendingUp} tone="emerald" />
        <Kpi label="Laba Bersih" value={formatIDR(laba)} icon={Activity} tone={laba < 0 ? "rose" : "emerald"} />
      </div>

      {/* Trend + Quick Actions */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Tren Pendapatan dan Pengeluaran">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="e2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCompactIDR(Number(v))} />
                <Tooltip formatter={(v) => formatIDR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" name="Pendapatan" dataKey="revenue" stroke="#3b82f6" fill="url(#r2)" strokeWidth={2} />
                <Area type="monotone" name="Pengeluaran" dataKey="expense" stroke="#f59e0b" fill="url(#e2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Quick Actions" subtitle="Aksi operasional finance yang paling sering dipakai.">
          <div className="space-y-2">
            <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700" onClick={() => navigate({ to: "/finance/pendapatan" })}>
              <Plus className="mr-2 h-4 w-4" /> Input Pendapatan
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/voucher" })}>
              <FileText className="mr-2 h-4 w-4" /> Buat Voucher
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/master" })}>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah Vendor
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => toast.success("Export laporan diunduh")}>
              <Download className="mr-2 h-4 w-4" /> Export Laporan
            </Button>
          </div>
        </Card>
      </div>

      {/* Payer + Top Dokter */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Pendapatan by Payer" subtitle="Distribusi pendapatan berdasarkan payer/asuransi">
          <ul className="space-y-3 text-sm">
            {(Object.entries(byP) as [string, number][]).map(([k, v]) => {
              const totalAll = Object.values(byP).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((v / totalAll) * 100);
              return (
                <li key={k}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{k}</span>
                    <span className="text-muted-foreground">{formatIDR(v)} • {pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
            <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{formatIDR(Object.values(byP).reduce((a, b) => a + b, 0))}</div></div>
            <div><div className="text-muted-foreground">Payer Terbesar</div><div className="font-semibold">{Object.entries(byP).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}</div></div>
            <div><div className="text-muted-foreground">Jumlah Payer</div><div className="font-semibold">{Object.keys(byP).length}</div></div>
          </div>
        </Card>

        <Card title="Top 10 Dokter by Revenue" subtitle="Peringkat dokter berdasarkan total pendapatan">
          <RankList rows={topDokter} />
        </Card>
      </div>

      {/* Saldo Bank + Anomalies + Insights */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Saldo Bank">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{formatIDR(bankBalance)}</div>
              <div className="text-xs text-muted-foreground">Saldo gabungan semua akun</div>
            </div>
          </div>
        </Card>

        <Card title="Alert Anomali">
          {anomalies.length === 0 ? <Empty text="Tidak ada anomali." /> : (
            <ul className="space-y-2 text-sm">
              {anomalies.slice(0, 3).map((a) => (
                <li key={a.id} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="AI Insight">
          {insights.length === 0 ? <Empty text="Belum ada insight." /> : (
            <ul className="space-y-2 text-sm">
              {insights.slice(0, 3).map((it, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${it.tone === "warning" ? "text-amber-500" : it.tone === "success" ? "text-emerald-500" : "text-blue-500"}`} />
                  <span>{it.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* unused placeholder */}
      <input type="hidden" value={PiggyBank.displayName ?? ""} />
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
};

function Kpi({
  label, value, icon: Icon, hint, tone = "sky",
}: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; hint?: string; tone?: keyof typeof TONES }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-3">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function RankList({ rows }: { rows: { name: string; value: number }[] }) {
  if (rows.length === 0) return <Empty text="Tidak ada data sesuai filter." />;
  const max = rows[0].value || 1;
  return (
    <ol className="space-y-2 text-sm">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="h-5 w-6 justify-center p-0">{i + 1}</Badge>
              {r.name}
            </span>
            <span className="font-mono text-muted-foreground">{formatCompactIDR(r.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
