import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Bell, Grid3x3, LifeBuoy, FileText, Users, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/apps/")({
  component: AppsDashboard,
});

function AppsDashboard() {
  const stats = [
    { l: "Aplikasi aktif", v: "12", i: Grid3x3 },
    { l: "Notifikasi baru", v: "8", i: Bell },
    { l: "Tiket terbuka", v: "3", i: LifeBuoy },
    { l: "Dokumen baru", v: "5", i: FileText },
  ];
  return (
    <div>
      <PageHeader title="Workspace Dashboard" desc="Ringkasan aktivitas internal Klinik Utama Mata." />
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-cyan-accent" /> Aktivitas Tim</div>
          <ul className="space-y-3 text-sm">
            {[
              { n: "dr. Rini", a: "Menyelesaikan rekam medis P-00128" },
              { n: "Front Office", a: "Mendaftarkan 24 pasien hari ini" },
              { n: "Accounting", a: "Posting jurnal harian #JV-0421" },
            ].map((x) => (
              <li key={x.n} className="flex items-center justify-between">
                <span><span className="font-medium">{x.n}</span> · {x.a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 font-medium"><Activity className="h-4 w-4 text-cyan-accent" /> Status Sistem</div>
          <ul className="space-y-2 text-sm">
            {["SIM Klinik Mata", "Prime Simon Finance", "Integration Bus", "Identity"].map((n) => (
              <li key={n} className="flex items-center justify-between">
                <span>{n}</span>
                <span className="rounded-full bg-emerald-accent/15 px-2 py-0.5 text-xs text-emerald-accent">operational</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
