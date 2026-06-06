// CSV export helper. Always exports the FILTERED rows (not paginated slice).
// File name: prime-simon_[module]_[period].csv

type Cell = string | number | boolean | null | undefined;

function escape(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV<T>(rows: T[], columns: { key: string; label: string; get: (r: T) => Cell }[]): string {
  const head = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(c.get(r))).join(","));
  return [head, ...body].join("\n");
}

export function downloadCSV(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportFileName(module: string, period: string) {
  return `prime-simon_${module}_${period}.csv`;
}
