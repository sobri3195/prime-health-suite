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
    "notif.title": "Notifikasi",
    "notif.unread": "{n} belum dibaca",
    "notif.all_read": "Semua sudah dibaca",
    "notif.mark_all": "Tandai semua",
    "notif.empty.title": "Belum ada notifikasi",
    "notif.empty.hint": "Notifikasi booking, pengingat, dan resep akan muncul di sini.",
    "notif.open": "Buka",
    "history.title": "Riwayat & Resep",
    "history.subtitle": "Daftar kronologis pemeriksaan, tindakan, dan resep dari kunjungan Anda.",
    "history.empty.title": "Belum ada riwayat",
    "history.empty.hint": "Riwayat akan muncul di sini setelah kunjungan Anda dicatat oleh klinik.",
    "history.cta_book": "Booking Pemeriksaan",
    "history.download_resep": "Unduh Resep PDF",
    "history.share": "Bagikan",
    "history.total": "Total",
    "history.need_help": "Butuh bantuan?",
    "history.contact_clinic": "Hubungi Klinik",
    "history.note_doctor": "Catatan dokter",
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
    "notif.title": "Notifications",
    "notif.unread": "{n} unread",
    "notif.all_read": "All caught up",
    "notif.mark_all": "Mark all read",
    "notif.empty.title": "No notifications yet",
    "notif.empty.hint": "Booking, reminders, and prescription alerts will show up here.",
    "notif.open": "Open",
    "history.title": "History & Prescriptions",
    "history.subtitle": "Chronological list of your visits, treatments, and prescriptions.",
    "history.empty.title": "No history yet",
    "history.empty.hint": "Your history will appear here after the clinic records your visit.",
    "history.cta_book": "Book an Exam",
    "history.download_resep": "Download Prescription PDF",
    "history.share": "Share",
    "history.total": "Total",
    "history.need_help": "Need help?",
    "history.contact_clinic": "Contact Clinic",
    "history.note_doctor": "Doctor's note",
  },
};

function getStored(): Lang {
  if (typeof window === "undefined") return "id";
  const v = window.localStorage.getItem(KEY);
  return v === "en" ? "en" : "id";
}

type TVars = Record<string, string | number>;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: TVars) => string };
const I18nContext = createContext<Ctx | null>(null);

function format(template: string, vars?: TVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

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
    (key: string, vars?: TVars) => format(DICT[lang][key] ?? DICT.id[key] ?? key, vars),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (e.g. SSR shell)
    return { lang: "id", setLang: () => {}, t: (k, vars) => format(DICT.id[k] ?? k, vars) };
  }
  return ctx;
}
