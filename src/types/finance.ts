export type Payer = "Umum" | "BPJS" | "Asuransi" | "Perusahaan";
export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  invoice: string;
  date: string;              // ISO
  dueDate: string;           // ISO
  patientCode: string;
  payer: Payer;
  doctor: string;
  service: string;
  category: string;          // "Konsultasi" | "Diagnostik" | ...
  total: number;
  paid: number;
  status: PaymentStatus;
}

export interface AgingBucket {
  bucket: "0-30" | "31-60" | "61-90" | ">90";
  amount: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expense: number;
  target: number;
}

export interface FinanceFilter {
  period: "today" | "mtd" | "ytd" | "all";
  payer: Payer | "all";
  doctor: string | "all";
  service: string | "all";
  status: PaymentStatus | "all";
}

export interface FinanceMaster {
  payers: { id: string; name: Payer; type: string; status: string }[];
  vendors: { id: string; name: string; type: string; status: string }[];
  coa: { code: string; name: string; type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense" }[];
  banks: { id: string; name: string; account: string; balance: number }[];
  costCategories: { id: string; name: string; account: string }[];
  taxes: { id: string; name: string; rate: number }[];
  revenueTargets: { period: string; amount: number }[];
  serviceMapping: { service: string; account: string }[];
}
