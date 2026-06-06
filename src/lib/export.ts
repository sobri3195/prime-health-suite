// CSV export helper. Always exports the FILTERED rows (not paginated slice).
// File name: prime-health_[module]_[period].csv

type Cell = string | number | boolean | null | undefined;

function escape(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV<T>(
  rows: T[],
  columns: { key: string; label: string; get: (r: T) => Cell }[],
  meta?: { module?: string; period?: string; filters?: Record<string, Cell>; exportedBy?: string },
): string {
  const head = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(c.get(r))).join(","));
  const lines: string[] = [];
  if (meta) {
    if (meta.module) lines.push(`# Module,${escape(meta.module)}`);
    if (meta.period) lines.push(`# Period,${escape(meta.period)}`);
    if (meta.exportedBy) lines.push(`# Exported by,${escape(meta.exportedBy)}`);
    lines.push(`# Generated at,${escape(new Date().toISOString())}`);
    lines.push(`# Total rows,${rows.length}`);
    if (meta.filters) {
      Object.entries(meta.filters).forEach(([k, v]) => lines.push(`# Filter ${escape(k)},${escape(v)}`));
    }
    lines.push("");
  }
  lines.push(head, ...body);
  return lines.join("\n");
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
  const safe = (s: string) => s.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return `prime-health_${safe(module)}_${safe(period)}.csv`;
}

