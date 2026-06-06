// CSV + PDF exporters with consistent column schemas and date-range header.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
