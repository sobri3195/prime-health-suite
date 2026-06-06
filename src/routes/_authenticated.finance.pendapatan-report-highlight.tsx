import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR, byPayer, topBy, sumRevenue } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-report-highlight")({
  component: Page,
});

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);

  const rows = applyFilter(invoices, filter);
  const total = sumRevenue(rows);
  const dokter = topBy(rows, "doctor", 1)[0];
  const layanan = topBy(rows, "service", 1)[0];
  const payerMap = byPayer(rows);
  const topPayer = Object.entries(payerMap).sort((a, b) => b[1] - a[1])[0];

  // top day
  const byDay = new Map<string, number>();
  rows.forEach((r) => {
    const d = new Date(r.date).toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + r.total);
  });
  const topDay = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])[0];

  return (
    <div>
      <PageHeader title="Report Highlight" desc="Sorotan periode: top day, dokter, layanan, dan payer." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Total Pendapatan" value={formatIDR(total)} desc={`${rows.length} invoice`} />
        <Card label="Top Day" value={topDay ? new Date(topDay[0]).toLocaleDateString("id-ID") : "—"} desc={topDay ? formatIDR(topDay[1]) : "—"} />
        <Card label="Top Dokter" value={dokter?.name ?? "—"} desc={dokter ? formatIDR(dokter.value) : "—"} />
        <Card label="Top Layanan" value={layanan?.name ?? "—"} desc={layanan ? formatIDR(layanan.value) : "—"} />
        <Card label="Top Payer" value={topPayer?.[0] ?? "—"} desc={topPayer ? formatIDR(topPayer[1]) : "—"} />
        <Card label="Rata-rata Invoice" value={formatIDR(rows.length ? Math.round(total / rows.length) : 0)} desc="ATV" />
        <Card label="% Klaim" value={`${((((payerMap.BPJS ?? 0) + (payerMap.Asuransi ?? 0)) / Math.max(1, total)) * 100).toFixed(1)}%`} desc="BPJS + Asuransi" />
        <Card label="% Umum" value={`${(((payerMap.Umum ?? 0) / Math.max(1, total)) * 100).toFixed(1)}%`} desc="Cash payer" />
      </div>
    </div>
  );
}

function Card({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
