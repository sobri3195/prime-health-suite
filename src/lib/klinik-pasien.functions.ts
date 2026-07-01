// Domain barrel: Pasien / Registrasi / Antrian / Jadwal
// Re-exports from klinik.functions.ts to enable gradual domain-based imports
// without breaking existing call sites. New code should import from here.
export {
  listPasien,
  getPasien,
  upsertPasien,
  deactivatePasien,
  listDokter,
  listLayanan,
  createBooking,
  checkinBooking,
  listBookingByDate,
  updateBookingStatus,
  listQueueToday,
  updateQueueStatus,
  upsertJadwal,
  deleteJadwal,
  listJadwal,
} from "./klinik.functions";
