// Auto-generates journal entries from finance source data.
// Sources: invoices (paid / outstanding), expenses (paid), bank mutations,
// tax accruals, refunds. All reports read from the same generator so
// dashboard numbers match.

import { invoices } from "@/data/financeData";
import { expenseSources, bankMutations } from "@/data/financeSources";
import { master } from "@/data/financeData";

export interface JournalLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface Journal {
  id: string;
  number: string;
  date: string;
  source: "invoice" | "payment" | "expense" | "refund" | "tax" | "bank";
  sourceId: string;
  description: string;
  status: "draft" | "posted" | "reversed";
  lines: JournalLine[];
}

const accountName = (code: string) =>
  master.coa.find((c) => c.code === code)?.name ?? code;

function svcAccount(category: string) {
  return master.serviceMapping.find((m) => m.account)?.account ??
    (category === "Konsultasi" ? "4101" : category === "Diagnostik" ? "4102" : category === "Bedah" ? "4103" : "4104");
}

let seq = 50000;
const nextNo = () => `JRN-${String(++seq).padStart(6, "0")}`;

function buildJournals(): Journal[] {
  seq = 50000;
  const out: Journal[] = [];

  invoices.forEach((inv) => {
    const revAcct = svcAccount(inv.category);
    if (inv.status === "paid" || inv.status === "partial") {
      // payment received → Bank Dr / Piutang Kr (or direct revenue)
      const arAcct = inv.payer === "BPJS" ? "1202" : "1201";
      // accrual when issued
      out.push({
        id: `J-INV-${inv.id}`, number: nextNo(), date: inv.date,
        source: "invoice", sourceId: inv.id,
        description: `Invoice ${inv.invoice} (${inv.payer})`, status: "posted",
        lines: [
          { account: arAcct, accountName: accountName(arAcct), debit: inv.total, credit: 0 },
          { account: revAcct, accountName: accountName(revAcct), debit: 0, credit: inv.total },
        ],
      });
      if (inv.paid > 0) {
        out.push({
          id: `J-PAY-${inv.id}`, number: nextNo(), date: inv.date,
          source: "payment", sourceId: inv.id,
          description: `Pembayaran ${inv.invoice}`, status: "posted",
          lines: [
            { account: "1102", accountName: accountName("1102"), debit: inv.paid, credit: 0 },
            { account: arAcct, accountName: accountName(arAcct), debit: 0, credit: inv.paid },
          ],
        });
      }
    } else if (inv.status === "unpaid" || inv.status === "overdue") {
      const arAcct = inv.payer === "BPJS" ? "1202" : "1201";
      out.push({
        id: `J-INV-${inv.id}`, number: nextNo(), date: inv.date,
        source: "invoice", sourceId: inv.id,
        description: `Invoice ${inv.invoice} (outstanding)`, status: "posted",
        lines: [
          { account: arAcct, accountName: accountName(arAcct), debit: inv.total, credit: 0 },
          { account: revAcct, accountName: accountName(revAcct), debit: 0, credit: inv.total },
        ],
      });
    } else if (inv.status === "cancelled" && inv.paid > 0) {
      out.push({
        id: `J-REF-${inv.id}`, number: nextNo(), date: inv.date,
        source: "refund", sourceId: inv.id,
        description: `Refund ${inv.invoice}`, status: "posted",
        lines: [
          { account: revAcct, accountName: accountName(revAcct), debit: inv.paid, credit: 0 },
          { account: "1102", accountName: accountName("1102"), debit: 0, credit: inv.paid },
        ],
      });
    }
  });

  expenseSources.forEach((e) => {
    if (e.status === "paid") {
      out.push({
        id: `J-EXP-${e.id}`, number: nextNo(), date: e.date,
        source: "expense", sourceId: e.id,
        description: `Pengeluaran ${e.number} - ${e.vendor}`, status: "posted",
        lines: [
          { account: e.account, accountName: accountName(e.account), debit: e.amount, credit: 0 },
          { account: "1102", accountName: accountName("1102"), debit: 0, credit: e.amount },
        ],
      });
      if (e.tax > 0) {
        out.push({
          id: `J-TAX-${e.id}`, number: nextNo(), date: e.date,
          source: "tax", sourceId: e.id,
          description: `PPN Masukan ${e.number}`, status: "posted",
          lines: [
            { account: "5103", accountName: accountName("5103"), debit: e.tax, credit: 0 },
            { account: "2101", accountName: accountName("2101"), debit: 0, credit: e.tax },
          ],
        });
      }
    }
  });

  // Unidentified bank mutations
  bankMutations.filter((m) => !m.matchedRef).forEach((m) => {
    const isIn = m.amount > 0;
    out.push({
      id: `J-BNK-${m.id}`, number: nextNo(), date: m.date,
      source: "bank", sourceId: m.id,
      description: m.description, status: "posted",
      lines: isIn
        ? [
            { account: "1102", accountName: accountName("1102"), debit: m.amount, credit: 0 },
            { account: "4101", accountName: accountName("4101"), debit: 0, credit: m.amount },
          ]
        : [
            { account: "5103", accountName: accountName("5103"), debit: -m.amount, credit: 0 },
            { account: "1102", accountName: accountName("1102"), debit: 0, credit: -m.amount },
          ],
    });
  });

  return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export const journals: Journal[] = buildJournals();

export interface LedgerRow {
  account: string;
  accountName: string;
  type: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
}

export function ledger(period?: { month?: number; year?: number }): LedgerRow[] {
  const map = new Map<string, LedgerRow>();
  master.coa.forEach((c) => {
    map.set(c.code, {
      account: c.code, accountName: c.name, type: c.type,
      opening: 0, debit: 0, credit: 0, closing: 0,
    });
  });
  journals.forEach((j) => {
    if (period) {
      const d = new Date(j.date);
      if (period.year !== undefined && d.getFullYear() !== period.year) return;
      if (period.month !== undefined && d.getMonth() !== period.month) return;
    }
    j.lines.forEach((l) => {
      const r = map.get(l.account);
      if (!r) return;
      r.debit += l.debit;
      r.credit += l.credit;
    });
  });
  map.forEach((r) => {
    // normal balance side
    const sign = r.type === "Asset" || r.type === "Expense" ? 1 : -1;
    r.closing = r.opening + sign * (r.debit - r.credit);
  });
  return Array.from(map.values());
}

export interface IncomeStatement {
  revenue: number;
  cogs: number;
  opex: number;
  ebitda: number;
  tax: number;
  netProfit: number;
  rows: LedgerRow[];
}

export function incomeStatement(period?: { month?: number; year?: number }, taxRate = 0.22): IncomeStatement {
  const rows = ledger(period);
  const revenue = rows.filter((r) => r.type === "Revenue").reduce((a, r) => a + (r.credit - r.debit), 0);
  const expense = rows.filter((r) => r.type === "Expense").reduce((a, r) => a + (r.debit - r.credit), 0);
  const ebitdaV = revenue - expense;
  const tax = Math.max(0, ebitdaV) * taxRate;
  return {
    revenue, cogs: 0, opex: expense,
    ebitda: ebitdaV, tax, netProfit: ebitdaV - tax,
    rows,
  };
}

export function trialBalance(period?: { month?: number; year?: number }) {
  return ledger(period).map((r) => ({
    account: r.account,
    accountName: r.accountName,
    debit: r.debit,
    credit: r.credit,
  }));
}

export function cashFlow(period?: { month?: number; year?: number }) {
  let inflow = 0, outflow = 0;
  journals.forEach((j) => {
    if (period) {
      const d = new Date(j.date);
      if (period.year !== undefined && d.getFullYear() !== period.year) return;
      if (period.month !== undefined && d.getMonth() !== period.month) return;
    }
    j.lines.forEach((l) => {
      if (l.account === "1102" || l.account === "1101") {
        inflow += l.debit;
        outflow += l.credit;
      }
    });
  });
  return { inflow, outflow, net: inflow - outflow };
}

export function periodFilter(month: number | "all", year: number) {
  const p: { month?: number; year?: number } = { year };
  if (month !== "all") p.month = month;
  return p;
}
