import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices } from "@/data/financeData";
import { applyFilter, formatIDR, topBy } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/pendapatan-ranking-dokter")({
  component: Page,
});

function Page() {
  const [filter, setFilter] = useState(defaultFilter);
  const doctors = useMemo(() => Array.from(new Set(invoices.map((r) => r.doctor))), []);
  const services = useMemo(() => Array.from(new Set(invoices.map((r) => r.category))), []);

  const rows = applyFilter(invoices, filter);
  const ranking = topBy(rows, "doctor", 20);
  const max = ranking[0]?.value || 1;
  const total = ranking.reduce((a, r) => a + r.value, 0);

  const exportCSV = () => {
    const csv = toCSV(
      ranking.map((r, i) => ({ rank: i + 1, name: r.name, value: r.value, share: ((r.value / total) * 100).toFixed(2) })),
      [
        { key: "rank", label: "Rank", get: (r) => r.rank },
        { key: "name", label: "Dokter", get: (r) => r.name },
        { key: "value", label: "Pendapatan", get: (r) => r.value },
        { key: "share", label: "Share (%)", get: (r) => r.share },
      ],
    );
    downloadCSV(exportFileName("ranking-dokter", filter.period), csv);
    toast.success(`Export ${ranking.length} dokter`);
  };

  return (
    <div>
      <PageHeader title="Ranking Dokter" desc="Peringkat dokter berdasarkan total pendapatan periode." />
      <FinanceFilters value={filter} onChange={setFilter} doctors={doctors} services={services} />

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total {ranking.length} dokter · {formatIDR(total)}</div>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-5">
        {ranking.map((r, i) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-6 text-right text-xs font-mono text-muted-foreground">#{i + 1}</span>
            <span className="w-40 truncate text-sm">{r.name}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted">
              <div className="absolute inset-y-0 left-0 bg-[var(--gradient-hero)]" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="w-32 text-right font-mono text-xs">{formatIDR(r.value)}</span>
            <span className="w-14 text-right text-xs text-muted-foreground">{((r.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
        {ranking.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data pada filter ini.</div>}
      </div>
    </div>
  );
}
