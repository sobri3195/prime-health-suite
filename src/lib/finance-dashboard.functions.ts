import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

// Map a payer name to one of the 4 canonical payer categories.
function normalizePayer(name?: string | null): "Umum" | "BPJS" | "Asuransi" | "Perusahaan" {
  const n = (name ?? "").toLowerCase();
  if (n.includes("bpjs")) return "BPJS";
  if (n.includes("asuransi") || n.includes("insurance")) return "Asuransi";
  if (n.includes("perusahaan") || n.includes("corporate") || n.includes("pt ")) return "Perusahaan";
  return "Umum";
}

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function monthLabelShort(iso: string) {
  const m = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
  const [y, mo] = iso.split("-");
  return `${m[Number(mo) - 1]} ${y.slice(2)}`;
}

// ============ LIVE INVOICES (shape compatible with @/types/finance Invoice) ============
type LiveInvoice = {
  id: string; invoice: string; date: string; dueDate: string; patientCode: string;
  payer: "Umum" | "BPJS" | "Asuransi" | "Perusahaan"; payerName: string;
  doctor: string; service: string; category: string;
  total: number; paid: number;
  status: "paid" | "partial" | "unpaid" | "overdue" | "cancelled";
};
async function fetchInvoices(from?: string, to?: string): Promise<LiveInvoice[]> {
  const s = await sb();
  let q = s.from("fin_invoice").select(`
    id, no_invoice, tanggal, status, total, dibayar, patient_code, patient_name,
    payer_id, dokter_id,
    fin_payer(name), fin_dokter(name),
    fin_invoice_item(layanan_nama)
  `).neq("status", "void").order("tanggal", { ascending: false });
  if (from) q = q.gte("tanggal", from);
  if (to) q = q.lte("tanggal", to);
  const { data, error } = await q.limit(2000);
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => {
    const firstItem = r.fin_invoice_item?.[0];
    const service = firstItem?.layanan_nama ?? "Layanan";
    const total = Number(r.total) || 0;
    const paid = Number(r.dibayar) || 0;
    const due = new Date(new Date(r.tanggal).getTime() + 14 * 86400000)
      .toISOString().slice(0, 10);
    const rawStatus = (r.status ?? "draft") as string;
    const status: "paid" | "partial" | "unpaid" | "overdue" | "cancelled" =
      rawStatus === "lunas" || rawStatus === "paid" ? "paid"
      : rawStatus === "partial" || (paid > 0 && paid < total) ? "partial"
      : rawStatus === "cancelled" || rawStatus === "void" ? "cancelled"
      : Date.now() > new Date(due).getTime() && paid < total ? "overdue"
      : "unpaid";
    return {
      id: r.id,
      invoice: r.no_invoice,
      date: r.tanggal,
      dueDate: due,
      patientCode: r.patient_code,
      payer: normalizePayer(r.fin_payer?.name),
      payerName: r.fin_payer?.name ?? "Umum",
      doctor: r.fin_dokter?.name ?? "—",
      service,
      category: service,
      total, paid, status,
    };
  });
}

