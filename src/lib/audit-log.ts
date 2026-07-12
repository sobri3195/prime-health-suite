export type AuditEntry = {
  id: string;
  ts: string;
  actor: string;
  action: "login" | "logout" | "page_access" | "role_change" | "export" | "sync";
  target: string;
  meta?: Record<string, unknown>;
};

// In-memory audit log ring buffer for the current tab; the authoritative log
// is mirrored to the backend via appendAudit() below.
let log: AuditEntry[] = [];
const listeners = new Set<() => void>();


export function getAudit() {
  return log;
}

export function addAudit(entry: Omit<AuditEntry, "id" | "ts">) {
  log = [
    { id: "aud_" + Math.random().toString(36).slice(2, 9), ts: new Date().toISOString(), ...entry },
    ...log,
  ].slice(0, 200);
  listeners.forEach((l) => l());

  // Mirror to persistent backend (fire and forget; ignored when not signed in).
  if (typeof window !== "undefined") {
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const { appendAudit } = await import("./clinic.functions");
        const map: Record<AuditEntry["action"], { module: string; action: string }> = {
          login:       { module: "Auth",     action: "login" },
          logout:      { module: "Auth",     action: "logout" },
          page_access: { module: "Auth",     action: "page_access" },
          role_change: { module: "Settings", action: "role_change" },
          export:      { module: "Export",   action: "export" },
          sync:        { module: "Sync",     action: "sync" },
        };
        const m = map[entry.action];
        await appendAudit({ data: { module: m.module, action: m.action, target: entry.target, meta: entry.meta } });
      } catch {/* not signed in or offline */}
    })();
  }
}

export function subscribeAudit(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
