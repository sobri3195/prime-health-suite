import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/pajak-rekap")({
  component: Page,
});

function Page() {
  const items = [
    { to: "/finance/pajak-pph2123", title: "PPh 21 / 23", desc: "PPh atas jasa vendor & karyawan." },
    { to: "/finance/pajak-pph-honor", title: "PPh Honor Dokter", desc: "Potongan PPh atas jasa dokter." },
    { to: "/finance/pajak-ppn", title: "PPN", desc: "PPN keluaran vs masukan (estimasi 11%)." },
  ];
  return (
    <div>
      <PageHeader title="Rekap Pajak Bulanan" desc="Ringkasan kewajiban pajak per bulan, drill ke detail tiap jenis." />
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((i) => (
          <Link key={i.to} to={i.to}>
            <Card className="p-4 hover:bg-accent transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{i.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{i.desc}</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