// ============ DASHBOARD (live) ============
export const getFinanceDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data }) => {
    const s = await sb();
    const invoices = await fetchInvoices(data.from, data.to);

    // Expenses (paid + draft)
    let eq = s.from("fin_expense").select("id, tanggal, total:total, status, vendor_id, fin_vendor(name)")
      .neq("status", "void");
    if (data.from) eq = eq.gte("tanggal", data.from);
    if (data.to) eq = eq.lte("tanggal", data.to);
    const { data: expensesRaw } = await eq.limit(2000);

    // Tolerate either `total` or `nominal` column by selecting * if first attempt yields no totals
    let expenses = expensesRaw ?? [];
    if (expenses.length && expenses[0].total === undefined) {
      const { data: ex2 } = await s.from("fin_expense").select("*")
        .neq("status", "void")
        .gte("tanggal", data.from ?? "1900-01-01")
        .lte("tanggal", data.to ?? "2999-12-31").limit(2000);
      expenses = ex2 ?? [];
    }

    const expenseMTD = expenses
      .filter((e: any) => (e.status ?? "") !== "draft")
      .reduce((a: number, e: any) => a + (Number(e.total ?? e.nominal ?? e.amount) || 0), 0);
    const hutang = expenses
      .filter((e: any) => (e.status ?? "") === "draft")
      .reduce((a: number, e: any) => a + (Number(e.total ?? e.nominal ?? e.amount) || 0), 0);

    // 12-month trend (all-time, ignores from/to so chart is informative)
    const { data: invAll } = await s.from("fin_invoice")
      .select("tanggal, total, status")
      .neq("status", "void")
      .gte("tanggal", new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
    const { data: expAll } = await s.from("fin_expense")
      .select("tanggal, total, status")
      .neq("status", "void")
      .gte("tanggal", new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10));
    const trendMap = new Map<string, { revenue: number; expense: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trendMap.set(k, { revenue: 0, expense: 0 });
    }
    (invAll ?? []).forEach((r: any) => {
      const k = monthKey(r.tanggal);
      if (trendMap.has(k)) trendMap.get(k)!.revenue += Number(r.total) || 0;
    });
    (expAll ?? []).forEach((e: any) => {
      const k = monthKey(e.tanggal);
      if (trendMap.has(k)) trendMap.get(k)!.expense += Number(e.total ?? e.nominal ?? e.amount) || 0;
    });
    const monthlyTrend = Array.from(trendMap.entries()).map(([k, v]) => ({
      month: monthLabelShort(`${k}-01`),
      revenue: v.revenue,
      expense: v.expense,
      target: Math.round(v.revenue * 1.1) || 50_000_000,
    }));

    // Bank balance = sum of journal lines for cash/bank COA (1100/1110/1120) net debit
    const { data: bankLines } = await s
      .from("fin_journal_line")
      .select("coa_code, debit, kredit, fin_journal_entry!inner(status)")
      .eq("fin_journal_entry.status", "posted")
      .in("coa_code", ["1100", "1110", "1120"]);
    const bankBalance = (bankLines ?? []).reduce(
      (a: number, l: any) => a + (Number(l.debit) - Number(l.kredit)), 0,
    );

    // Anomalies (auto-derived)
    const anomalies: { id: string; text: string }[] = [];
    const overdue = invoices.filter((i) => i.status === "overdue");
    if (overdue.length) anomalies.push({
      id: "AN-OD",
      text: `${overdue.length} invoice melewati jatuh tempo (total Rp ${overdue.reduce((a, r) => a + (r.total - r.paid), 0).toLocaleString("id-ID")}).`,
    });
    const bigInsurance = invoices.filter((i) => i.payer === "Asuransi" && i.total - i.paid > 10_000_000);
    if (bigInsurance.length) anomalies.push({
      id: "AN-INS",
      text: `${bigInsurance.length} klaim Asuransi nilai > Rp 10jt belum lunas.`,
    });
    if (bankBalance < 0) anomalies.push({
      id: "AN-CASH",
      text: `Saldo kas/bank negatif (Rp ${bankBalance.toLocaleString("id-ID")}). Cek jurnal.`,
    });

    return { invoices, monthlyTrend, expenseMTD, expenseAll: expenseMTD + hutang, bankBalance, hutang, anomalies };
  });

// ============ HONOR REKAP (per dokter) ============
export const getHonorRekap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data }) => {
    const invoices = await fetchInvoices(data.from, data.to);
    const s = await sb();
    const { data: dokters } = await s.from("fin_dokter").select("name, default_fee_pct");
    const pctMap = new Map<string, number>((dokters ?? []).map((d: any) => [d.name, Number(d.default_fee_pct) || 40]));

    const map = new Map<string, { dokter: string; pct: number; count: number; gross: number; jasa: number }>();
    invoices.forEach((r) => {
      if (r.status === "cancelled") return;
      const pct = pctMap.get(r.doctor) ?? 40;
      const cur = map.get(r.doctor) ?? { dokter: r.doctor, pct, count: 0, gross: 0, jasa: 0 };
      cur.count += 1;
      cur.gross += r.total;
      cur.jasa += Math.round((r.total * pct) / 100);
      map.set(r.doctor, cur);
    });
    return { rows: Array.from(map.values()).sort((a, z) => z.jasa - a.jasa) };
  });

// ============ REPORT HIGHLIGHT ============
export const getReportHighlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data }) => {
    const invoices = await fetchInvoices(data.from, data.to);
    const total = invoices.reduce((a, r) => a + r.total, 0);

    const byDoctor = new Map<string, number>();
    const byService = new Map<string, number>();
    const byPayer = new Map<string, number>();
    const byDay = new Map<string, number>();
    invoices.forEach((r) => {
      byDoctor.set(r.doctor, (byDoctor.get(r.doctor) ?? 0) + r.total);
      byService.set(r.service, (byService.get(r.service) ?? 0) + r.total);
      byPayer.set(r.payer, (byPayer.get(r.payer) ?? 0) + r.total);
      const day = r.date.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + r.total);
    });
    const top = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      count: invoices.length,
      topDoctor: top(byDoctor),
      topService: top(byService),
      topPayer: top(byPayer),
      topDay: top(byDay),
      payerMap: Object.fromEntries(byPayer),
    };
  });

