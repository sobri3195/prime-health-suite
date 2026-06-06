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

function seed(): SyncEntry[] {
  const now = Date.now();
  const mk = (i: number, p: Omit<SyncEntry, "id" | "ts">): SyncEntry => ({
    id: "syn_seed_" + i,
    ts: new Date(now - i * 1000 * 60 * 7).toISOString(),
    ...p,
  });
  return [
    mk(1, { source: "SIM Klinik", target: "Finance", channel: "billing.invoice", refId: "BIL-1042",
            status: "success", message: "Invoice INV/2026/06/1042 terkirim ke Finance" }),
    mk(2, { source: "Finance", target: "SIM Klinik", channel: "payment.status", refId: "INV/2026/06/1042",
            status: "success", message: "Status pembayaran disinkron: paid" }),
    mk(3, { source: "SIM Klinik", target: "Prime Apps", channel: "notification.summary", refId: "NTF-998",
            status: "success", message: "Notifikasi billing baru ke portal" }),
    mk(4, { source: "Finance", target: "SIM Klinik", channel: "payment.status", refId: "INV/2026/06/1021",
            status: "pending", message: "Menunggu konfirmasi gateway internal" }),
    mk(5, { source: "SIM Klinik", target: "Finance", channel: "billing.invoice", refId: "BIL-1011",
            status: "failed", message: "Payer 'Asuransi X' belum dimapping di master Finance" }),
  ];
}

let log: SyncEntry[] = seed();
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
