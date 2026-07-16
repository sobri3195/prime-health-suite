// Centralized IDR formatter. Prefer `useFmtIDR()` in components,
// or import `fmtIDR` directly in non-component modules (PDF, functions).
export function fmtIDR(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "Rp 0";
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}

// Compact form: 1,2jt / 3,4M / 12rb. Still uses id-ID separators.
export function fmtIDRCompact(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return `Rp ${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1e6) return `Rp ${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (Math.abs(v) >= 1e3) return `Rp ${(v / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb`;
  return fmtIDR(v);
}

/**
 * Hook variant so components can call it consistently, and we can later
 * inject locale/currency from settings without touching call sites.
 */
export function useFmtIDR() {
  return fmtIDR;
}
