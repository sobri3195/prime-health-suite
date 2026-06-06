// Shared mock sources for Prime Simon Finance.
// Important: Journals, ledger, and reports must read from these same arrays
// so dashboard numbers stay consistent across pages for the same filter.

import { master, invoices } from "./financeData";

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "paid" | "void";

export interface ExpenseSource {
  id: string;
  number: string;
  date: string;
  vendor: string;
  category: string;
  account: string;        // expense COA code
  amount: number;
  tax: number;
  bank: string;
  status: ExpenseStatus;
}

const VENDORS = master.vendors.map((v) => v.name);
const CATS = master.costCategories;
const BANKS = master.banks.map((b) => `${b.name} ${b.account}`);

export const expenseSources: ExpenseSource[] = Array.from({ length: 40 }).map((_, i) => {
  const cat = CATS[i % CATS.length];
  const amount = Math.round((1 + (i % 11)) * 1_250_000);
  const status: ExpenseStatus = (["paid","paid","paid","approved","submitted","draft","rejected","paid"] as ExpenseStatus[])[i % 8];
  const d = new Date();
  d.setDate(d.getDate() - i * 2);
  return {
    id: `EXP-${String(3001 + i).padStart(5, "0")}`,
    number: `EXP/2026/${String(d.getMonth() + 1).padStart(2, "0")}/${String(500 + i).padStart(4, "0")}`,
    date: d.toISOString(),
    vendor: VENDORS[i % VENDORS.length],
    category: cat.name,
    account: cat.account,
    amount,
    tax: Math.round(amount * 0.11),
    bank: BANKS[i % BANKS.length],
    status,
  };
});

export interface BankMutation {
  id: string;
  bankId: string;
  date: string;
  description: string;
  amount: number;     // signed: + masuk, - keluar
  matchedRef?: string; // INV / EXP id when reconciled
  matched: boolean;
}

const paidInvoices = invoices.filter((i) => i.status === "paid").slice(0, 30);
const paidExpenses = expenseSources.filter((e) => e.status === "paid").slice(0, 18);

export const bankMutations: BankMutation[] = [
  ...paidInvoices.map<BankMutation>((i, idx) => ({
    id: `MUT-IN-${idx}`,
    bankId: master.banks[idx % master.banks.length].id,
    date: i.date,
    description: `Settlement ${i.invoice}`,
    amount: i.paid,
    matchedRef: i.id,
    matched: idx % 5 !== 0,
  })),
  ...paidExpenses.map<BankMutation>((e, idx) => ({
    id: `MUT-OUT-${idx}`,
    bankId: master.banks[idx % master.banks.length].id,
    date: e.date,
    description: `Bayar ${e.vendor} (${e.number})`,
    amount: -e.amount,
    matchedRef: e.id,
    matched: idx % 4 !== 0,
  })),
  // Unidentified mutations
  ...Array.from({ length: 6 }).map<BankMutation>((_, idx) => ({
    id: `MUT-UNK-${idx}`,
    bankId: master.banks[idx % master.banks.length].id,
    date: new Date(Date.now() - idx * 86400000 * 3).toISOString(),
    description: idx % 2 === 0 ? "Setoran tunai kasir" : "Biaya admin bank",
    amount: idx % 2 === 0 ? 4_500_000 : -75_000,
    matched: false,
  })),
];

export const openingBankBalance = master.banks.reduce((a, b) => a + b.balance, 0) -
  bankMutations.reduce((a, m) => a + m.amount, 0);
