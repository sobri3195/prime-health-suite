import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { addAudit } from "./audit-log";
import { secureStore } from "./secure-store";

export type Role =
  | "super_admin"
  | "owner"
  | "admin_klinik"
  | "front_office"
  | "dokter"
  | "perawat"
  | "kasir"
  | "finance_manager"
  | "accounting"
  | "ar_staff"
  | "ap_staff"
  | "auditor";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  owner: "Owner / Manajemen",
  admin_klinik: "Admin Klinik",
  front_office: "Front Office",
  dokter: "Dokter",
  perawat: "Perawat / Asisten",
  kasir: "Kasir",
  finance_manager: "Finance Manager",
  accounting: "Accounting",
  ar_staff: "AR Staff",
  ap_staff: "AP Staff",
  auditor: "Auditor",
};

export type System = "apps" | "sim-klinik" | "finance";

export const SYSTEMS: System[] = ["apps", "sim-klinik", "finance"];

// Roles allowed in each system (independent authorization per system)
const SYSTEM_ROLES: Record<System, Role[]> = {
  apps: [
    "super_admin", "owner", "admin_klinik", "front_office", "dokter",
    "perawat", "kasir", "finance_manager", "accounting", "ar_staff", "ap_staff", "auditor",
  ],
  "sim-klinik": [
    "super_admin", "owner", "admin_klinik", "front_office", "dokter",
    "perawat", "kasir", "auditor",
  ],
  finance: [
    "super_admin", "owner", "kasir", "finance_manager", "accounting",
    "ar_staff", "ap_staff", "auditor",
  ],
};

export const isReadOnly = (role: Role) => role === "auditor" || role === "owner";
export const rolesFor = (sys: System) => SYSTEM_ROLES[sys];
export const canAccess = (role: Role, sys: System) => SYSTEM_ROLES[sys].includes(role);

export type AuthUser = { id: string; name: string; email: string; role: Role };

type Sessions = Partial<Record<System, AuthUser>>;

type AuthState = {
  user: AuthUser | null;
  currentSystem: System | null;
  isAuthenticated: boolean;
  /** True once the initial session hydration from storage has completed. */
  hydrated: boolean;
  login: (system: System, email: string, role: Role, opts?: { remember?: boolean }) => void;
  logout: (system?: System) => void;
  userFor: (system: System) => AuthUser | null;
};

const Ctx = createContext<AuthState | null>(null);

// Per-system session keys. Stored in cookies (Secure/SameSite=Lax), not localStorage.
// Legacy localStorage/sessionStorage values are migrated on first read.
const SESSION_KEY = (s: System) => `ph_session_${s}_v1`;

function readLegacy(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (v) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    return v;
  } catch { return null; }
}

function systemFromPath(pathname: string): System | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "apps" || seg === "finance") return seg;
  if (seg === "sim-klinik") return "sim-klinik";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Sessions>({});
  const [hydrated, setHydrated] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentSystem = systemFromPath(pathname);

  useEffect(() => {
    if (typeof window === "undefined") { setHydrated(true); return; }
    const next: Sessions = {};
    for (const s of SYSTEMS) {
      try {
        const key = SESSION_KEY(s);
        const raw = secureStore.get(key) ?? readLegacy(key);
        if (raw) {
          next[s] = JSON.parse(raw);
          // Re-persist legacy values as session cookies to clear localStorage.
          if (!secureStore.get(key)) secureStore.set(key, raw, false);
        }
      } catch { /* ignore */ }
    }
    setSessions(next);
    setHydrated(true);
  }, []);

  const userFor = useCallback((s: System) => sessions[s] ?? null, [sessions]);

  const login = useCallback(
    (system: System, email: string, role: Role, opts?: { remember?: boolean }) => {
      const normalized = email.trim().toLowerCase();
      const u: AuthUser = {
        id: "usr_" + Math.random().toString(36).slice(2, 8),
        name: normalized.split("@")[0] || "User",
        email: normalized,
        role,
      };
      setSessions((prev) => ({ ...prev, [system]: u }));
      try {
        secureStore.set(SESSION_KEY(system), JSON.stringify(u), !!opts?.remember);
      } catch { /* ignore */ }
      addAudit({ actor: u.email, action: "login", target: `auth:${system}`, meta: { role } });
    },
    [],
  );

  const logout = useCallback((system?: System) => {
    const target = system ?? currentSystem;
    if (!target) return;
    const u = sessions[target];
    if (u) addAudit({ actor: u.email, action: "logout", target: `auth:${target}` });
    setSessions((prev) => {
      const n = { ...prev };
      delete n[target];
      return n;
    });
    try { secureStore.remove(SESSION_KEY(target)); } catch { /* ignore */ }
  }, [sessions, currentSystem]);

  // For non-system paths (e.g. /qa), fall back to any existing session.
  const user = currentSystem
    ? (sessions[currentSystem] ?? null)
    : (sessions.apps ?? sessions["sim-klinik"] ?? sessions.finance ?? null);

  const value = useMemo<AuthState>(() => ({
    user,
    currentSystem,
    isAuthenticated: !!user,
    hydrated,
    login,
    logout,
    userFor,
  }), [user, currentSystem, hydrated, login, logout, userFor]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
