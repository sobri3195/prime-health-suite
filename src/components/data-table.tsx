import { useMemo, useState, type ReactNode } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

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

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableSkeleton rows={6} cols={columns.length + (rightActions ? 1 : 0)} />
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (rightActions ? 1 : 0)} className="p-0">
                  <EmptyState title={emptyTitle ?? (q ? "Tidak ada hasil" : "Belum ada data")} desc={emptyDesc ?? (q ? "Coba kata kunci lain." : "Data akan muncul di sini setelah tersedia.")} />
                </TableCell>
              </TableRow>
            ) : (
              paged.map((r, i) => (
                <TableRow key={rowKey ? rowKey(r, i) : i}>
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
              ))
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
