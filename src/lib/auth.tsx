import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { addAudit } from "./audit-log";

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
  /** User of the system implied by the current URL (or null). */
  user: AuthUser | null;
  /** Current system inferred from the URL, or null on neutral routes. */
  currentSystem: System | null;
  /** Is the user authenticated within the *current* system. */
  isAuthenticated: boolean;
  /** Login into a specific system. Other systems remain untouched. */
  login: (system: System, email: string, role: Role) => void;
  /** Logout from a specific system (defaults to currentSystem). */
  logout: (system?: System) => void;
  /** Read session for a specific system (does not depend on URL). */
  userFor: (system: System) => AuthUser | null;
};

const Ctx = createContext<AuthState | null>(null);

// Per-system session keys. Cleared on tab close.
const SESSION_KEY = (s: System) => `ph_session_${s}_v1`;

function systemFromPath(pathname: string): System | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "apps" || seg === "finance") return seg;
  if (seg === "sim-klinik") return "sim-klinik";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Sessions>({});
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentSystem = systemFromPath(pathname);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next: Sessions = {};
    for (const s of SYSTEMS) {
      try {
        // Prefer persisted (localStorage), fall back to session-scoped.
        const raw =
          localStorage.getItem(SESSION_KEY(s)) ??
          sessionStorage.getItem(SESSION_KEY(s));
        if (raw) next[s] = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    setSessions(next);
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
        const json = JSON.stringify(u);
        if (opts?.remember) {
          localStorage.setItem(SESSION_KEY(system), json);
          sessionStorage.removeItem(SESSION_KEY(system));
        } else {
          sessionStorage.setItem(SESSION_KEY(system), json);
          localStorage.removeItem(SESSION_KEY(system));
        }
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
    try {
      sessionStorage.removeItem(SESSION_KEY(target));
      localStorage.removeItem(SESSION_KEY(target));
    } catch { /* ignore */ }
  }, [sessions, currentSystem]);

  // For non-system paths (e.g. /qa), fall back to any existing session.
  const user = currentSystem
    ? (sessions[currentSystem] ?? null)
    : (sessions.apps ?? sessions["sim-klinik"] ?? sessions.finance ?? null);

  const value = useMemo<AuthState>(() => ({
    user,
    currentSystem,
    isAuthenticated: !!user,
    login,
    logout,
    userFor,
  }), [user, currentSystem, login, logout, userFor]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
