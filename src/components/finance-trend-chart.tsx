import { lazy, Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { LineChart } from "lucide-react";

const TrendChart = lazy(() => import("./finance-trend-chart-inner").then((m) => ({ default: m.TrendChartInner })));

export type TrendPoint = { month: string; revenue: number; expense: number; target?: number };

export function FinanceTrendChart({ data }: { data: TrendPoint[] }) {
  const hasData = data.some((d) => (d.revenue ?? 0) !== 0 || (d.expense ?? 0) !== 0);
  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          compact
          icon={<LineChart className="h-5 w-5" />}
          title="Belum ada data tren"
          desc="Grafik akan muncul setelah ada transaksi pendapatan atau pengeluaran pada periode ini."
        />
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Memuat grafik…</div>}>
      <TrendChart data={data} />
    </Suspense>
  );
}
