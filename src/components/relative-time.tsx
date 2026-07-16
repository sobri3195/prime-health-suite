import { useEffect, useState } from "react";

/**
 * Compact relative time (e.g. "2 mnt lalu", "3 jam lalu", "kemarin", "2 hr lalu").
 * Falls back to a locale date after 30 days.
 */
export function relativeTimeID(iso: string | number | Date | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "-";
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const past = diff >= 0;
  const s = Math.round(abs / 1000);
  if (s < 45) return past ? "baru saja" : "sebentar lagi";
  const m = Math.round(s / 60);
  if (m < 60) return past ? `${m} mnt lalu` : `dalam ${m} mnt`;
  const h = Math.round(m / 60);
  if (h < 24) return past ? `${h} jam lalu` : `dalam ${h} jam`;
  const dd = Math.round(h / 24);
  if (dd === 1) return past ? "kemarin" : "besok";
  if (dd < 7) return past ? `${dd} hr lalu` : `dalam ${dd} hr`;
  if (dd < 30) {
    const w = Math.round(dd / 7);
    return past ? `${w} mgg lalu` : `dalam ${w} mgg`;
  }
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function absoluteTimeID(iso: string | number | Date | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function RelativeTime({
  value,
  className,
}: {
  value: string | number | Date | null | undefined;
  className?: string;
}) {
  // Re-render every 60s so labels stay fresh without a global ticker.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const abs = absoluteTimeID(value);
  return (
    <time
      dateTime={value ? new Date(value).toISOString() : undefined}
      title={abs}
      aria-label={abs}
      className={className}
    >
      {relativeTimeID(value)}
    </time>
  );
}
