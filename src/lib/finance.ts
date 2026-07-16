import type {
  Invoice, AgingBucket, MonthlyTrend, Payer, PaymentStatus, FinanceFilter,
} from "@/types/finance";

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export const formatCompactIDR = (n: number) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (Math.abs(v) >= 1e3) return `Rp ${(v / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return "Rp " + Math.round(v).toLocaleString("id-ID");
};

export function applyFilter(rows: Invoice[], f: FinanceFilter): Invoice[] {
  const now = Date.now();
  return rows.filter((r) => {
    const t = new Date(r.date).getTime();
    if (f.period === "today" && now - t > 864e5) return false;
    if (f.period === "mtd") {
      const d = new Date(r.date), nd = new Date();
      if (d.getMonth() !== nd.getMonth() || d.getFullYear() !== nd.getFullYear()) return false;
    }
    if (f.period === "ytd" && new Date(r.date).getFullYear() !== new Date().getFullYear()) return false;
    if (f.payer !== "all" && r.payer !== f.payer) return false;
    if (f.doctor !== "all" && r.doctor !== f.doctor) return false;
    if (f.service !== "all" && r.category !== f.service) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    return true;
  });
}

export function sumRevenue(rows: Invoice[]) { return rows.reduce((a, r) => a + r.total, 0); }
export function sumPaid(rows: Invoice[]) { return rows.reduce((a, r) => a + r.paid, 0); }
export function sumOutstanding(rows: Invoice[]) {
  return rows.reduce((a, r) => a + Math.max(0, r.total - r.paid), 0);
}

export function aging(rows: Invoice[]): AgingBucket[] {
  const buckets: Record<AgingBucket["bucket"], { amount: number; count: number }> = {
    "0-30": { amount: 0, count: 0 }, "31-60": { amount: 0, count: 0 },
    "61-90": { amount: 0, count: 0 }, ">90": { amount: 0, count: 0 },
  };
  const now = Date.now();
  rows.forEach((r) => {
    const out = r.total - r.paid;
    if (out <= 0 || r.status === "cancelled" || r.status === "paid") return;
    const days = Math.floor((now - new Date(r.dueDate).getTime()) / 864e5);
    const b: AgingBucket["bucket"] =
      days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : ">90";
    buckets[b].amount += out;
    buckets[b].count += 1;
  });
  return (Object.keys(buckets) as AgingBucket["bucket"][]).map((bucket) => ({ bucket, ...buckets[bucket] }));
}

export function byPayer(rows: Invoice[]): Record<Payer, number> {
  const init: Record<Payer, number> = { Umum: 0, BPJS: 0, Asuransi: 0, Perusahaan: 0 };
  rows.forEach((r) => { init[r.payer] += r.total; });
  return init;
}

export function topBy<T extends "doctor" | "service">(rows: Invoice[], key: T, n = 10) {
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r[key], (map.get(r[key]) ?? 0) + r.total));
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, n);
}

export function ebitda(revenue: number, expense: number) { return revenue - expense; }
export function netProfit(revenue: number, expense: number, taxRate = 0.11) {
  const ebt = revenue - expense;
  return ebt - Math.max(0, ebt) * taxRate;
}
export function estimatedTax(revenue: number, expense: number, taxRate = 0.11) {
  return Math.max(0, revenue - expense) * taxRate;
}

export function statusBadgeClass(s: PaymentStatus) {
  return s === "paid" ? "bg-emerald-500/15 text-emerald-600"
    : s === "partial" ? "bg-blue-500/15 text-blue-600"
    : s === "unpaid" ? "bg-amber-500/15 text-amber-600"
    : s === "overdue" ? "bg-rose-500/15 text-rose-600"
    : "bg-muted text-muted-foreground";
}

export function statusLabel(s: PaymentStatus) {
  return ({ paid: "Paid", partial: "Partial", unpaid: "Unpaid", overdue: "Overdue", cancelled: "Cancelled" } as const)[s];
}

export function generateInsights(rows: Invoice[], trend: MonthlyTrend[]) {
  const out: { tone: "info" | "warning" | "success"; text: string }[] = [];
  const outstanding = sumOutstanding(rows);
  const agingRows = aging(rows);
  const over90 = agingRows.find((a) => a.bucket === ">90");
  const last = trend[trend.length - 1], prev = trend[trend.length - 2];
  if (last && prev) {
    if (prev.revenue === 0 && last.revenue > 0) {
      out.push({ tone: "success", text: `Pendapatan bulan ${last.month} mulai tercatat (${formatIDR(last.revenue)}) vs ${prev.month} nihil.` });
    } else if (prev.revenue === 0 && last.revenue === 0) {
      out.push({ tone: "info", text: `Pendapatan bulan ${last.month} dan ${prev.month} nihil.` });
    } else {
      const delta = ((last.revenue - prev.revenue) / prev.revenue) * 100;
      out.push({
        tone: delta >= 0 ? "success" : "warning",
        text: `Pendapatan bulan ${last.month} ${delta >= 0 ? "naik" : "turun"} ${Math.abs(delta).toFixed(1)}% vs ${prev.month}.`,
      });
    }
  }
  if (over90 && over90.amount > 0) {
    out.push({ tone: "warning", text: `Piutang > 90 hari: ${formatIDR(over90.amount)} (${over90.count} invoice). Perlu follow-up.` });
  }
  const pByPayer = byPayer(rows);
  const topPayer = (Object.entries(pByPayer) as [Payer, number][]).sort((a, b) => b[1] - a[1])[0];
  if (topPayer) out.push({ tone: "info", text: `Kontributor terbesar: ${topPayer[0]} (${formatIDR(topPayer[1])}).` });
  if (last && last.revenue < last.target) {
    const gap = last.target - last.revenue;
    out.push({ tone: "warning", text: `Realisasi ${last.month} ${formatIDR(gap)} di bawah target.` });
  }
  out.push({ tone: "info", text: `Outstanding total: ${formatIDR(outstanding)} dari ${rows.length} invoice.` });
  return out;
}
