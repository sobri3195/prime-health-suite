import type { Invoice, MonthlyTrend, FinanceMaster, Payer, PaymentStatus } from "@/types/finance";

const doctors = ["dr. Rini, Sp.M", "dr. Bagas, Sp.M", "dr. Anisa, Sp.M", "dr. Hadi, Sp.M(K)", "dr. Tania, Sp.M", "dr. Yusuf, Sp.M"];
const services: { name: string; category: string; price: number }[] = [
  { name: "Konsultasi Sp.M", category: "Konsultasi", price: 175_000 },
  { name: "Refraksi", category: "Diagnostik", price: 85_000 },
  { name: "Tonometri", category: "Diagnostik", price: 75_000 },
  { name: "OCT", category: "Diagnostik", price: 450_000 },
  { name: "Laser YAG", category: "Tindakan", price: 1_800_000 },
  { name: "Phacoemulsifikasi", category: "Bedah", price: 12_500_000 },
  { name: "Injeksi Intravitreal", category: "Tindakan", price: 5_500_000 },
  { name: "Biometri", category: "Diagnostik", price: 250_000 },
];
const payers: Payer[] = ["Umum", "BPJS", "Asuransi", "Perusahaan"];

function pickStatus(i: number, daysOld: number): PaymentStatus {
  if (i % 17 === 0) return "cancelled";
  if (daysOld <= 7) return i % 3 === 0 ? "paid" : "unpaid";
  if (daysOld <= 30) return i % 4 === 0 ? "partial" : i % 3 === 0 ? "paid" : "unpaid";
  if (daysOld <= 60) return i % 2 === 0 ? "partial" : "unpaid";
  if (daysOld <= 90) return "overdue";
  return "overdue";
}

export const invoices: Invoice[] = Array.from({ length: 120 }).map((_, i) => {
  const daysOld = Math.floor((i * 1.7) % 110);
  const date = new Date(Date.now() - daysOld * 864e5);
  const due = new Date(date.getTime() + 30 * 864e5);
  const svc = services[i % services.length];
  const payer = payers[i % payers.length];
  const factor = payer === "BPJS" ? 0.85 : payer === "Asuransi" ? 1.1 : payer === "Perusahaan" ? 1.05 : 1;
  const total = Math.round(svc.price * factor * (1 + (i % 3) * 0.05));
  const status = pickStatus(i, daysOld);
  const paid = status === "paid" ? total
    : status === "partial" ? Math.round(total * 0.4)
    : 0;
  return {
    id: `INV-${String(20000 + i).padStart(6, "0")}`,
    invoice: `INV/2026/${String(date.getMonth() + 1).padStart(2, "0")}/${String(1000 + i).padStart(4, "0")}`,
    date: date.toISOString(),
    dueDate: due.toISOString(),
    patientCode: `RM-${String(128 + (i % 60)).padStart(6, "0")}`,
    payer, doctor: doctors[i % doctors.length],
    service: svc.name, category: svc.category,
    total, paid, status,
  };
});

const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const currentMonth = new Date().getMonth();
export const monthlyTrend: MonthlyTrend[] = months.slice(0, currentMonth + 1).map((m, i) => {
  const target = 2_000_000_000 + i * 80_000_000;
  const revenue = target * (0.88 + ((i * 7) % 25) / 100);
  const expense = revenue * (0.62 + ((i * 3) % 10) / 100);
  return { month: m, revenue: Math.round(revenue), expense: Math.round(expense), target };
});

export const expenseMTD = Math.round(
  (monthlyTrend[monthlyTrend.length - 1]?.expense ?? 1_100_000_000)
);

export const bankBalance = 3_120_700_000;

export const claimsPending = invoices.filter(
  (i) => i.payer === "BPJS" && (i.status === "unpaid" || i.status === "partial"),
).length;

export const anomalies = [
  { id: "ANM-001", text: "Invoice INV/2026/06/1042 dibatalkan setelah dibayar sebagian." },
  { id: "ANM-002", text: "Lonjakan pengeluaran kategori 'Alkes' 27% di atas rata-rata 3 bulan." },
  { id: "ANM-003", text: "3 invoice Asuransi nilai > Rp 10jt belum disubmit ke payer." },
];

export const master: FinanceMaster = {
  payers: payers.map((p, i) => ({ id: `PYR-${i + 1}`, name: p, type: p === "BPJS" || p === "Asuransi" ? "Klaim" : "Tunai/Invoice", status: "Aktif" })),
  vendors: [
    "PT Alkes Sentosa", "CV Optik Nusantara", "PT Farma Mata", "Cleaning Service Mitra", "PT Energi Listrik",
  ].map((n, i) => ({ id: `VND-${i + 1}`, name: n, type: i < 3 ? "Supplier" : "Service", status: "Aktif" })),
  coa: [
    { code: "1101", name: "Kas", type: "Asset" },
    { code: "1102", name: "Bank", type: "Asset" },
    { code: "1201", name: "Piutang Pasien", type: "Asset" },
    { code: "1202", name: "Piutang BPJS", type: "Asset" },
    { code: "2101", name: "Utang Vendor", type: "Liability" },
    { code: "3101", name: "Modal", type: "Equity" },
    { code: "4101", name: "Pendapatan Konsultasi", type: "Revenue" },
    { code: "4102", name: "Pendapatan Diagnostik", type: "Revenue" },
    { code: "4103", name: "Pendapatan Bedah", type: "Revenue" },
    { code: "4104", name: "Pendapatan Tindakan", type: "Revenue" },
    { code: "5101", name: "Beban Gaji", type: "Expense" },
    { code: "5102", name: "Beban Alkes", type: "Expense" },
    { code: "5103", name: "Beban Operasional", type: "Expense" },
  ],
  banks: [
    { id: "BNK-1", name: "BCA Klinik Utama", account: "•••• 4421", balance: 1_840_500_000 },
    { id: "BNK-2", name: "Mandiri Operasional", account: "•••• 8810", balance: 980_200_000 },
    { id: "BNK-3", name: "BNI Payroll", account: "•••• 2233", balance: 300_000_000 },
  ],
  costCategories: [
    { id: "CC-1", name: "Gaji & Tunjangan", account: "5101" },
    { id: "CC-2", name: "Alkes & Obat", account: "5102" },
    { id: "CC-3", name: "Listrik & Utilitas", account: "5103" },
    { id: "CC-4", name: "Sewa & Maintenance", account: "5103" },
  ],
  taxes: [
    { id: "TAX-1", name: "PPh Badan", rate: 0.22 },
    { id: "TAX-2", name: "PPN", rate: 0.11 },
    { id: "TAX-3", name: "PPh 21 Karyawan", rate: 0.05 },
  ],
  revenueTargets: monthlyTrend.map((m) => ({ period: m.month, amount: m.target })),
  serviceMapping: services.map((s) => ({
    service: s.name,
    account: s.category === "Konsultasi" ? "4101"
      : s.category === "Diagnostik" ? "4102"
      : s.category === "Bedah" ? "4103" : "4104",
  })),
};
