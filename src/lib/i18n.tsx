// Minimal i18n: ID (default) / EN. No external deps.
// Usage:
//   const { t, lang, setLang } = useI18n();
//   t("nav.home")
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "id" | "en";

const KEY = "pp:lang";

const DICT: Record<Lang, Record<string, string>> = {
  id: {
    "nav.home": "Beranda",
    "nav.ai": "AI",
    "nav.shop": "Belanja",
    "nav.education": "Edukasi",
    "nav.wins": "Daily Wins",
    "nav.chat": "Chat FO",
    "nav.profile": "Profil",
    "nav.privacy": "Privasi & Keamanan",
    "nav.report": "Laporan",
    "common.loading": "Memuat…",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.empty": "Belum ada data",
    "common.theme": "Tema",
    "common.language": "Bahasa",
    "common.light": "Terang",
    "common.dark": "Gelap",
    "profile.title": "Profil Pasien",
    "profile.logout": "Keluar",
  },
  en: {
    "nav.home": "Home",
    "nav.ai": "AI",
    "nav.shop": "Shop",
    "nav.education": "Education",
    "nav.wins": "Daily Wins",
    "nav.chat": "Chat",
    "nav.profile": "Profile",
    "nav.privacy": "Privacy & Security",
    "nav.report": "Reports",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.empty": "No data yet",
    "common.theme": "Theme",
    "common.language": "Language",
    "common.light": "Light",
    "common.dark": "Dark",
    "profile.title": "Patient Profile",
    "profile.logout": "Logout",
  },
};

function getStored(): Lang {
  if (typeof window === "undefined") return "id";
  const v = window.localStorage.getItem(KEY);
  return v === "en" ? "en" : "id";
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const stored = getStored();
    setLangState(stored);
    document.documentElement.setAttribute("lang", stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, l);
    document.documentElement.setAttribute("lang", l);
  }, []);

  const t = useCallback(
    (key: string) => DICT[lang][key] ?? DICT.id[key] ?? key,
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (e.g. SSR shell)
    return { lang: "id", setLang: () => {}, t: (k) => DICT.id[k] ?? k };
  }
  return ctx;
}
