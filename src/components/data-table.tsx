import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableSkeleton } from "@/components/table-skeleton";
import { EmptyState } from "@/components/empty-state";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** how to render the cell; receives row */
  cell?: (row: T) => ReactNode;
  /** value used for search/sort/export; defaults to row[key] */
  value?: (row: T) => string | number | null | undefined;
  className?: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  rowKey?: (row: T, idx: number) => string | number;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDesc?: string;
  actions?: ReactNode; // shown next to search bar
  rightActions?: (row: T) => ReactNode; // per-row trailing actions cell
  toolbar?: ReactNode; // shown above the table (filters)
  initialSort?: { key: string; dir: "asc" | "desc" };
  /** Enable row multi-select checkboxes. When set, `bulkActions` renders in the selection toolbar. */
  selectable?: boolean;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** When set, sync search/sort/page to URL query string using this namespace (e.g. "coa" → ?coa_q=&coa_p=&coa_s=). */
  urlKey?: string;
}

function fmtValue<T>(col: DataTableColumn<T>, row: T): string | number | null | undefined {
  if (col.value) return col.value(row);
  return (row as Record<string, unknown>)[col.key] as string | number | null | undefined;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  rowKey,
  searchable = true,
  searchPlaceholder = "Cari…",
  pageSize = 25,
  emptyTitle,
  emptyDesc,
  actions,
  rightActions,
  toolbar,
  initialSort,
  selectable,
  bulkActions,
  urlKey,
}: DataTableProps<T>) {
  const readUrl = () => {
    if (!urlKey || typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get(`${urlKey}_s`);
    const [sk, sd] = s ? s.split(":") : [];
    return {
      q: sp.get(`${urlKey}_q`) ?? "",
      page: Math.max(1, Number(sp.get(`${urlKey}_p`) ?? 1) || 1),
      sort: sk && (sd === "asc" || sd === "desc") ? { key: sk, dir: sd as "asc" | "desc" } : null,
    };
  };
  const initial = readUrl();
  const [q, setQ] = useState(initial?.q ?? "");
  const [page, setPage] = useState(initial?.page ?? 1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initial?.sort ?? initialSort ?? null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (!urlKey || typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const set = (k: string, v: string) => { if (v) sp.set(k, v); else sp.delete(k); };
    set(`${urlKey}_q`, q);
    set(`${urlKey}_p`, page > 1 ? String(page) : "");
    set(`${urlKey}_s`, sort ? `${sort.key}:${sort.dir}` : "");
    const qs = sp.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", url);
  }, [urlKey, q, page, sort]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      columns.some((c) => String(fmtValue(c, r) ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, q, columns]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = fmtValue(col, a);
      const bv = fmtValue(col, b);
      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "id") * dir;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const keyOf = (r: T, i: number): string | number => (rowKey ? rowKey(r, i) : i);
  const pageKeys = paged.map((r, i) => keyOf(r, i));
  const allChecked = selectable && pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const someChecked = selectable && pageKeys.some((k) => selected.has(k)) && !allChecked;
  const selectedRows = useMemo(
    () => sorted.filter((r, i) => selected.has(keyOf(r, i))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, selected],
  );
  const clearSelection = () => setSelected(new Set());
  useEffect(() => { setSelected(new Set()); }, [q]);

  const colSpan = columns.length + (rightActions ? 1 : 0) + (selectable ? 1 : 0);

  return (
    <div className="space-y-3">
      {(searchable || actions || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {toolbar}
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}

      {selectable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} dipilih</span>
          <Button size="sm" variant="ghost" className="h-7" onClick={clearSelection}>Bersihkan</Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {bulkActions?.(selectedRows, clearSelection)}
          </div>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-[inset_0_-1px_0_hsl(var(--border))]">
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (v) pageKeys.forEach((k) => next.add(k));
                        else pageKeys.forEach((k) => next.delete(k));
                        return next;
                      });
                    }}
                    aria-label="Pilih semua baris di halaman ini"
                  />
                </TableHead>
              )}
              {columns.map((c) => {
                const isSorted = sort?.key === c.key;
                const Icon = !isSorted ? ArrowUpDown : sort?.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <TableHead
                    key={c.key}
                    aria-sort={isSorted ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`${c.className ?? ""} ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        {c.header}
                        <Icon className="h-3 w-3 opacity-60" aria-hidden="true" />
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                );
              })}
              {rightActions && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={6} cols={colSpan} />
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="p-0">
                  <EmptyState title={emptyTitle ?? (q ? "Tidak ada hasil" : "Belum ada data")} desc={emptyDesc ?? (q ? "Coba kata kunci lain." : "Data akan muncul di sini setelah tersedia.")} />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((r, i) => {
                const k = keyOf(r, i);
                const isSel = selectable && selected.has(k);
                return (
                <TableRow key={k} data-state={isSel ? "selected" : undefined}>
                  {selectable && (
                    <TableCell className="w-10">
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={(v) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(k); else next.delete(k);
                            return next;
                          });
                        }}
                        aria-label="Pilih baris"
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={`text-sm ${c.className ?? ""} ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                    >
                      {c.cell ? c.cell(r) : (fmtValue(c, r) as ReactNode) ?? "—"}
                    </TableCell>
                  ))}
                  {rightActions && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">{rightActions(r)}</div>
                    </TableCell>
                  )}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          {loading
            ? "Memuat…"
            : `Menampilkan ${paged.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–${(safePage - 1) * pageSize + paged.length} dari ${sorted.length}`}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Halaman sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2" aria-live="polite">Hal. {safePage} / {totalPages}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} aria-label="Halaman berikutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
