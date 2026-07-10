import { createServerFn } from "@tanstack/react-start";
import { requireFinView } from "./finance-guard";

async function sb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

type Aggregate = Record<string, { code: string; name: string; type: string; debit: number; kredit: number; cash_flow_section?: string | null }>;

async function aggregateLines(s: any, from?: string, to?: string): Promise<Aggregate> {
  const { data: lines, error } = await s.rpc("fin_report_aggregate_lines", {
    _from: from ?? null,
    _to: to ?? null,
  });
  if (error) throw error;
  const map: Aggregate = {};
  for (const l of lines ?? []) {
    const code = l.code as string;
    if (!map[code]) map[code] = { code, name: l.name ?? code, type: l.type ?? "Other", debit: 0, kredit: 0, cash_flow_section: l.cash_flow_section };
    map[code].debit += Number(l.debit) || 0;
    map[code].kredit += Number(l.kredit) || 0;
  }
  return map;
}

// ============ PROFIT & LOSS ============
export const getProfitLoss = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const agg = await aggregateLines(context.supabase, data.from, data.to);
    const revenue: any[] = [], expense: any[] = [];
    let totalRev = 0, totalExp = 0;
    for (const a of Object.values(agg)) {
      if (a.type === "Revenue") {
        const v = a.kredit - a.debit;
        if (v !== 0) { revenue.push({ ...a, amount: v }); totalRev += v; }
      } else if (a.type === "Expense") {
        const v = a.debit - a.kredit;
        if (v !== 0) { expense.push({ ...a, amount: v }); totalExp += v; }
      }
    }
    return { revenue, expense, totalRev, totalExp, profit: totalRev - totalExp };
  });

// ============ TRIAL BALANCE ============
export const getTrialBalance = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const agg = await aggregateLines(context.supabase, data.from, data.to);
    const rows = Object.values(agg)
      .filter((a) => a.debit !== 0 || a.kredit !== 0)
      .map((a) => {
        const net = a.debit - a.kredit;
        return {
          ...a,
          debit_bal: net > 0 ? net : 0,
          kredit_bal: net < 0 ? -net : 0,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
    const totalDebit = rows.reduce((a, r) => a + r.debit_bal, 0);
    const totalKredit = rows.reduce((a, r) => a + r.kredit_bal, 0);
    return { rows, totalDebit, totalKredit, balanced: Math.abs(totalDebit - totalKredit) < 1 };
  });

// ============ CASH FLOW (direct method, via journal entries that touch cash/bank) ============
export const getCashFlow = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string } = {}) => d)
  .handler(async ({ data }) => {
    const s = await sb();
    // Resolve cash/bank COA dynamically from chart of accounts (Asset + name like kas/bank).
    const { data: coa } = await s.from("fin_coa").select("code, name, type, cash_flow_section");
    const cashCodes = (coa ?? [])
      .filter((c: any) =>
        c.type === "Asset" &&
        (/^(kas|bank)/i.test(String(c.name ?? "")) ||
         String(c.cash_flow_section ?? "").toLowerCase() === "cash"),
      )
      .map((c: any) => c.code as string);
    if (!cashCodes.length) {
      return { sections: { operating: 0, investing: 0, financing: 0 }, details: [], opening: 0, closing: 0, net: 0, cashCodes: [] };
    }
    const coaMap = new Map((coa ?? []).map((c: any) => [c.code, c]));
    const cashSet = new Set(cashCodes);

    // Opening balance = net (debit - kredit) on cash accounts BEFORE `from`.
    let opening = 0;
    if (data.from) {
      const { data: pre } = await s
        .from("fin_journal_line")
        .select("coa_code, debit, kredit, fin_journal_entry!inner(status, tanggal)")
        .eq("fin_journal_entry.status", "posted")
        .lt("fin_journal_entry.tanggal", data.from)
        .in("coa_code", cashCodes)
        .limit(50000);
      opening = (pre ?? []).reduce((a: number, l: any) => a + (Number(l.debit) - Number(l.kredit)), 0);
    }

    // Entries in period that touch cash — fetch ids first via inner join, then full lines.
    let q = s.from("fin_journal_entry")
      .select("id, fin_journal_line!inner(coa_code)")
      .eq("status", "posted")
      .in("fin_journal_line.coa_code", cashCodes);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    const { data: cashEntries } = await q.limit(5000);
    const ids = (cashEntries ?? []).map((e: any) => e.id);
    const { data: entries } = ids.length
      ? await s.from("fin_journal_entry")
          .select("id, no_jurnal, tanggal, sumber, keterangan, fin_journal_line(coa_code, debit, kredit)")
          .in("id", ids)
      : { data: [] as any[] };

    const sections = { operating: 0, investing: 0, financing: 0 };
    const details: any[] = [];
    let net = 0;

    for (const e of entries ?? []) {
      const cashLines = (e.fin_journal_line ?? []).filter((l: any) => cashSet.has(l.coa_code));
      if (!cashLines.length) continue;
      const cashDelta = cashLines.reduce((a: number, l: any) => a + (Number(l.debit) - Number(l.kredit)), 0);
      const counter = (e.fin_journal_line ?? []).find((l: any) => !cashSet.has(l.coa_code));
      const rawSection = (counter ? (coaMap.get(counter.coa_code) as any)?.cash_flow_section : null) || "operating";
      const sec = (["operating","investing","financing"].includes(rawSection) ? rawSection : "operating") as "operating"|"investing"|"financing";
      sections[sec] += cashDelta;
      net += cashDelta;
      details.push({
        entry_id: e.id,
        tanggal: e.tanggal, no_jurnal: e.no_jurnal, sumber: e.sumber,
        keterangan: e.keterangan, section: sec, amount: cashDelta,
      });
    }
    const closing = opening + net;
    return { sections, details, opening, closing, net, cashCodes };
  });

