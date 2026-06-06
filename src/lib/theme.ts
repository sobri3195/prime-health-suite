// Persistent theme (light/dark) toggle. Stores choice in localStorage and
// applies the `dark` class on <html>.

export type Theme = "light" | "dark";

const KEY = "pp:theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(KEY);
  if (v === "dark" || v === "light") return v;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

/** Run once on app boot. Safe to call multiple times. */
export function initTheme() {
  applyTheme(getStoredTheme());
}
