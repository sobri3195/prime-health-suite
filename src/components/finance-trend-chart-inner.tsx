import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatIDR, formatCompactIDR } from "@/lib/finance";
import type { TrendPoint } from "./finance-trend-chart";

export function TrendChartInner({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="e2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(v) => formatCompactIDR(Number(v))} />
        <Tooltip formatter={(v) => formatIDR(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
        <Legend />
        <Area type="monotone" name="Pendapatan" dataKey="revenue" stroke="#3b82f6" fill="url(#r2)" strokeWidth={2} />
        <Area type="monotone" name="Pengeluaran" dataKey="expense" stroke="#f59e0b" fill="url(#e2)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
