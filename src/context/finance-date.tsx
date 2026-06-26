import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export type DatePreset = "today" | "7d" | "mtd" | "qtd" | "ytd" | "custom";

export type FinanceDateRange = {
  from: string; // YYYY-MM-DD
  to: string;
  preset: DatePreset;
  label: string;
};

type Ctx = FinanceDateRange & {
  setRange: (r: { from: string; to: string; preset?: DatePreset }) => void;
  setPreset: (p: Exclude<DatePreset, "custom">) => void;
  reset: () => void;
};

const FinanceDateCtx = createContext<Ctx | null>(null);
const LS_KEY = "finance:dateRange:v1";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rangeForPreset(p: Exclude<DatePreset, "custom">): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "today") return { from: iso(today), to: iso(today) };
  if (p === "7d") {
    const f = new Date(today); f.setDate(f.getDate() - 6);
    return { from: iso(f), to: iso(today) };
  }
  if (p === "mtd") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(today) };
  if (p === "qtd") {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    return { from: iso(new Date(now.getFullYear(), qStart, 1)), to: iso(today) };
  }
  // ytd
  return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(today) };
}

const PRESET_LABEL: Record<DatePreset, string> = {
  today: "Hari ini",
  "7d": "7 hari terakhir",
  mtd: "Bulan ini (MTD)",
  qtd: "Kuartal ini (QTD)",
  ytd: "Tahun ini (YTD)",
  custom: "Custom",
};

function buildLabel(preset: DatePreset, from: string, to: string) {
  if (preset !== "custom") return PRESET_LABEL[preset];
  const f = new Date(from).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  const t = new Date(to).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  return `${f} – ${t}`;
}

export function FinanceDateProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string | undefined> });

  const [state, setState] = useState<FinanceDateRange>(() => {
    // 1. URL wins
    const urlFrom = search.from, urlTo = search.to, urlPreset = search.preset as DatePreset | undefined;
    if (urlFrom && urlTo) {
      const preset = (urlPreset ?? "custom") as DatePreset;
      return { from: urlFrom, to: urlTo, preset, label: buildLabel(preset, urlFrom, urlTo) };
    }
    // 2. localStorage
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FinanceDateRange;
          if (parsed.from && parsed.to) return { ...parsed, label: buildLabel(parsed.preset, parsed.from, parsed.to) };
        }
      } catch {/* ignore */}
    }
    // 3. default = MTD
    const r = rangeForPreset("mtd");
    return { ...r, preset: "mtd", label: PRESET_LABEL.mtd };
  });

  // sync URL changes -> state
  useEffect(() => {
    if (search.from && search.to) {
      const preset = (search.preset ?? "custom") as DatePreset;
      setState((s) => (s.from === search.from && s.to === search.to && s.preset === preset
        ? s
        : { from: search.from!, to: search.to!, preset, label: buildLabel(preset, search.from!, search.to!) }));
    }
  }, [search.from, search.to, search.preset]);

  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {/* ignore */}
  }, [state]);

  const apply = useCallback((next: FinanceDateRange) => {
    setState(next);
    navigate({
      to: ".",
      search: ((prev: Record<string, unknown> = {}) => ({ ...prev, from: next.from, to: next.to, preset: next.preset })) as never,
      replace: true,
    });
  }, [navigate]);

  const setRange = useCallback((r: { from: string; to: string; preset?: DatePreset }) => {
    const preset = r.preset ?? "custom";
    apply({ from: r.from, to: r.to, preset, label: buildLabel(preset, r.from, r.to) });
  }, [apply]);

  const setPreset = useCallback((p: Exclude<DatePreset, "custom">) => {
    const r = rangeForPreset(p);
    apply({ ...r, preset: p, label: PRESET_LABEL[p] });
  }, [apply]);

  const reset = useCallback(() => setPreset("mtd"), [setPreset]);

  const value = useMemo<Ctx>(() => ({ ...state, setRange, setPreset, reset }), [state, setRange, setPreset, reset]);
  return <FinanceDateCtx.Provider value={value}>{children}</FinanceDateCtx.Provider>;
}

export function useFinanceDate() {
  const ctx = useContext(FinanceDateCtx);
  if (!ctx) {
    // Safe fallback so consumers used outside /finance don't crash.
    const r = rangeForPreset("mtd");
    return {
      from: r.from,
      to: r.to,
      preset: "mtd" as DatePreset,
      label: PRESET_LABEL.mtd,
      setRange: () => {/* no-op */},
      setPreset: () => {/* no-op */},
      reset: () => {/* no-op */},
    } satisfies Ctx;
  }
  return ctx;
}

export { PRESET_LABEL };
