import type { System } from "./auth";

export type SystemBrand = {
  name: string;
  shortName: string;
  tagline: string;
  /** Used as document.title prefix */
  titleSuffix: string;
  /** Emoji favicon for instant separation per system */
  faviconEmoji: string;
  /** Hex theme color for header accent */
  accent: string;
  /** Background color for the shell */
  background: string;
  /** Foreground/text color */
  foreground: string;
};

export const BRAND: Record<System, SystemBrand> = {
  apps: {
    name: "Prime Apps",
    shortName: "Apps",
    tagline: "Portal Pasien Klinik Mata",
    titleSuffix: "Prime Apps",
    faviconEmoji: "👁",
    accent: "#c9a84c",
    background: "#f7eccb",
    foreground: "#3a2a05",
  },
  "sim-klinik": {
    name: "SIM Klinik Mata",
    shortName: "SIM Klinik",
    tagline: "Sistem Informasi Klinik",
    titleSuffix: "SIM Klinik Mata",
    faviconEmoji: "🩺",
    accent: "#2d8a9e",
    background: "#f4f7f9",
    foreground: "#0c2340",
  },
  finance: {
    name: "Simon Finance",
    shortName: "Finance",
    tagline: "Dashboard Keuangan",
    titleSuffix: "Simon Finance",
    faviconEmoji: "📊",
    accent: "#0d7a5f",
    background: "#f5f0e0",
    foreground: "#064e3b",
  },
};

export function faviconDataUrl(emoji: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text y='52' font-size='52'>${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function brandHead(system: System, pageTitle?: string, opts?: { noindex?: boolean }) {
  const b = BRAND[system];
  const meta: Array<Record<string, string>> = [
    { title: pageTitle ? `${pageTitle} — ${b.titleSuffix}` : b.titleSuffix },
    { name: "description", content: b.tagline },
    { name: "theme-color", content: b.accent },
  ];
  if (opts?.noindex) meta.push({ name: "robots", content: "noindex,nofollow" });
  return {
    meta,
    links: [{ rel: "icon", type: "image/svg+xml", href: faviconDataUrl(b.faviconEmoji) }],
  };
}

/** Clinic contact info (overridable via Vite env). */
export const CLINIC_CONTACT = {
  whatsapp: import.meta.env.VITE_CLINIC_WHATSAPP || "6281234567890",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://prime-health-suite.lovable.app",
} as const;

export const waLink = (text?: string) =>
  `https://wa.me/${CLINIC_CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;


