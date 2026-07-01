import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserPlus, Activity, Calendar, ListChecks, Wallet, ReceiptText, Pill, Boxes, AlertTriangle, TrendingUp,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { getDashboardStats } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/")({
  head: () => pageHead({ title: 'Dashboard SIM Klinik', description: 'Ringkasan operasional klinik: kunjungan, antrian, dan pendapatan hari ini.', path: '/sim-klinik' }),
  component: DashboardKlinikPage,
});

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

function rupiah(n: number) { return "Rp " + Number(n ?? 0).toLocaleString("id-ID"); }

function DashboardKlinikPage() {
  const call = useServerFn(getDashboardStats);
  const q = useQuery({ queryKey: ["klinik","dashboard"], queryFn: () => call({ data: {} }) });
  const k = q.data?.kpi;

  const kpis: Array<{ label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; href?: string; tone?: string }> = [
    { label: "Total Pasien", value: k?.pasienAll ?? "-", icon: Users, href: "/sim-klinik/pasien" },
    { label: "Pasien Baru (Bulan ini)", value: k?.pasienNew ?? "-", icon: UserPlus, href: "/sim-klinik/pasien" },
    { label: "Kunjungan Hari Ini", value: k?.visitToday ?? "-", icon: Activity, href: "/sim-klinik/pemeriksaan" },
    { label: "Booking Hari Ini", value: k?.bookingToday ?? "-", icon: Calendar, href: "/sim-klinik/registrasi" },
    { label: "Antrian Aktif", value: k?.queueActive ?? "-", icon: ListChecks, href: "/sim-klinik/antrian" },
    { label: "Pendapatan Hari Ini", value: rupiah(k?.revenueToday ?? 0), icon: Wallet, href: "/sim-klinik/billing", tone: "primary" },
    { label: "Pendapatan Bulan Ini", value: rupiah(k?.revenueMonth ?? 0), icon: TrendingUp, href: "/sim-klinik/laporan", tone: "primary" },
    { label: "Invoice Belum Lunas", value: k?.invoiceUnpaid ?? "-", icon: ReceiptText, href: "/sim-klinik/billing", tone: "warning" },
    { label: "Resep Menunggu", value: k?.prescriptionPending ?? "-", icon: Pill, href: "/sim-klinik/resep", tone: "warning" },
    { label: "Stok Rendah", value: k?.lowStock ?? "-", icon: Boxes, href: "/sim-klinik/obat", tone: "danger" },
    { label: "Hampir Expired", value: k?.nearExp ?? "-", icon: AlertTriangle, href: "/sim-klinik/obat", tone: "danger" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard Klinik" desc="Ringkasan operasional Klinik Utama Prime Mata — data real-time." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {kpis.map((kp) => {
          const Icon = kp.icon;
          const Body = (
            <Card className="p-3 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${kp.tone === "danger" ? "text-red-500" : kp.tone === "warning" ? "text-amber-500" : kp.tone === "primary" ? "text-primary" : "text-muted-foreground"}`} />
                {kp.tone === "danger" && Number(kp.value) > 0 && <Badge variant="destructive" className="text-[10px]">!</Badge>}
              </div>
              <div className="mt-2 text-xl font-bold">{q.isLoading ? "…" : kp.value}</div>
              <div className="text-[11px] text-muted-foreground">{kp.label}</div>
            </Card>
          );
          return kp.href ? <Link key={kp.label} to={kp.href}>{Body}</Link> : <div key={kp.label}>{Body}</div>;
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-2 text-sm font-semibold">Tren Kunjungan 30 Hari Terakhir</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={q.data?.trend ?? []}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-sm font-semibold">Distribusi Tipe Pasien</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={q.data?.payerMix ?? []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {(q.data?.payerMix ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="mb-2 text-sm font-semibold">Pendapatan 12 Bulan Terakhir</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={q.data?.revenue ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
              <Tooltip formatter={(v: number) => rupiah(v)} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
