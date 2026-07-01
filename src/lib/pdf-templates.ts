// Reusable PDF document templates (payslip, voucher, bukti setor, kwitansi).
// jsPDF is dynamically imported inside each generator to keep the ~476 kB
// bundle out of the main chunk.
import type jsPDF from "jspdf";

const fmtIDR = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

const KLINIK_DEFAULT = "Klinik Utama Mata Prime";

function header(doc: jsPDF, title: string, subtitle?: string, klinik = KLINIK_DEFAULT) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(klinik, W / 2, 14, { align: "center" });
  doc.setFontSize(11);
  doc.text(title, W / 2, 20, { align: "center" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(subtitle, W / 2, 25, { align: "center" });
    doc.setTextColor(20);
  }
  doc.setLineWidth(0.3);
  doc.line(12, 28, W - 12, 28);
}

function footer(doc: jsPDF, leftLabel = "Dibuat oleh", rightLabel = "Disetujui oleh") {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const y = H - 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(leftLabel, 20, y);
  doc.text(rightLabel, W - 20, y, { align: "right" });
  doc.line(15, y + 18, 70, y + 18);
  doc.line(W - 70, y + 18, W - 15, y + 18);
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, W / 2, H - 8, { align: "center" });
}

function row(doc: jsPDF, y: number, label: string, value: string, align: "left" | "right" = "left") {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (align === "left") {
    doc.text(label, 15, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, 60, y);
  } else {
    doc.text(label, W - 90, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, W - 15, y, { align: "right" });
  }
  doc.setFont("helvetica", "normal");
}

// ============ PAYSLIP ============
export type Payslip = {
  nama: string;
  nip?: string | null;
  jabatan?: string | null;
  periode_label: string;     // e.g. "Juni 2026"
  gaji_pokok: number;
  tunjangan?: number;
  total_jam_lembur?: number;
  nominal_lembur: number;
  bonus?: number;
  potongan_pph?: number;
  potongan_bpjs?: number;
  potongan_lain?: number;
  potongan_total: number;
  take_home: number;
  catatan?: string | null;
  klinik?: string;
};

