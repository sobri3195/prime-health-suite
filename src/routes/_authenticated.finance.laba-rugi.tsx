import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { invoices, monthlyTrend, expenseMTD } from "@/data/financeData";
import { formatIDR, netProfit, estimatedTax } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/laba-rugi")({
  component: LabaRugi,
});

function LabaRugi() {
  const data = useMemo(() => {
    const rev = invoices.reduce((a, r) => a + r.total, 0);
    const cogs = Math.round(rev * 0.42);
    const opex = expenseMTD;
    const grossProfit = rev - cogs;
    const operatingProfit = grossProfit - opex;
    const tax = estimatedTax(rev, cogs + opex);
    const net = netProfit(rev, cogs + opex);
    return { rev, cogs, opex, grossProfit, operatingProfit, tax, net };
  }, []);

  const Row = ({ label, value, bold, indent }: { label: string; value: number; bold?: boolean; indent?: boolean }) => (
    <tr className={bold ? "font-semibold" : ""}>
      <td className={`py-2 ${indent ? "pl-6" : ""}`}>{label}</td>
      <td className={`py-2 text-right font-mono ${value < 0 ? "text-rose-600" : ""}`}>{formatIDR(value)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Laporan Keuangan</div>
        <h1 className="text-2xl font-semibold">Laba Rugi</h1>
        <p className="text-sm text-muted-foreground">Ringkasan pendapatan, biaya, dan laba bersih periode berjalan.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Pendapatan Usaha" value={data.rev} bold />
            <Row label="Harga Pokok Layanan (HPP)" value={-data.cogs} indent />
            <tr className="border-t"><td className="py-2 font-semibold">Laba Kotor</td><td className="py-2 text-right font-mono font-semibold">{formatIDR(data.grossProfit)}</td></tr>
            <Row label="Beban Operasional" value={-data.opex} indent />
            <tr className="border-t"><td className="py-2 font-semibold">Laba Operasi</td><td className="py-2 text-right font-mono font-semibold">{formatIDR(data.operatingProfit)}</td></tr>
            <Row label="Pajak (11%)" value={-data.tax} indent />
            <tr className="border-t-2 border-foreground/20"><td className="py-2 text-base font-bold">Laba Bersih</td><td className={`py-2 text-right font-mono text-base font-bold ${data.net < 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatIDR(data.net)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {monthlyTrend.slice(-3).map((m) => (
          <div key={m.month} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">{m.month}</div>
            <div className="mt-1 text-base font-semibold">{formatIDR(m.revenue - m.expense)}</div>
            <div className="text-[11px] text-muted-foreground">Margin {Math.round(((m.revenue - m.expense) / m.revenue) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
