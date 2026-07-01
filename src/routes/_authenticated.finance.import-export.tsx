import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Download, Upload, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/import-export")({
  
  head: () => pageHead({ title: "Import / Export — Finance", description: "Import / Export pada modul keuangan klinik.", path: "/finance/import-export" }),
  component: Page,
});

function Page() {
  const items = [
    { to: "/finance/rekonsiliasi", title: "Import Mutasi Bank (CSV)", desc: "Upload mutasi bank untuk rekonsiliasi.", icon: Upload },
    { to: "/finance/laba-rugi", title: "Export Laba Rugi (CSV/PDF)", desc: "Download laporan laba rugi.", icon: Download },
    { to: "/finance/neraca", title: "Export Neraca (CSV/PDF)", desc: "Download neraca saldo.", icon: Download },
    { to: "/finance/arus-kas", title: "Export Arus Kas (CSV/PDF)", desc: "Download arus kas.", icon: Download },
    { to: "/finance/jurnal", title: "Export Jurnal (CSV)", desc: "Download jurnal & buku besar.", icon: Download },
    { to: "/finance/audit", title: "Export Audit Log (CSV)", desc: "Download log aktivitas finance.", icon: Download },
  ];
  return (
    <div>
      <PageHeader title="Import / Export Data" desc="Pintasan untuk import & export data finance." />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Link key={i.to} to={i.to}>
              <Card className="p-4 hover:bg-accent transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-semibold">{i.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{i.desc}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
