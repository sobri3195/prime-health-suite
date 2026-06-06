import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Users, Activity, Bell, LifeBuoy, FileText, Stethoscope, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { notifications, tickets, documents, users, systemHealth } from "@/data/appsData";
import { AIInsightPanel } from "@/components/apps/ai-insight";
import { StatusBadge } from "@/components/apps/ui";

export const Route = createFileRoute("/_authenticated/apps/")({
  component: AppsDashboard,
});

function AppsDashboard() {
  const activeUsers = users.filter((u) => u.status === "active").length;
  const unread = notifications.filter((n) => n.status === "unread").length;
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const newDocs = documents.filter((d) => Date.now() - new Date(d.updatedAt).getTime() < 7 * 864e5).length;

  const stats = [
    { l: "User aktif", v: activeUsers.toString(), i: Users },
    { l: "Aktivitas hari ini", v: "47", i: Activity },
    { l: "Notifikasi baru", v: unread.toString(), i: Bell },
    { l: "Tiket terbuka", v: openTickets.toString(), i: LifeBuoy },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace Dashboard" desc="Ringkasan aktivitas seluruh ekosistem Klinik Utama Mata." />

      <div className="grid gap-4 md:grid-cols-4">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* System status */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Status Sistem</h2>
              <span className="text-xs text-muted-foreground">Real-time</span>
            </div>
            <ul className="space-y-2 text-sm">
              {systemHealth.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      s.status === "online" ? "bg-emerald-accent"
                      : s.status === "degraded" ? "bg-amber-500" : "bg-destructive"
                    }`} />
                    {s.name}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{s.latencyMs}ms</span>
                    <StatusBadge tone={s.status === "online" ? "ok" : s.status === "degraded" ? "warn" : "danger"}>
                      {s.status}
                    </StatusBadge>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cross-system alerts */}
          <div className="grid gap-4 md:grid-cols-2">
            <AlertCard
              icon={Stethoscope}
              title="Alert SIM Klinik Mata"
              items={[
                "12 pasien dengan data belum lengkap",
                "Jadwal dr. Rini, Sp.M terisi 96%",
                "3 kunjungan menunggu > 45 menit",
              ]}
            />
            <AlertCard
              icon={Wallet}
              title="Alert Finance"
              items={[
                "Piutang Asuransi > 60 hari: Rp 142,5 jt",
                "5 voucher menunggu approval",
                "Sync invoice gagal: 3 item",
              ]}
            />
          </div>

          {/* Recent notifications + tickets */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Notifikasi terbaru</h2>
                <Link to="/apps/notifications" className="text-xs text-cyan-accent hover:underline">Lihat semua</Link>
              </div>
              <ul className="space-y-3 text-sm">
                {notifications.slice(0, 4).map((n) => (
                  <li key={n.id} className="flex items-start gap-2">
                    {n.severity === "critical" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                    ) : n.severity === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan-accent" />
                    )}
                    <span className="line-clamp-2">{n.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Tiket helpdesk terbuka</h2>
                <Link to="/apps/helpdesk" className="text-xs text-cyan-accent hover:underline">Lihat semua</Link>
              </div>
              <ul className="space-y-3 text-sm">
                {tickets.filter((t) => t.status === "open" || t.status === "in_progress").slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span className="truncate pr-2">{t.subject}</span>
                    <StatusBadge tone={t.priority === "critical" ? "danger" : t.priority === "high" ? "warn" : "info"}>
                      {t.priority}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent documents */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Dokumen terbaru</h2>
              <Link to="/apps/documents" className="text-xs text-cyan-accent hover:underline">Lihat semua</Link>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {documents.slice(0, 4).map((d) => (
                <li key={d.id} className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                  <FileText className="mt-0.5 h-4 w-4 text-cyan-accent" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.category} · {d.version}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{newDocs} dokumen diperbarui dalam 7 hari terakhir.</p>
          </div>
        </div>

        <div>
          <AIInsightPanel />
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  icon: Icon, title, items,
}: { icon: typeof Stethoscope; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-cyan-accent" /> {title}
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
