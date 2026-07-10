import { pageHead } from "@/lib/page-head";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Wallet, TrendingUp, TrendingDown, Receipt, Landmark, AlertTriangle, Sparkles,
  PiggyBank, ShieldCheck, FileWarning, ArrowDownCircle, ArrowUpCircle, Activity,
  Printer, Download, RotateCcw, Plus, FileText, UserPlus, BadgeCheck, Calendar, Search,
  Link2, Keyboard, ArrowUp,
} from "lucide-react";
import { FinanceTrendChart } from "@/components/finance-trend-chart";
import { getFinanceDashboard } from "@/lib/finance-dashboard.functions";
import {
  applyFilter, sumOutstanding, byPayer, topBy, netProfit, aging,
  formatIDR, formatCompactIDR, generateInsights,
} from "@/lib/finance";
import type { Invoice, Payer } from "@/types/finance";
import { useFinanceDate } from "@/context/finance-date";
import { FinanceExportBar } from "@/components/finance-export-bar";
import { ReconWidget } from "@/components/recon-widget";


export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => pageHead({ title: 'Dashboard Finance — Prime Health', description: 'Ringkasan kas, piutang, hutang, dan laba klinik secara real-time.', path: '/finance' }),
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const navigate = useNavigate();
  const { from, to, label: period } = useFinanceDate();
  const [globalQ, setGlobalQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const call = useServerFn(getFinanceDashboard);
  const q = useQuery({
    queryKey: ["fin", "dashboard", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  // Batch 4 polish: keyboard shortcuts — "/" focus search, "p" print, "?" show help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const editable = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (editable) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        toast.info("Shortcuts: / cari · P print · L copy link · ↑ scroll top", { duration: 4000 });
      }
      else if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); copyShareLink(); }
      else if (e.key.toLowerCase() === "p" && (e.metaKey || e.ctrlKey)) { /* leave native */ }
      else if (e.key.toLowerCase() === "p" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); window.print(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Scroll-to-top affordance
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link dashboard (dengan filter) disalin");
    } catch {
      toast.error("Gagal menyalin link");
    }
  }, []);

  const invoices = (q.data?.invoices ?? []) as unknown as Invoice[];
  const monthlyTrend = q.data?.monthlyTrend ?? [];
  const expenseMTD = q.data?.expenseAll ?? 0;
  const bankBalance = q.data?.bankBalance ?? 0;
  const anomalies = q.data?.anomalies ?? [];
  const hutang = q.data?.hutang ?? 0;
  const recentActivities = q.data?.recentActivities ?? [];
  const alerts = q.data?.alerts ?? { overdueCount: 0, overdueTotal: 0, apVendors: 0, apTotal: 0, unreconciledCount: 0 };

  const inRange = invoices;
  const filter = useMemo(() => ({ period: "all", doctor: "all", service: "all", payer: "all", status: "all", from, to } as const), [from, to]);
  const filtered = useMemo(() => applyFilter(inRange, filter), [inRange, filter]);

  const mtdRev = filtered.reduce((a, r) => a + r.total, 0);
  const outstanding = sumOutstanding(filtered);
  const kasMasuk = filtered.reduce((a, r) => a + r.paid, 0);
  const kasKeluar = expenseMTD;
  const target = monthlyTrend[monthlyTrend.length - 1]?.target ?? 0;
  const targetPct = target ? Math.round((mtdRev / target) * 100) : 0;
  const growth = (() => {
    const a = monthlyTrend.at(-2)?.revenue ?? 0;
    const b = monthlyTrend.at(-1)?.revenue ?? 0;
    return a ? Math.round(((b - a) / a) * 100) : 0;
  })();
  const laba = netProfit(mtdRev, kasKeluar);
  const insights = generateInsights(filtered, monthlyTrend);

  if (q.isLoading) {
    return (
      <div className="-mx-6 -my-6 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 dark:from-slate-950 dark:via-background dark:to-slate-900 md:-mx-8 md:-my-8 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-80" />
        </div>
        <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-6 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6 dark:from-slate-950 dark:via-background dark:to-slate-900 md:-mx-8 md:-my-8 md:p-8">
      {/* Top action bar */}

      <div className="no-print sticky top-0 z-30 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center gap-2">
          <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <Calendar className="mr-1.5 h-3 w-3" /> Periode aktif: {period}
          </Badge>
          <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
            <BadgeCheck className="mr-1.5 h-3 w-3" /> Tersimpan
          </Badge>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={globalQ}
              onChange={(e) => setGlobalQ(e.target.value)}
              placeholder='Cari global... (tekan "/")'
              className="h-9 pl-8"
              onKeyDown={(e) => { if (e.key === "Enter" && globalQ) toast.info(`Mencari "${globalQ}"…`); }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={copyShareLink} title="Copy shareable link (L)">
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Copy Link
          </Button>
          <FinanceExportBar
            resource="pendapatan-dashboard"
            title="Pendapatan Periode"
            columns={[
              { key: "date", header: "Tanggal" },
              { key: "invoice", header: "Invoice" },
              { key: "payer", header: "Payer" },
              { key: "doctor", header: "Dokter" },
              { key: "service", header: "Layanan" },
              { key: "total", header: "Total", format: (r) => r.total.toLocaleString("id-ID") },
              { key: "paid", header: "Dibayar", format: (r) => r.paid.toLocaleString("id-ID") },
              { key: "status", header: "Status" },
            ]}
            rows={filtered}
            meta={{ page: "dashboard" }}
          />
          <Button variant="outline" size="sm" onClick={() => toast.info("Shortcuts: / cari · P print · L copy link · ? bantuan", { duration: 4000 })} title="Keyboard shortcuts (?)">
            <Keyboard className="h-3.5 w-3.5" />
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
            <FinanceTrendChart data={monthlyTrend} />
          </div>
        </Card>

        <Card title="Quick Actions" subtitle="Aksi operasional finance yang paling sering dipakai.">
          <div className="space-y-2">
            <Button className="w-full justify-center bg-blue-600 hover:bg-blue-700" onClick={() => navigate({ to: "/finance/pendapatan-input-harian" })}>
              <Plus className="mr-2 h-4 w-4" /> Input Pendapatan
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/voucher-bkk" })}>
              <FileText className="mr-2 h-4 w-4" /> Buat Voucher BKK
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/voucher-bbk" })}>
              <FileText className="mr-2 h-4 w-4" /> Buat Voucher BBK
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/master/vendor" })}>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah Vendor
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/laporan" })}>
              <Download className="mr-2 h-4 w-4" /> Export Laporan
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => navigate({ to: "/finance/rekonsiliasi" })}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Rekonsiliasi Bank
            </Button>
          </div>
        </Card>
      </div>

      {/* Payer + Top Dokter (filterable) */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PayerCard rows={invoices} />
        <TopDokterCard rows={invoices} />
      </div>

      {/* Saldo Bank + Anomalies + Insights + Konsistensi */}
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
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

        <ReconWidget />
      </div>

      {/* AR Aging + AP Aging + Recent Activities + Finance Alerts */}
      <AgingActivitiesAlerts rows={filtered} outstanding={outstanding} hutang={hutang} recentActivities={recentActivities} alerts={alerts} />

      {/* unused placeholder */}
      <input type="hidden" value={PiggyBank.displayName ?? ""} />

      {/* Scroll-to-top FAB */}
      {showTop && (
        <Button
          size="icon"
          variant="secondary"
          aria-label="Kembali ke atas"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="no-print fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full border border-border shadow-lg"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}

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

type ActivityItem = { id: string; kind: "payment" | "invoice"; ref: string; subject: string; note: string; amount: number; date: string };
type AlertsBundle = { overdueCount: number; overdueTotal: number; apVendors: number; apTotal: number; unreconciledCount: number };

function AgingActivitiesAlerts({ rows, outstanding, hutang, recentActivities, alerts }: { rows: import("@/types/finance").Invoice[]; outstanding: number; hutang: number; recentActivities: ActivityItem[]; alerts: AlertsBundle }) {
  const ar = aging(rows);
  const apQ = useQuery({
    queryKey: ["fin","ap-aging"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("fin_expense")
        .select("tanggal,total,status")
        .not("status", "in", "(void,cancelled,draft)")
        .gte("tanggal", new Date(Date.now() - 1000*60*60*24*180).toISOString().slice(0,10));
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const ap = useMemo(() => {
    const buckets = { "0-30": { amount: 0, count: 0 }, "31-60": { amount: 0, count: 0 }, "61-90": { amount: 0, count: 0 }, ">90": { amount: 0, count: 0 } } as Record<string, { amount: number; count: number }>;
    const today = Date.now();
    for (const r of apQ.data ?? []) {
      const age = Math.floor((today - new Date(r.tanggal as string).getTime()) / (1000*60*60*24));
      const b = age <= 30 ? "0-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : ">90";
      buckets[b].amount += Number(r.total) || 0;
      buckets[b].count += 1;
    }
    return (["0-30","31-60","61-90",">90"] as const).map((bucket) => ({ bucket, ...buckets[bucket] }));
  }, [apQ.data]);
  const recent: ActivityItem[] = recentActivities.length ? recentActivities.slice(0, 6) : rows.slice(0, 5).map((r) => ({
    id: r.id, kind: "invoice", ref: r.invoice, subject: r.patientCode, note: r.service, amount: r.total, date: r.date,
  }));

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-4">
      <Card title="AR Aging" subtitle="Distribusi piutang berdasarkan umur">
        <AgingBars data={ar} tone="amber" />
      </Card>
      <Card title="AP Aging" subtitle="Distribusi hutang berdasarkan umur">
        <AgingBars data={ap} tone="rose" />
      </Card>
      <Card title="Recent Activities" subtitle={`${recent.length} transaksi terakhir`}>
        <ul className="space-y-2 text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/20 p-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs">{r.ref}</div>
                <div className="truncate text-[11px] text-muted-foreground">{r.subject} • {r.note}</div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className={r.kind === "payment" ? "text-emerald-600" : ""}>{formatCompactIDR(r.amount)}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{r.kind === "payment" ? "Bayar" : "Invoice"}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Finance Alerts" subtitle="Perlu tindakan">
        <ul className="space-y-2 text-sm">
          <li className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="font-medium">Piutang jatuh tempo</div>
            <div className="text-xs text-muted-foreground">{alerts.overdueCount} invoice • {formatIDR(alerts.overdueTotal || outstanding)}</div>
          </li>
          <li className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
            <div className="font-medium">Hutang jatuh tempo</div>
            <div className="text-xs text-muted-foreground">{alerts.apVendors} vendor • {formatIDR(alerts.apTotal || hutang)}</div>
          </li>
          <li className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
            <div className="font-medium">Belum rekonsiliasi</div>
            <div className="text-xs text-muted-foreground">{alerts.unreconciledCount} transaksi • Perlu matching bank</div>
          </li>
        </ul>
      </Card>
    </div>
  );
}


function AgingBars({ data, tone }: { data: { bucket: string; amount: number; count: number }[]; tone: "amber" | "rose" }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  const color = tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <ul className="space-y-2 text-sm">
      {data.map((d) => (
        <li key={d.bucket}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{d.bucket} hari</span>
            <span className="font-mono">{formatCompactIDR(d.amount)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(d.amount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------ filterable cards (parity with prime-simon) ------------------ */

function useUrlState(prefix: string) {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string | undefined> });
  const get = useCallback((k: string) => search[`${prefix}_${k}`] ?? "", [search, prefix]);
  const set = useCallback((patch: Record<string, string | string[] | undefined>) => {
    navigate({
      to: ".", replace: true,
      search: ((prev: Record<string, unknown> = {}) => {
        const next = { ...prev } as Record<string, unknown>;
        for (const [k, v] of Object.entries(patch)) {
          const key = `${prefix}_${k}`;
          if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete next[key];
          else next[key] = Array.isArray(v) ? v.join(",") : v;
        }
        return next;
      }) as never,
    });
  }, [navigate, prefix]);
  return { get, set };
}

function dateRange<T extends Invoice>(rows: T[], from: string, to: string): T[] {
  return rows.filter((r) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });
}

const PAYER_OPTIONS: (Payer | "all")[] = ["all", "Umum", "BPJS", "Asuransi", "Perusahaan"];

function FilterRow({
  from, to, onFrom, onTo, onReset, extra,
}: {
  from: string; to: string;
  onFrom: (v: string) => void; onTo: (v: string) => void;
  onReset: () => void; extra?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-2 text-xs">
      <div className="flex flex-col">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dari</label>
        <input type="date" value={from} onChange={(e) => onFrom(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
      </div>
      <div className="flex flex-col">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ke</label>
        <input type="date" value={to} onChange={(e) => onTo(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs" />
      </div>
      {extra}
      <Button size="sm" variant="outline" className="ml-auto h-8" onClick={onReset}>
        <RotateCcw className="mr-1 h-3 w-3" /> Reset Filter
      </Button>
    </div>
  );
}

const MONTH_LABEL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function monthKey(d: string) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; }
function monthLabel(key: string) { const [y, m] = key.split("-"); return `${MONTH_LABEL[Number(m)-1]} ${y}`; }
function monthRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2,"0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
  return { from, to };
}

function PayerCard({ rows }: { rows: Invoice[] }) {
  const url = useUrlState("pc");
  const from = url.get("from");
  const to = url.get("to");
  const compare = useMemo(() => (url.get("cmp") ? url.get("cmp").split(",").filter(Boolean) : []), [url]);
  const setFrom = (v: string) => url.set({ from: v });
  const setTo = (v: string) => url.set({ to: v });
  const [pickerOpen, setPickerOpen] = useState(false);

  const availableMonths = useMemo(() => {
    const set = new Set(rows.map((r) => monthKey(r.date)));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => dateRange(rows, from, to), [rows, from, to]);
  const byP = byPayer(filtered);
  const totalAll = Object.values(byP).reduce((a, b) => a + b, 0);
  const top = Object.entries(byP).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const activePayers = Object.entries(byP).filter(([, v]) => v > 0).length;

  // comparison data
  const compareData = useMemo(() => {
    return compare.map((mk) => {
      const { from: f, to: t } = monthRange(mk);
      const sub = dateRange(rows, f, t);
      return { key: mk, label: monthLabel(mk), byPayer: byPayer(sub), total: sub.reduce((a, r) => a + r.total, 0) };
    });
  }, [rows, compare]);

  const allPayersInCompare = useMemo(() => {
    const s = new Set<string>();
    compareData.forEach((c) => Object.entries(c.byPayer).forEach(([k, v]) => { if (v > 0) s.add(k); }));
    return Array.from(s);
  }, [compareData]);

  const toggleCompare = (mk: string) => {
    const next = compare.includes(mk) ? compare.filter((x) => x !== mk) : [...compare, mk].sort();
    url.set({ cmp: next });
    setPickerOpen(false);
  };

  return (
    <Card title="Pendapatan by Payer" subtitle="Distribusi pendapatan berdasarkan payer/asuransi">
      <FilterRow
        from={from} to={to} onFrom={setFrom} onTo={setTo}
        onReset={() => { url.set({ from: undefined, to: undefined, cmp: undefined }); }}
        extra={
          <div className="relative flex flex-col">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Bandingkan Periode</label>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setPickerOpen((v) => !v)}>
              <Plus className="mr-1 h-3 w-3" /> Tambah Periode
            </Button>
            {pickerOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-44 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {availableMonths.map((mk) => (
                  <button key={mk} type="button" onClick={() => toggleCompare(mk)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${compare.includes(mk) ? "bg-accent" : ""}`}>
                    <span>{monthLabel(mk)}</span>
                    {compare.includes(mk) && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {compare.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {compare.map((mk) => (
            <Badge key={mk} variant="secondary" className="cursor-pointer gap-1" onClick={() => toggleCompare(mk)}>
              {monthLabel(mk)} <span className="text-muted-foreground">✕</span>
            </Badge>
          ))}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => url.set({ cmp: undefined })}>Clear Comparison</Button>
        </div>
      )}

      <div className="mb-2 text-[11px] text-muted-foreground">
        Menampilkan data {from || "awal"} – {to || "sekarang"}
      </div>
      {totalAll === 0 ? (
        <Empty text="Tidak ada data pada rentang ini." />
      ) : (
        <ul className="space-y-3 text-sm">
          {(Object.entries(byP) as [string, number][]).map(([k, v]) => {
            const pct = totalAll ? Math.round((v / totalAll) * 100) : 0;
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
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{formatIDR(totalAll)}</div></div>
        <div><div className="text-muted-foreground">Payer Terbesar</div><div className="font-semibold">{top}</div></div>
        <div><div className="text-muted-foreground">Jumlah Payer</div><div className="font-semibold">{activePayers}</div></div>
      </div>

      {compareData.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="text-xs font-semibold">Summary Perbandingan</div>
          <div className="grid gap-1 text-xs">
            {compareData.map((c) => (
              <div key={c.key} className="flex justify-between">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono font-semibold">{formatIDR(c.total)}</span>
              </div>
            ))}
          </div>
          <div className="text-xs font-semibold">Perbandingan Payer Antar Periode</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1 pr-2 font-medium">Payer</th>
                  {compareData.map((c) => <th key={c.key} className="py-1 px-2 text-right font-medium">{c.label}</th>)}
                  {compareData.slice(1).map((c, i) => (
                    <th key={`g-${c.key}`} className="py-1 px-2 text-right font-medium">
                      Growth {compareData[i].label.split(" ")[0].slice(0,3)}-{c.label.split(" ")[0].slice(0,3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPayersInCompare.map((p) => (
                  <tr key={p} className="border-b border-border/40">
                    <td className="py-1 pr-2 font-medium">{p}</td>
                    {compareData.map((c) => (
                      <td key={c.key} className="py-1 px-2 text-right font-mono">{formatCompactIDR((c.byPayer as Record<string, number>)[p] ?? 0)}</td>
                    ))}
                    {compareData.slice(1).map((c, i) => {
                      const cur = (c.byPayer as Record<string, number>)[p] ?? 0;
                      const prev = (compareData[i].byPayer as Record<string, number>)[p] ?? 0;
                      const diff = cur - prev;
                      return (
                        <td key={`d-${c.key}`} className={`py-1 px-2 text-right font-mono ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {diff >= 0 ? "+" : ""}{formatCompactIDR(diff)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function TopDokterCard({ rows }: { rows: Invoice[] }) {
  const url = useUrlState("td");
  const from = url.get("from");
  const to = url.get("to");
  const payer = (url.get("payer") || "all") as Payer | "all";
  const compare = useMemo(() => (url.get("cmp") ? url.get("cmp").split(",").filter(Boolean) : []), [url]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const setFrom = (v: string) => url.set({ from: v });
  const setTo = (v: string) => url.set({ to: v });
  const setPayer = (v: Payer | "all") => url.set({ payer: v === "all" ? undefined : v });

  const availableMonths = useMemo(() => Array.from(new Set(rows.map((r) => monthKey(r.date)))).sort().reverse(), [rows]);
  const filtered = useMemo(() => dateRange(rows, from, to).filter((r) => payer === "all" || r.payer === payer), [rows, from, to, payer]);
  const top = topBy(filtered, "doctor", 10);
  const totalRev = filtered.reduce((a, r) => a + r.total, 0);

  const compareData = useMemo(() => compare.map((mk) => {
    const { from: f, to: t } = monthRange(mk);
    const sub = dateRange(rows, f, t).filter((r) => payer === "all" || r.payer === payer);
    return { key: mk, label: monthLabel(mk), top: topBy(sub, "doctor", 10), total: sub.reduce((a, r) => a + r.total, 0) };
  }), [rows, compare, payer]);

  const toggleCompare = (mk: string) => {
    const next = compare.includes(mk) ? compare.filter((x) => x !== mk) : [...compare, mk].sort();
    url.set({ cmp: next });
    setPickerOpen(false);
  };

  return (
    <Card title="Top 10 Dokter by Revenue" subtitle="Peringkat dokter berdasarkan total pendapatan">
      <FilterRow
        from={from} to={to} onFrom={setFrom} onTo={setTo}
        onReset={() => { url.set({ from: undefined, to: undefined, payer: undefined, cmp: undefined }); }}
        extra={
          <>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Payer</label>
              <select value={payer} onChange={(e) => setPayer(e.target.value as Payer | "all")}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs capitalize">
                {PAYER_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="relative flex flex-col">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Bandingkan Periode</label>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setPickerOpen((v) => !v)}>
                <Plus className="mr-1 h-3 w-3" /> Tambah Periode
              </Button>
              {pickerOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-44 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                  {availableMonths.map((mk) => (
                    <button key={mk} type="button" onClick={() => toggleCompare(mk)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${compare.includes(mk) ? "bg-accent" : ""}`}>
                      <span>{monthLabel(mk)}</span>
                      {compare.includes(mk) && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      />
      {compare.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {compare.map((mk) => (
            <Badge key={mk} variant="secondary" className="cursor-pointer gap-1" onClick={() => toggleCompare(mk)}>
              {monthLabel(mk)} <span className="text-muted-foreground">✕</span>
            </Badge>
          ))}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => url.set({ cmp: undefined })}>Clear Comparison</Button>
        </div>
      )}
      <div className="mb-2 text-[11px] text-muted-foreground">
        Menampilkan data {from || "awal"} – {to || "sekarang"} • Payer: <span className="capitalize">{payer}</span>
      </div>
      <RankList rows={top} />
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <div><div className="text-muted-foreground">Total Revenue</div><div className="font-semibold">{formatIDR(totalRev)}</div></div>
        <div><div className="text-muted-foreground">Jumlah Dokter</div><div className="font-semibold">{top.length}</div></div>
        <div><div className="text-muted-foreground">Dokter Tertinggi</div><div className="truncate font-semibold">{top[0]?.name ?? "—"}</div></div>
      </div>
      {compareData.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <div className="text-xs font-semibold">Summary Perbandingan</div>
          {compareData.map((c) => (
            <div key={c.key} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{c.label} · {c.top.length} dokter</span>
              <span className="font-mono font-semibold">{formatIDR(c.total)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
