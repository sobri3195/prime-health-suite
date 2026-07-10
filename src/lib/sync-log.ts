// Mock sync log for SIM Klinik ↔ Finance ↔ Prime Apps integration.
// Stored in-memory; resets on refresh (acceptable for mock).

export type SyncSystem = "SIM Klinik" | "Finance" | "Prime Apps";

export type SyncEntry = {
  id: string;
  ts: string;
  source: SyncSystem;
  target: SyncSystem;
  channel: string;          // e.g. "billing.invoice" / "payment.status"
  refId: string;
  status: "success" | "pending" | "failed";
  message?: string;
  payload?: Record<string, unknown>;
};

let log: SyncEntry[] = [];

const listeners = new Set<() => void>();

export function getSyncLog() { return log; }

export function addSync(entry: Omit<SyncEntry, "id" | "ts">) {
  log = [
    { id: "syn_" + Math.random().toString(36).slice(2, 9), ts: new Date().toISOString(), ...entry },
    ...log,
  ].slice(0, 200);
  listeners.forEach((l) => l());
}

export function retrySync(id: string) {
  log = log.map((e) =>
    e.id === id ? { ...e, status: "success", ts: new Date().toISOString(), message: (e.message ?? "") + " · retry sukses" } : e,
  );
  listeners.forEach((l) => l());
}

export function subscribeSync(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
