import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { invoices, monthlyTrend, expenseMTD, bankBalance } from "@/data/financeData";
import { formatIDR } from "@/lib/finance";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/finance/arus-kas")({
  component: ArusKas,
});

function ArusKas() {
  const data = useMemo(() => {
    const kasMasuk = invoices.reduce((a, r) => a + r.paid, 0);
    const kasKeluar = expenseMTD;
    const investasi = -250_000_000;
    const pendanaan = 100_000_000;
    const arusOperasi = kasMasuk - kasKeluar;
    const arusBersih = arusOperasi + investasi + pendanaan;
    return { kasMasuk, kasKeluar, investasi, pendanaan, arusOperasi, arusBersih };
  }, []);

  const chart = monthlyTrend.map((m) => ({ month: m.month, masuk: m.revenue, keluar: m.expense, net: m.revenue - m.expense }));

  const Row = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
    <tr className={bold ? "border-t font-semibold" : ""}>
      <td className="py-2">{label}</td>
      <td className={`py-2 text-right font-mono ${value < 0 ? "text-rose-600" : ""}`}>{formatIDR(value)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Laporan Keuangan</div>
        <h1 className="text-2xl font-semibold">Arus Kas</h1>
        <p className="text-sm text-muted-foreground">Aktivitas operasi, investasi, dan pendanaan periode berjalan.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Ringkasan</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Kas Masuk dari Operasi" value={data.kasMasuk} />
              <Row label="Kas Keluar untuk Operasi" value={-data.kasKeluar} />
              <Row label="Arus Kas Operasi" value={data.arusOperasi} bold />
              <Row label="Arus Kas Investasi" value={data.investasi} />
              <Row label="Arus Kas Pendanaan" value={data.pendanaan} />
              <tr className="border-t-2 border-foreground/20"><td className="py-2 text-base font-bold">Kenaikan/(Penurunan) Kas</td><td className={`py-2 text-right font-mono text-base font-bold ${data.arusBersih < 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatIDR(data.arusBersih)}</td></tr>
              <Row label="Saldo Kas Akhir" value={bankBalance + data.arusBersih} bold />
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Arus Kas Bulanan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${Math.round(Number(v) / 1e6)}jt`} />
                <Tooltip formatter={(v) => formatIDR(Number(v))} />
                <Legend />
                <Bar dataKey="masuk" name="Masuk" fill="#3b82f6" />
                <Bar dataKey="keluar" name="Keluar" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
