// Pure invariants shared by server functions & unit tests.
// Kept dependency-free so it can run in `node --test`.

export type InvoiceStatus = "unpaid" | "partial" | "paid";

export function computePaymentStatus(total: number, previouslyPaid: number, amount: number): {
  newPaid: number;
  status: InvoiceStatus;
} {
  if (!(total > 0)) throw new Error("Total invoice harus > 0");
  if (!(amount > 0)) throw new Error("Jumlah pembayaran harus > 0");
  const sisa = Math.max(0, total - previouslyPaid);
  if (sisa <= 0) throw new Error("Invoice sudah lunas");
  if (amount > sisa) throw new Error(`Jumlah melebihi sisa tagihan (Rp ${sisa.toLocaleString("id-ID")})`);
  const newPaid = previouslyPaid + amount;
  const status: InvoiceStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
  return { newPaid, status };
}

export interface JadwalSlot {
  id?: string;
  dokter_name: string;
  day: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

/** Return the first clashing slot, or null. Same dokter+day, overlap uses (a.start < b.end && a.end > b.start).
 * Touching boundaries (a.end == b.start) do NOT overlap. Editing the same id is ignored. */
export function findScheduleOverlap(candidate: JadwalSlot, others: JadwalSlot[]): JadwalSlot | null {
  if (candidate.end_time <= candidate.start_time) {
    throw new Error("Jam selesai harus lebih besar dari jam mulai");
  }
  for (const r of others) {
    if (r.is_active === false) continue;
    if (r.dokter_name !== candidate.dokter_name || r.day !== candidate.day) continue;
    if (candidate.id && r.id === candidate.id) continue;
    if (candidate.start_time < r.end_time && candidate.end_time > r.start_time) return r;
  }
  return null;
}
