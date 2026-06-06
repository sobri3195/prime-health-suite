export type AuditEntry = {
  id: string;
  ts: string;
  actor: string;
  action: "login" | "logout" | "page_access" | "role_change" | "export" | "sync";
  target: string;
  meta?: Record<string, unknown>;
};

// In-memory audit log (mock). Replace with persistent store in production.
let log: AuditEntry[] = seed();
const listeners = new Set<() => void>();

function seed(): AuditEntry[] {
  const now = Date.now();
  const mk = (i: number, partial: Omit<AuditEntry, "id" | "ts">): AuditEntry => ({
    id: "aud_" + i,
    ts: new Date(now - i * 1000 * 60 * 17).toISOString(),
    ...partial,
  });
  return [
    mk(1, { actor: "admin@klinikmata.id", action: "login", target: "auth" }),
    mk(2, { actor: "dr.rini@klinikmata.id", action: "page_access", target: "/sim-klinik/pasien" }),
    mk(3, { actor: "finance@klinikmata.id", action: "export", target: "finance/laba-rugi" }),
    mk(4, { actor: "admin@klinikmata.id", action: "sync", target: "integration/sim<->finance" }),
    mk(5, { actor: "owner@klinikmata.id", action: "role_change", target: "usr_8821", meta: { to: "kasir" } }),
  ];
}

export function getAudit() {
  return log;
}

export function addAudit(entry: Omit<AuditEntry, "id" | "ts">) {
  log = [
    { id: "aud_" + Math.random().toString(36).slice(2, 9), ts: new Date().toISOString(), ...entry },
    ...log,
  ].slice(0, 200);
  listeners.forEach((l) => l());
}

export function subscribeAudit(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
