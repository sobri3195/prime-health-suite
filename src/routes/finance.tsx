import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { PageHeader } from "./apps";
import { Wallet, TrendingUp, Receipt, Landmark } from "lucide-react";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Prime Simon Finance — Dashboard Keuangan" },
      { name: "description", content: "Pendapatan, piutang, pengeluaran, pajak, jurnal, buku besar, dan laporan manajemen." },
    ],
  }),
  component: FinancePage,
});

const ledger = [
  { date: "2026-06-05", ref: "INV-2026-0421", desc: "Tindakan refraksi", debit: 0, credit: 1_250_000 },
  { date: "2026-06-05", ref: "INV-2026-0422", desc: "Konsultasi spesialis", debit: 0, credit: 850_000 },
  { date: "2026-06-04", ref: "EXP-2026-0118", desc: "Pembelian alat steril", debit: 4_500_000, credit: 0 },
  { date: "2026-06-04", ref: "INV-2026-0420", desc: "Operasi katarak", debit: 0, credit: 12_500_000 },
  { date: "2026-06-03", ref: "TAX-2026-0033", desc: "PPN keluaran", debit: 1_375_000, credit: 0 },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function FinancePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PageHeader
          eyebrow="Prime Simon Finance"
          title="Dashboard keuangan"
          desc="Pantau pendapatan, piutang, pengeluaran, pajak, dan laporan manajemen secara real-time."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            { l: "Pendapatan bulan ini", v: fmt(1_842_500_000), c: "+8.4%", icon: Wallet },
            { l: "Piutang", v: fmt(221_000_000), c: "-3.1%", icon: TrendingUp },
            { l: "Pengeluaran", v: fmt(642_300_000), c: "+2.7%", icon: Receipt },
            { l: "Saldo bank", v: fmt(3_120_700_000), c: "+5.2%", icon: Landmark },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.l}</span>
                <s.icon className="h-4 w-4 text-cyan-accent" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{s.v}</div>
              <div className="mt-1 text-xs text-emerald-accent">{s.c}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Jurnal terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Referensi</th>
                  <th className="px-5 py-3">Deskripsi</th>
                  <th className="px-5 py-3 text-right">Debit</th>
                  <th className="px-5 py-3 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.ref} className="border-t border-border">
                    <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                    <td className="px-5 py-3 font-mono text-xs">{r.ref}</td>
                    <td className="px-5 py-3">{r.desc}</td>
                    <td className="px-5 py-3 text-right">{r.debit ? fmt(r.debit) : "—"}</td>
                    <td className="px-5 py-3 text-right text-emerald-accent">{r.credit ? fmt(r.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <Link to="/" className="text-sm text-cyan-accent hover:underline">← Kembali ke beranda</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
