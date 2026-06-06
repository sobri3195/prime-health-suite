import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "info" | "muted" | "danger";
  children: ReactNode;
}) {
  const map = {
    ok: "bg-emerald-accent/15 text-emerald-accent",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    info: "bg-cyan-accent/15 text-cyan-accent",
    muted: "bg-muted text-muted-foreground",
    danger: "bg-destructive/15 text-destructive",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function useFiltered<T>(items: T[], query: string, fields: (keyof T)[]) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      fields.some((f) => String(it[f] ?? "").toLowerCase().includes(q)),
    );
  }, [items, query, fields]);
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(items.length / pageSize));
  const cur = Math.min(page, total);
  const slice = items.slice((cur - 1) * pageSize, cur * pageSize);
  return { page: cur, total, slice, setPage };
}

export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 px-4 py-3 text-xs">
      <span className="text-muted-foreground">Halaman {page} dari {total}</span>
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded border border-border px-2 py-1 disabled:opacity-40"
      >
        Prev
      </button>
      <button
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        className="rounded border border-border px-2 py-1 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
