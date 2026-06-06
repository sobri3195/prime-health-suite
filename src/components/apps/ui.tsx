import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/* ----- Unified buttons (use across patient-facing apps) ----- */

export function GoldButton({
  children,
  onClick,
  full = true,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  full?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full" : ""} rounded-xl bg-[#6b5a16] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#574811] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-4 py-2 text-sm font-medium text-[#5a4a14] transition hover:bg-[#f6ecc8] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/* ----- Skeletons for loading states ----- */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/70 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonList({
  rows = 3,
  className = "",
}: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <Skeleton className="mb-3 h-4 w-2/3" />
          <Skeleton className="mb-2 h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}



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
