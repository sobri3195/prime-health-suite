import type { System } from "./auth";

// OAuth may return to a deep link, but only within the selected application.
export function getSafeSignInRedirect(system: System, redirect?: string): string {
  const fallback = `/${system}`;
  if (!redirect?.startsWith("/") || /[\\\s\p{Cc}]/u.test(redirect)) {
    return fallback;
  }

  const base = new URL("https://auth.local");
  try {
    const target = new URL(redirect, base);
    if (
      target.origin !== base.origin ||
      (target.pathname !== fallback && !target.pathname.startsWith(`${fallback}/`))
    ) {
      return fallback;
    }
    return target.pathname + target.search + target.hash;
  } catch {
    return fallback;
  }
}

export function getOAuthCallbackUrl(origin: string, system: System, redirect?: string): string {
  const callback = new URL("/login", origin);
  callback.searchParams.set("oauth", "google");
  callback.searchParams.set("system", system);
  callback.searchParams.set("redirect", getSafeSignInRedirect(system, redirect));
  return callback.toString();
}

export function usesLovableOAuth(hostname: string): boolean {
  return ["lovable.app", "lovableproject.com"].some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export function getOAuthError(url: URL): "auth.oauth.cancelled" | "auth.oauth.failed" | null {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.get("error") || fragment.get("error");
  if (error === "access_denied") return "auth.oauth.cancelled";
  if (
    error ||
    url.searchParams.has("error_description") ||
    url.searchParams.has("error_code") ||
    fragment.has("error_description") ||
    fragment.has("error_code")
  ) {
    return "auth.oauth.failed";
  }
  return null;
}
