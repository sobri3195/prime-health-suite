import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import {
  Wallet, TrendingUp, Receipt, Landmark, AlertTriangle, Sparkles, Target,
  PiggyBank, ShieldCheck, FileWarning,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { invoices, monthlyTrend, expenseMTD, bankBalance, claimsPending, anomalies } from "@/data/financeData";
import {
  applyFilter, sumRevenue, sumOutstanding, aging, byPayer, topBy,
  ebitda, netProfit, estimatedTax, formatIDR, formatCompactIDR, generateInsights,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/")({
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const [filter, setFilter] = useState(defaultFilter);

  const doctors = useMemo(() => Array.from(new Set(invoices.map((i) => i.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((i) => i.category))), []);

  const filtered = useMemo(() => applyFilter(invoices, filter), [filter]);

  const todayRev = useMemo(
    () => applyFilter(invoices, { ...filter, period: "today" }).reduce((a, r) => a + r.total, 0),
    [filter],
  );
  const mtdRev = useMemo(
    () => applyFilter(invoices, { ...filter, period: "mtd" }).reduce((a, r) => a + r.total, 0),
    [filter],
  );

  const target = monthlyTrend[monthlyTrend.length - 1]?.target ?? 0;
  const targetPct = target ? Math.min(100, Math.round((mtdRev / target) * 100)) : 0;
  const outstanding = sumOutstanding(filtered);
  const expense = expenseMTD;
  const ebitdaV = ebitda(mtdRev, expense);
  const netV = netProfit(mtdRev, expense);
  const taxV = estimatedTax(mtdRev, expense);
  const agingRows = aging(filtered);
  const byP = byPayer(filtered);
  const insights = generateInsights(filtered, monthlyTrend);

  return (
    <div>
      <PageHeader title="Dashboard Finance" desc="Ringkasan kinerja keuangan klinik dengan filter global." />

      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Pendapatan Hari Ini" value={formatCompactIDR(todayRev)} icon={Wallet} />
        <Kpi label="Pendapatan MTD" value={formatCompactIDR(mtdRev)} icon={TrendingUp} hint={`Target ${formatCompactIDR(target)}`} />
        <Kpi label="Piutang Aktif" value={formatCompactIDR(outstanding)} icon={FileWarning} />
        <Kpi label="Klaim Pending" value={String(claimsPending)} icon={ShieldCheck} hint="BPJS unpaid/partial" />
        <Kpi label="Pengeluaran MTD" value={formatCompactIDR(expense)} icon={Receipt} />
        <Kpi label="Saldo Bank" value={formatCompactIDR(bankBalance)} icon={Landmark} />
        <Kpi label="EBITDA" value={formatCompactIDR(ebitdaV)} icon={Target} />
        <Kpi label="Laba Bersih (est.)" value={formatCompactIDR(netV)} icon={PiggyBank} />
        <Kpi label="Estimasi Pajak" value={formatCompactIDR(taxV)} icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Target vs Realisasi (MTD)">
          <div className="flex items-end justify-between text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Realisasi</div>
              <div className="text-2xl font-semibold">{formatIDR(mtdRev)}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">Target</div>
              <div className="text-base">{formatIDR(target)}</div>
            </div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[var(--gradient-accent)]" style={{ width: `${targetPct}%` }} />
          </div>
          <div className="mt-1 text-right text-xs text-muted-foreground">{targetPct}% dari target</div>
        </Card>

        <Card title="Pendapatan per Payer">
          <ul className="space-y-2 text-sm">
            {(Object.entries(byP) as [string, number][]).map(([k, v]) => {
              const totalAll = Object.values(byP).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((v / totalAll) * 100);
              return (
                <li key={k}>
                  <div className="flex justify-between text-xs">
                    <span>{k}</span><span className="text-muted-foreground">{formatCompactIDR(v)} ({pct}%)</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Tren Pendapatan vs Pengeluaran">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="e" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCompactIDR(Number(v))} />
                <Tooltip formatter={(v) => formatIDR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" name="Pendapatan" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#r)" strokeWidth={2} />
                <Area type="monotone" name="Pengeluaran" dataKey="expense" stroke="#f43f5e" fill="url(#e)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Aging Piutang">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingRows}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bucket" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => formatCompactIDR(Number(v))} />
                <Tooltip formatter={(v) => formatIDR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Top 10 Dokter by Revenue">
          <RankList rows={topBy(filtered, "doctor", 10)} />
        </Card>
        <Card title="Top 10 Tindakan by Revenue">
          <RankList rows={topBy(filtered, "service", 10)} />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Alert Transaksi Anomali">
          {anomalies.length === 0 ? <Empty text="Tidak ada anomali." />
            : (
              <ul className="space-y-2 text-sm">
                {anomalies.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{a.text}</span>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card title="AI Insight Panel">
          {insights.length === 0 ? <Empty text="Belum ada insight." />
            : (
              <ul className="space-y-2 text-sm">
                {insights.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                    <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${it.tone === "warning" ? "text-amber-500" : it.tone === "success" ? "text-emerald-500" : "text-cyan-accent"}`} />
                    <span>{it.text}</span>
                  </li>
                ))}
              </ul>
            )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, hint }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-cyan-accent" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h3 className="mb-3 font-medium">{title}</h3>
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
            <div className="h-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
