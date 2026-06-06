import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

// Role → systems the user can access (apps always allowed for internal staff)
const ACCESS: Record<Role, System[]> = {
  super_admin: ["apps", "sim-klinik", "finance"],
  owner: ["apps", "sim-klinik", "finance"],
  admin_klinik: ["apps", "sim-klinik"],
  front_office: ["apps", "sim-klinik"],
  dokter: ["apps", "sim-klinik"],
  perawat: ["apps", "sim-klinik"],
  kasir: ["apps", "sim-klinik", "finance"],
  finance_manager: ["apps", "finance"],
  accounting: ["apps", "finance"],
  ar_staff: ["apps", "finance"],
  ap_staff: ["apps", "finance"],
  auditor: ["apps", "sim-klinik", "finance"],
};

// Default landing system after login
const DEFAULT_SYSTEM: Record<Role, System> = {
  super_admin: "apps",
  owner: "apps",
  admin_klinik: "sim-klinik",
  front_office: "sim-klinik",
  dokter: "sim-klinik",
  perawat: "sim-klinik",
  kasir: "sim-klinik",
  finance_manager: "finance",
  accounting: "finance",
  ar_staff: "finance",
  ap_staff: "finance",
  auditor: "apps",
};

export const isReadOnly = (role: Role) => role === "auditor" || role === "owner";
export const canAccess = (role: Role, sys: System) => ACCESS[role].includes(sys);
export const defaultSystemFor = (role: Role) => DEFAULT_SYSTEM[role];

export type AuthUser = { id: string; name: string; email: string; role: Role };

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, role: Role) => void;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

// Non-sensitive UI hint stored in sessionStorage (cleared on tab close).
// Replace with Supabase Auth session for production.
const SESSION_KEY = "ph_session_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: !!user,
      login: (email, role) => {
        const u: AuthUser = {
          id: "usr_" + Math.random().toString(36).slice(2, 8),
          name: email.split("@")[0] || "User",
          email,
          role,
        };
        setUser(u);
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {}
        addAudit({ actor: u.email, action: "login", target: "auth", meta: { role } });
      },
      logout: () => {
        if (user) addAudit({ actor: user.email, action: "logout", target: "auth" });
        setUser(null);
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      },
    }),
    [user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
