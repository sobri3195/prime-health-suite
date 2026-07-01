import { lazy, Suspense } from "react";

const TrendChart = lazy(() => import("./finance-trend-chart-inner").then((m) => ({ default: m.TrendChartInner })));

export type TrendPoint = { month: string; revenue: number; expense: number; target?: number };

export function FinanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Memuat grafik…</div>}>
      <TrendChart data={data} />
    </Suspense>
  );
}
