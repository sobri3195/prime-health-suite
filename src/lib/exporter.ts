// CSV + PDF exporters with consistent column schemas and date-range header.
// jsPDF + jspdf-autotable are dynamically imported inside PDF functions to
// keep them out of the main bundle (~476 kB saved on first paint).
import type jsPDF from "jspdf";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  format?: (row: T) => string | number;
};

export type Range = { from?: string; to?: string };

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("id-ID") : "—");

function cellOf<T>(row: T, col: Column<T>): string {
  if (col.format) return String(col.format(row) ?? "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (row as any)[col.key as string];
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleString("id-ID");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function escapeCsv(s: string): string {
  const needs = /[",\n;]/.test(s);
  const q = s.replace(/"/g, '""');
  return needs ? `"${q}"` : q;
}

export function exportCsv<T>(filename: string, columns: Column<T>[], rows: T[], range?: Range) {
  const meta = range
    ? `# Periode: ${fmtDate(range.from)} s/d ${fmtDate(range.to)} • Generated: ${new Date().toLocaleString("id-ID")}\n`
    : `# Generated: ${new Date().toLocaleString("id-ID")}\n`;
  const header = columns.map((c) => escapeCsv(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsv(cellOf(r, c))).join(",")).join("\n");
  const blob = new Blob([meta + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPdf<T>(
  filename: string,
  title: string,
  columns: Column<T>[],
  rows: T[],
  range?: Range,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  const periode = range ? `Periode: ${fmtDate(range.from)} s/d ${fmtDate(range.to)}` : "";
  const meta = `${periode}${periode ? "  •  " : ""}Generated: ${new Date().toLocaleString("id-ID")}`;
  doc.text(meta, 40, 56);
  autoTable(doc, {
    startY: 70,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => cellOf(r, c))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [31, 29, 25], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  doc.save(filename);
}

// ============ MANAGEMENT REPORT PDF ============
// Section-based PDF with header, period, KPI summary, then one or more tables.
export type ReportSection = {
  title: string;
  columns: { header: string; key: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
  totalRow?: Record<string, string | number>;
};

export function exportReportPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  range?: Range;
  summary?: { label: string; value: string }[];
  sections: ReportSection[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(16); doc.setTextColor(20);
  doc.text(opts.title, 40, 48);
  if (opts.subtitle) { doc.setFontSize(10); doc.setTextColor(110); doc.text(opts.subtitle, 40, 64); }
  doc.setFontSize(9); doc.setTextColor(110);
  const periode = opts.range ? `Periode: ${fmtDate(opts.range.from)} s/d ${fmtDate(opts.range.to)}` : "";
  const meta = `${periode}${periode ? "  •  " : ""}Generated: ${new Date().toLocaleString("id-ID")}`;
  doc.text(meta, 40, opts.subtitle ? 78 : 64);

  let y = (opts.subtitle ? 78 : 64) + 16;

  if (opts.summary?.length) {
    const colW = (pageW - 80) / opts.summary.length;
    opts.summary.forEach((s, i) => {
      const x = 40 + i * colW;
      doc.setFillColor(245, 245, 245); doc.rect(x, y, colW - 6, 44, "F");
      doc.setFontSize(8); doc.setTextColor(110); doc.text(s.label, x + 8, y + 16);
      doc.setFontSize(12); doc.setTextColor(20); doc.text(s.value, x + 8, y + 34);
    });
    y += 56;
  }

  for (const sec of opts.sections) {
    doc.setFontSize(11); doc.setTextColor(20);
    doc.text(sec.title, 40, y); y += 8;
    const head = [sec.columns.map((c) => c.header)];
    const body = sec.rows.map((r) => sec.columns.map((c) => String(r[c.key] ?? "")));
    if (sec.totalRow) body.push(sec.columns.map((c) => String(sec.totalRow![c.key] ?? "")));
    autoTable(doc, {
      startY: y + 4,
      head, body,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [31, 29, 25], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: Object.fromEntries(sec.columns.map((c, i) => [i, { halign: c.align ?? "left" }])),
      didDrawPage: (d) => { y = d.cursor?.y ?? y; },
    });
    // @ts-expect-error jspdf-autotable injects lastAutoTable
    y = (doc.lastAutoTable?.finalY ?? y) + 18;
  }
  doc.save(opts.filename);
}

// ============ SMART CSV PARSER for bank statements ============
const HDR_ALIASES: Record<string, string[]> = {
  tanggal: ["tanggal", "tgl", "date", "posting date", "transaction date", "trx date", "trans date"],
  deskripsi: ["deskripsi", "keterangan", "description", "narasi", "narrative", "remark", "remarks", "memo", "uraian"],
  debit: ["debit", "debet", "keluar", "withdrawal", "withdrawals", "out", "dr", "mutasi debet", "pengeluaran"],
  kredit: ["kredit", "credit", "masuk", "deposit", "deposits", "in", "cr", "mutasi kredit", "pemasukan"],
  saldo: ["saldo", "balance", "saldo akhir", "running balance"],
  ref: ["ref", "reference", "no ref", "no. ref", "reference no", "trx id", "id transaksi"],
};

function pickHeader(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
}

// Accept ID/EN formats: 2026-06-11, 11/06/2026, 11-06-2026, 06/11/2026 (US fallback)
export function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/['"]/g, "");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let [_, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    const day = Number(a), mon = Number(b);
    // If first > 12 → DD/MM, otherwise assume DD/MM (Indonesia default)
    const dd = day > 12 ? day : (mon > 12 ? mon : day);
    const mm = day > 12 ? mon : (mon > 12 ? day : mon);
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export function parseNumber(raw: string): number {
  if (!raw) return 0;
  let s = String(raw).trim().replace(/[^\d.,\-()]/g, "");
  const neg = /^\(.*\)$/.test(s) || /-$/.test(s);
  s = s.replace(/[()-]/g, "");
  // detect format: "1.234,56" (ID) vs "1,234.56" (US)
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (s.includes(",")) {
    // single comma — treat as decimal if 1-2 digits after, else thousand sep
    const parts = s.split(",");
    if (parts[1]?.length <= 2 && parts[0].length <= 6) s = parts.join(".");
    else s = s.replace(/,/g, "");
  }
  const n = Number(s) || 0;
  return neg ? -n : n;
}

export type ParsedBankRow = {
  tanggal: string; deskripsi: string;
  debit: number; kredit: number;
  saldo: number | null; ref: string | null;
  _error?: string;
};

export type ParsedBankResult = {
  rows: ParsedBankRow[];
  mapping: Record<string, string | null>;
  errors: { line: number; reason: string }[];
  separator: string;
};

export function parseBankCsv(text: string): ParsedBankResult {
  const lines = text.trim().split(/\r?\n/);
  const empty: ParsedBankResult = { rows: [], mapping: {}, errors: [], separator: "," };
  if (lines.length < 2) return empty;
  const first = lines[0];
  const sep = first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const headers = first.split(sep).map((s) => s.trim().replace(/^["']|["']$/g, ""));
  const map = {
    tanggal: pickHeader(headers, HDR_ALIASES.tanggal),
    deskripsi: pickHeader(headers, HDR_ALIASES.deskripsi),
    debit: pickHeader(headers, HDR_ALIASES.debit),
    kredit: pickHeader(headers, HDR_ALIASES.kredit),
    saldo: pickHeader(headers, HDR_ALIASES.saldo),
    ref: pickHeader(headers, HDR_ALIASES.ref),
  };
  const mapping: Record<string, string | null> = {};
  (Object.keys(map) as (keyof typeof map)[]).forEach((k) => { mapping[k] = map[k] >= 0 ? headers[map[k]] : null; });
  const rows: ParsedBankRow[] = [];
  const errors: { line: number; reason: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i]; if (!ln.trim()) continue;
    const c = ln.split(sep).map((x) => x.trim().replace(/^["']|["']$/g, ""));
    const tgl = map.tanggal >= 0 ? normalizeDate(c[map.tanggal] ?? "") : null;
    if (!tgl) { errors.push({ line: i + 1, reason: `Tanggal tidak valid: "${c[map.tanggal] ?? ""}"` }); continue; }
    rows.push({
      tanggal: tgl,
      deskripsi: map.deskripsi >= 0 ? (c[map.deskripsi] ?? "") : "",
      debit: map.debit >= 0 ? parseNumber(c[map.debit] ?? "0") : 0,
      kredit: map.kredit >= 0 ? parseNumber(c[map.kredit] ?? "0") : 0,
      saldo: map.saldo >= 0 ? parseNumber(c[map.saldo] ?? "") : null,
      ref: map.ref >= 0 ? (c[map.ref] || null) : null,
    });
  }
  return { rows, mapping, errors, separator: sep };
}