// ============ BUKU BESAR (per akun: opening, debit, credit, closing) ============
export const getBukuBesar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data }) => {
    const s = await sb();
    const { data: coa } = await s.from("fin_coa").select("code, name, type").order("code");

    // opening balances (lines BEFORE `from`) — batasi 50k baris untuk mencegah OOM
    const opening = new Map<string, number>();
    if (data.from) {
      const { data: pre } = await s
        .from("fin_journal_line")
        .select("coa_code, debit, kredit, fin_journal_entry!inner(tanggal, status)")
        .eq("fin_journal_entry.status", "posted")
        .lt("fin_journal_entry.tanggal", data.from)
        .limit(50000);
      (pre ?? []).forEach((l: any) => {
        opening.set(l.coa_code, (opening.get(l.coa_code) ?? 0) + (Number(l.debit) - Number(l.kredit)));
      });
    }

    // period activity — batasi juga
    let q = s
      .from("fin_journal_line")
      .select("coa_code, debit, kredit, fin_journal_entry!inner(tanggal, status)")
      .eq("fin_journal_entry.status", "posted");
    if (data.from) q = q.gte("fin_journal_entry.tanggal", data.from);
    if (data.to) q = q.lte("fin_journal_entry.tanggal", data.to);
    const { data: lines } = await q.limit(50000);

    const acc = new Map<string, { debit: number; kredit: number }>();
    (lines ?? []).forEach((l: any) => {
      const cur = acc.get(l.coa_code) ?? { debit: 0, kredit: 0 };
      cur.debit += Number(l.debit) || 0;
      cur.kredit += Number(l.kredit) || 0;
      acc.set(l.coa_code, cur);
    });

    type Row = { account: string; accountName: string; type: string; opening: number; debit: number; credit: number; closing: number };
    const rows: Row[] = (coa ?? []).map((c: any): Row => {
      const a = acc.get(c.code) ?? { debit: 0, kredit: 0 };
      const op = opening.get(c.code) ?? 0;
      const closing = op + a.debit - a.kredit;
      return {
        account: c.code,
        accountName: c.name,
        type: c.type,
        opening: op,
        debit: a.debit,
        credit: a.kredit,
        closing,
      };
    }).filter((r: Row) => r.opening !== 0 || r.debit !== 0 || r.credit !== 0);

    return { rows };
  });

// ============ Master snapshot (all reference tables) ============
export const getMasterSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const s = await sb();
    const [payers, vendors, coa, taxes, costCenters, kategori] = await Promise.all([
      s.from("fin_payer").select("*").order("name"),
      s.from("fin_vendor").select("*").order("name"),
      s.from("fin_coa").select("*").order("code"),
      s.from("fin_tarif_pajak").select("*").order("code"),
      s.from("fin_cost_center").select("*").order("code"),
      s.from("fin_kategori_layanan").select("*").order("name"),
    ]);
    return {
      payers: payers.data ?? [],
      vendors: vendors.data ?? [],
      coa: coa.data ?? [],
      taxes: taxes.data ?? [],
      costCenters: costCenters.data ?? [],
      kategori: kategori.data ?? [],
    };
  });

// ============ PAJAK rekap bulanan (PPN out/in + PPh 21 dokter, 1 tahun) ============
export const getPajakRekap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number }) => d)
  .handler(async ({ data }) => {
    const s = await sb();
    const yr = data.year;
    const from = `${yr}-01-01`, to = `${yr}-12-31`;

    const { data: invs } = await s.from("fin_invoice")
      .select("tanggal, total, dibayar, status, pajak")
      .neq("status", "void").gte("tanggal", from).lte("tanggal", to);
    const { data: exps } = await s.from("fin_expense")
      .select("tanggal, total, pajak, status")
      .neq("status", "void").gte("tanggal", from).lte("tanggal", to);

    const m: Record<string, { ppnOut: number; ppnIn: number; pph21: number; revenue: number; expense: number }> = {};
    for (let i = 0; i < 12; i++) {
      const k = `${yr}-${String(i + 1).padStart(2, "0")}`;
      m[k] = { ppnOut: 0, ppnIn: 0, pph21: 0, revenue: 0, expense: 0 };
    }
    (invs ?? []).forEach((r: any) => {
      const k = monthKey(r.tanggal);
      if (!m[k]) return;
      const rev = Number(r.dibayar) || Number(r.total) || 0;
      m[k].revenue += rev;
      m[k].ppnOut += Number(r.pajak) || Math.round(rev * 0.11);
      m[k].pph21 += Math.round(rev * 0.4 * 0.05);
    });
    (exps ?? []).forEach((e: any) => {
      const k = monthKey(e.tanggal);
      if (!m[k]) return;
      const amt = Number(e.total ?? e.nominal ?? e.amount) || 0;
      m[k].expense += amt;
      m[k].ppnIn += Number(e.pajak) || 0;
    });

    const rows = Object.entries(m).map(([period, v]) => ({ period, ...v, ppnNet: v.ppnOut - v.ppnIn }));
    return { rows };
  });
