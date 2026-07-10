// Sanitize URLs used as href/deep_link. Only allow internal paths
// (starting with "/") or safe http(s) absolute URLs. Anything else — including
// javascript:, data:, vbscript:, or bare fragments — returns null.
export function sanitizeDeepLink(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  // Internal path — reject protocol-relative //evil.com
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw, "https://app.local");
    if (u.protocol === "http:" || u.protocol === "https:") {
      // Absolute external URL — return canonical form
      if (/^https?:\/\//i.test(raw)) return u.toString();
      // Was relative → return path+search+hash
      return u.pathname + u.search + u.hash;
    }
    return null;
  } catch {
    return null;
  }
}