// ============ BALANCE SHEET (snapshot) ============
export const getBalanceSheet = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { to?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const agg = await aggregateLines(context.supabase, undefined, data.to);
    const asset: any[] = [], liability: any[] = [], equity: any[] = [];
    let totalAsset = 0, totalLiab = 0, totalEquity = 0;
    for (const a of Object.values(agg)) {
      const bal = a.debit - a.kredit;
      if (a.type === "Asset" && bal !== 0) { asset.push({ ...a, amount: bal }); totalAsset += bal; }
      else if (a.type === "Liability" && bal !== 0) { liability.push({ ...a, amount: -bal }); totalLiab += -bal; }
      else if (a.type === "Equity" && bal !== 0) { equity.push({ ...a, amount: -bal }); totalEquity += -bal; }
    }
    return { asset, liability, equity, totalAsset, totalLiab, totalEquity };
  });

// ============ DRILL-DOWN: journal lines per COA / per entry ============
export const drillCoa = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { coa_code?: string; entry_id?: string; from?: string; to?: string } = {}) => d)
  .handler(async ({ data }) => {
    const s = await sb();
    let q = s
      .from("fin_journal_line")
      .select("id, coa_code, coa_nama, debit, kredit, keterangan, entry_id, fin_journal_entry!inner(id, no_jurnal, tanggal, sumber, ref_no, keterangan, status)")
      .eq("fin_journal_entry.status", "posted")
      .order("entry_id", { ascending: false })
      .limit(1000);
    if (data.coa_code) q = q.eq("coa_code", data.coa_code);
    if (data.entry_id) q = q.eq("entry_id", data.entry_id);
    if (data.from) q = q.gte("fin_journal_entry.tanggal", data.from);
    if (data.to) q = q.lte("fin_journal_entry.tanggal", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const lines = (rows ?? []).map((r: any) => ({
      id: r.id, coa_code: r.coa_code, coa_nama: r.coa_nama,
      debit: Number(r.debit) || 0, kredit: Number(r.kredit) || 0,
      keterangan: r.keterangan,
      entry_id: r.entry_id,
      no_jurnal: r.fin_journal_entry?.no_jurnal,
      tanggal: r.fin_journal_entry?.tanggal,
      sumber: r.fin_journal_entry?.sumber,
      ref_no: r.fin_journal_entry?.ref_no,
      entry_keterangan: r.fin_journal_entry?.keterangan,
    }));
    const totalDebit = lines.reduce((a: number, l: any) => a + l.debit, 0);
    const totalKredit = lines.reduce((a: number, l: any) => a + l.kredit, 0);
    return { lines, totalDebit, totalKredit };
  });

// ============ AUDIT LOG QUERY ============
export const listFinAudit = createServerFn({ method: "POST" })
  .middleware([requireFinView])
  .inputValidator((d: { from?: string; to?: string; entity?: string; action?: string; q?: string } = {}) => d)
  .handler(async ({ data }) => {
    const s = await sb();
    let q = s.from("fin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (data.from) q = q.gte("created_at", `${data.from}T00:00:00`);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59`);
    if (data.entity) q = q.eq("entity", data.entity);
    if (data.action) q = q.eq("action", data.action);
    if (data.q) q = q.or(`actor_email.ilike.%${data.q}%,entity_no.ilike.%${data.q}%,reason.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
