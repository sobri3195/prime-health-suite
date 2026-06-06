// Mock sync log for SIM ↔ Finance integration.
// Stored in-memory; resets on refresh (acceptable for mock).

export type SyncEntry = {
  id: string;
  ts: string;
  source: "SIM Klinik" | "Finance";
  target: "Finance" | "SIM Klinik";
  channel: string; // e.g. "billing.invoice"
  refId: string;   // billing_id
  status: "success" | "pending" | "failed";
  payload?: Record<string, unknown>;
};

let log: SyncEntry[] = [];
const listeners = new Set<() => void>();

export function getSyncLog() {
  return log;
}

export function addSync(entry: Omit<SyncEntry, "id" | "ts">) {
  log = [
    { id: "syn_" + Math.random().toString(36).slice(2, 9), ts: new Date().toISOString(), ...entry },
    ...log,
  ].slice(0, 200);
  listeners.forEach((l) => l());
}

export function subscribeSync(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function formatIDR(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