export async function generatePayslipPDF(p: Payslip): Promise<jsPDF> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();
  header(doc, "SLIP GAJI", `Periode ${p.periode_label}`, p.klinik);

  let y = 36;
  row(doc, y, "Nama", p.nama); y += 5;
  if (p.nip) { row(doc, y, "NIP", p.nip); y += 5; }
  if (p.jabatan) { row(doc, y, "Jabatan", p.jabatan); y += 5; }
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(12, y, W - 12, y); y += 6;

  // Earnings
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Pendapatan", 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const earn: [string, number][] = [
    ["Gaji Pokok", p.gaji_pokok],
    ["Tunjangan", p.tunjangan ?? 0],
    [`Lembur${p.total_jam_lembur ? ` (${p.total_jam_lembur} jam)` : ""}`, p.nominal_lembur],
    ["Bonus", p.bonus ?? 0],
  ];
  let totalEarn = 0;
  for (const [lbl, val] of earn) {
    if (val <= 0) continue;
    doc.text(lbl, 18, y);
    doc.text(fmtIDR(val), W - 15, y, { align: "right" });
    totalEarn += val;
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Total Pendapatan", 18, y);
  doc.text(fmtIDR(totalEarn), W - 15, y, { align: "right" });
  y += 7;

  // Deductions
  doc.setFontSize(10);
  doc.text("Potongan", 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const ded: [string, number][] = [
    ["PPh 21", p.potongan_pph ?? 0],
    ["BPJS", p.potongan_bpjs ?? 0],
    ["Potongan Lain", p.potongan_lain ?? 0],
  ];
  let totalDed = 0;
  for (const [lbl, val] of ded) {
    if (val <= 0) continue;
    doc.text(lbl, 18, y);
    doc.text(fmtIDR(val), W - 15, y, { align: "right" });
    totalDed += val;
    y += 5;
  }
  if (totalDed === 0 && (p.potongan_total ?? 0) > 0) {
    doc.text("Potongan", 18, y);
    doc.text(fmtIDR(p.potongan_total), W - 15, y, { align: "right" });
    totalDed = p.potongan_total;
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.text("Total Potongan", 18, y);
  doc.text(fmtIDR(totalDed), W - 15, y, { align: "right" });
  y += 8;

  // Take home
  doc.setLineWidth(0.4);
  doc.line(12, y, W - 12, y); y += 6;
  doc.setFontSize(11);
  doc.text("Take Home Pay", 15, y);
  doc.text(fmtIDR(p.take_home), W - 15, y, { align: "right" });

  if (p.catatan) {
    y += 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Catatan: ${p.catatan}`, 15, y);
    doc.setTextColor(20);
  }

  footer(doc, "HRD", "Karyawan");
  return doc;
}

// ============ VOUCHER (BKK / BBK / Kas Kecil / Honor / Bukti Setor) ============
export type VoucherDoc = {
  jenis: "BKK" | "BBK" | "KAS KECIL" | "HONOR" | "SETOR BANK" | "KWITANSI";
  no_voucher: string;
  tanggal: string;
  pihak_label: string;      // "Diterima dari" / "Dibayarkan kepada"
  pihak_nama: string;
  keterangan: string;
  metode?: string | null;
  bank?: string | null;
  ref_bank?: string | null;
  items: { label: string; nominal: number }[];
  total: number;
  terbilang?: string;
  klinik?: string;
};

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
export function terbilang(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 12) return SATUAN[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + terbilang(n % 10) : "");
  if (n < 200) return "seratus" + (n - 100 ? " " + terbilang(n - 100) : "");
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 2000) return "seribu" + (n - 1000 ? " " + terbilang(n - 1000) : "");
  if (n < 1_000_000) return terbilang(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
  if (n < 1_000_000_000) return terbilang(Math.floor(n / 1_000_000)) + " juta" + (n % 1_000_000 ? " " + terbilang(n % 1_000_000) : "");
  return terbilang(Math.floor(n / 1_000_000_000)) + " miliar" + (n % 1_000_000_000 ? " " + terbilang(n % 1_000_000_000) : "");
}

export function generateVoucherPDF(v: VoucherDoc): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  header(doc, `VOUCHER ${v.jenis}`, `No. ${v.no_voucher}  •  ${fmtDate(v.tanggal)}`, v.klinik);

  let y = 36;
  row(doc, y, v.pihak_label, v.pihak_nama); y += 6;
  if (v.metode || v.bank) {
    row(doc, y, "Metode", [v.metode, v.bank, v.ref_bank].filter(Boolean).join(" • "));
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Rincian", 15, y);
  doc.text("Nominal", W - 15, y, { align: "right" });
  y += 1;
  doc.line(15, y, W - 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  v.items.forEach((it) => {
    const lines = doc.splitTextToSize(it.label, W - 55);
    doc.text(lines, 15, y);
    doc.text(fmtIDR(it.nominal), W - 15, y, { align: "right" });
    y += Math.max(5, lines.length * 4.5);
  });
  doc.setLineWidth(0.3);
  doc.line(15, y, W - 15, y); y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total", 15, y);
  doc.text(fmtIDR(v.total), W - 15, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80);
  const tb = (v.terbilang ?? terbilang(v.total) + " rupiah").replace(/\b\w/g, (c) => c.toUpperCase());
  doc.text(`Terbilang: # ${tb} #`, 15, y);
  doc.setTextColor(20);
  y += 6;

  if (v.keterangan) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(`Keterangan: ${v.keterangan}`, W - 30);
    doc.text(lines, 15, y);
  }

  footer(
    doc,
    v.jenis === "BBK" ? "Penyetor" : "Penerima",
    v.jenis === "BBK" ? "Kasir" : "Disetujui",
  );
  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
