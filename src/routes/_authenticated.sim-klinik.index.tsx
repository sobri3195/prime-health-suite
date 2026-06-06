import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserPlus, Repeat, CheckCircle2, Clock, Timer, AlertTriangle, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { dashboard } from "@/data/clinicData";

export const Route = createFileRoute("/_authenticated/sim-klinik/")({
  component: SimDashboard,
});

function SimDashboard() {
  const d = dashboard;
  const totalPayer = Object.values(d.byPayer).reduce((a, b) => a + b, 0);
  const stats = [
    { l: "Pasien hari ini", v: d.today, i: Users },
    { l: "Pasien baru", v: d.newPatients, i: UserPlus },
    { l: "Pasien kontrol", v: d.control, i: Repeat },
    { l: "Kunjungan selesai", v: d.completed, i: CheckCircle2 },
    { l: "Menunggu", v: d.waiting, i: Clock },
    { l: "Waktu tunggu rata-rata", v: `${d.avgWaitMin} mnt`, i: Timer },
  ];
  return (
    <div>
      <PageHeader title="Dashboard Klinik" desc="Ringkasan operasional klinik mata hari ini." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.l}</span>
              <s.i className="h-4 w-4 text-cyan-accent" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{s.v}</div>
          </div>
        ))}
      </div>

      {d.incompletePatients > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span><strong>{d.incompletePatients} pasien</strong> memiliki data belum lengkap (NIK/kontak). Lengkapi di modul Pasien.</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Tren Kunjungan Bulanan</h3>
            <Badge variant="secondary">6 bulan</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.monthlyTrend}>
                <defs>
                  <linearGradient id="cv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fill="url(#cv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">Pasien per Payer</h3>
          <div className="space-y-3">
            {Object.entries(d.byPayer).map(([k, v]) => {
              const pct = Math.round((v / totalPayer) * 100);
              return (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{k}</span>
                    <span className="text-muted-foreground">{v} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-[var(--gradient-accent)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Tindakan Terbanyak</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="space-y-2 text-sm">
            {d.topActions.map((a) => (
              <li key={a.name} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <span>{a.name}</span>
                <span className="font-medium">{a.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">Jadwal Dokter Hari Ini</h3>
          <ul className="space-y-3 text-sm">
            {d.todayDoctors.map((doc) => (
              <li key={doc.doctor}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{doc.doctor}</div>
                    <div className="text-xs text-muted-foreground">{doc.poli} • {doc.slot}</div>
                  </div>
                  <Badge variant={doc.load > 90 ? "destructive" : doc.load > 70 ? "default" : "secondary"}>
                    {doc.load}%
                  </Badge>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${doc.load}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
