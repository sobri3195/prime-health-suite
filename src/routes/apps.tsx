import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import type { LucideIcon } from "lucide-react";
import { Bell, FileText, LifeBuoy, LayoutGrid, Activity, Folder, MessageSquare, Calendar } from "lucide-react";

export const Route = createFileRoute("/apps")({
  head: () => ({
    meta: [
      { title: "Prime Apps — Workspace Portal" },
      { name: "description", content: "Portal internal, launcher aplikasi, notifikasi, helpdesk, SOP, dan dokumen klinik dalam satu workspace." },
    ],
  }),
  component: AppsPage,
});

type AppItem = { name: string; desc: string; icon: LucideIcon; tag: string };

const apps: AppItem[] = [
  { name: "SIM Klinik Mata", desc: "Operasional klinik", icon: Activity, tag: "Klinis" },
  { name: "Prime Simon Finance", desc: "Dashboard keuangan", icon: LayoutGrid, tag: "Finance" },
  { name: "Helpdesk", desc: "Tiket & dukungan", icon: LifeBuoy, tag: "Support" },
  { name: "Dokumen & SOP", desc: "Pustaka dokumen", icon: FileText, tag: "Knowledge" },
  { name: "Notifikasi", desc: "Inbox terpusat", icon: Bell, tag: "Inbox" },
  { name: "Jadwal", desc: "Kalender internal", icon: Calendar, tag: "Schedule" },
  { name: "Chat Internal", desc: "Komunikasi tim", icon: MessageSquare, tag: "Comms" },
  { name: "Drive", desc: "Penyimpanan file", icon: Folder, tag: "Storage" },
];

function AppsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PageHeader
          eyebrow="Prime Apps"
          title="Workspace Portal"
          desc="Pusat akses untuk seluruh aplikasi internal Klinik Utama Mata."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {apps.map((a) => (
            <div key={a.name} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-navy-foreground">
                <a.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <h3 className="font-semibold">{a.name}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{a.tag}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/" className="text-sm text-cyan-accent hover:underline">← Kembali ke beranda</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{title}</h1>
      <p className="mt-3 text-muted-foreground">{desc}</p>
    </div>
  );
}
