/**
 * Secure cookie-based storage for per-system session markers.
 *
 * Why cookies (not localStorage):
 *  - Scoped attributes (`Secure`, `SameSite=Lax`, `Path=/`) the browser enforces.
 *  - Auto-expire — "remember me" vs tab-session distinction without leaking
 *    forever the way localStorage does on shared devices.
 *  - Not readable by `<img>`/CSS injection vectors targeting localStorage.
 *
 * NOTE: still readable from JS (cannot be HttpOnly from client code). The
 * Supabase session itself is managed by the integration client; this layer
 * only holds our system-scoped UX marker.
 */

const isBrowser = typeof document !== "undefined";
const isHttps = isBrowser && window.location.protocol === "https:";

function attrs(maxAgeSeconds: number | null) {
  const parts = [`Path=/`, `SameSite=Lax`];
  if (isHttps) parts.push("Secure");
  if (maxAgeSeconds != null) parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join("; ");
}

export const secureStore = {
  get(key: string): string | null {
    if (!isBrowser) return null;
    const target = encodeURIComponent(key) + "=";
    for (const raw of document.cookie.split("; ")) {
      if (raw.startsWith(target)) {
        try { return decodeURIComponent(raw.slice(target.length)); }
        catch { return null; }
      }
    }
    return null;
  },
  /** persistent=true → 30 days; false → session cookie (cleared on browser close). */
  set(key: string, value: string, persistent: boolean) {
    if (!isBrowser) return;
    const maxAge = persistent ? 60 * 60 * 24 * 30 : null;
    document.cookie =
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}; ${attrs(maxAge)}`;
  },
  remove(key: string) {
    if (!isBrowser) return;
    document.cookie = `${encodeURIComponent(key)}=; ${attrs(0)}`;
  },
};
