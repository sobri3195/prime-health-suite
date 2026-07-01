import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { formatIDR } from "@/lib/finance";
import { useFinanceDate } from "@/context/finance-date";
import { getReportHighlight } from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-report-highlight")({
  
  head: () => pageHead({ title: "Report Highlight — Finance", description: "Report Highlight pada modul keuangan klinik.", path: "/finance/pendapatan-report-highlight" }),
  component: Page,
});

function Page() {
  const { from, to } = useFinanceDate();
  const call = useServerFn(getReportHighlight);
  const q = useQuery({
    queryKey: ["fin", "highlight", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  const d = q.data;
  const payerMap = d?.payerMap ?? {};
  const klaim = (Number((payerMap as any).BPJS ?? 0) + Number((payerMap as any).Asuransi ?? 0));
  const umum = Number((payerMap as any).Umum ?? 0);
  const total = d?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Report Highlight"
        desc={`Sorotan periode ${from || "awal"} – ${to || "sekarang"}: top day, dokter, layanan, dan payer (data live).`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Total Pendapatan" value={formatIDR(total)} desc={`${d?.count ?? 0} invoice`} />
        <Card label="Top Day" value={d?.topDay ? new Date(d.topDay[0]).toLocaleDateString("id-ID") : "—"} desc={d?.topDay ? formatIDR(d.topDay[1]) : "—"} />
        <Card label="Top Dokter" value={d?.topDoctor?.[0] ?? "—"} desc={d?.topDoctor ? formatIDR(d.topDoctor[1]) : "—"} />
        <Card label="Top Layanan" value={d?.topService?.[0] ?? "—"} desc={d?.topService ? formatIDR(d.topService[1]) : "—"} />
        <Card label="Top Payer" value={d?.topPayer?.[0] ?? "—"} desc={d?.topPayer ? formatIDR(d.topPayer[1]) : "—"} />
        <Card label="Rata-rata Invoice" value={formatIDR(d?.count ? Math.round(total / d.count) : 0)} desc="ATV" />
        <Card label="% Klaim" value={`${total ? ((klaim / total) * 100).toFixed(1) : "0.0"}%`} desc="BPJS + Asuransi" />
        <Card label="% Umum" value={`${total ? ((umum / total) * 100).toFixed(1) : "0.0"}%`} desc="Cash payer" />
      </div>

      {q.isLoading && <p className="mt-4 text-xs text-muted-foreground">Memuat…</p>}
      {q.isError && <p className="mt-4 text-xs text-rose-600">Gagal memuat: {(q.error as Error).message}</p>}
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
