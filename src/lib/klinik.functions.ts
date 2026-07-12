import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { appendAuditRow } from "@/lib/clinic.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = any;

function clinicInvoiceNo(date = new Date()) {
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const hms = `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`;
  const suffix = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `INV-${ymd}-${hms}-${suffix}`;
}

/* =============================================================
 * PASIEN
 * ============================================================*/
const PasienSchema = z.object({
  id: z.string().uuid().optional(),
  no_rm: z.string().optional(),
  nama: z.string().min(1, "Nama wajib"),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit").optional().or(z.literal("")).transform((v) => (v ? v : null)),
  tgl_lahir: z.string().optional().nullable(),
  jenis_kelamin: z.enum(["L", "P"]),
  telp: z.string().min(8, "Nomor HP minimal 8 digit"),
  alamat: z.string().optional().nullable(),
  patient_type: z.enum(["Umum", "BPJS", "Asuransi", "Corporate"]).default("Umum"),
  insurance_name: z.string().optional().nullable(),
  no_bpjs: z.string().optional().nullable(),
  alergi: z.string().optional().nullable(),
  kontak_darurat: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const listPasien = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    q: z.string().optional(),
    patient_type: z.string().optional(),
    is_active: z.boolean().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    let q = sb.from("apps_pasien").select("*").not("no_rm", "is", null).order("created_at", { ascending: false }).limit(data.limit ?? 200);
    if (data.patient_type && data.patient_type !== "all") q = q.eq("patient_type", data.patient_type);
    if (typeof data.is_active === "boolean") q = q.eq("is_active", data.is_active);
    if (data.q) q = q.or(`nama.ilike.%${data.q}%,no_rm.ilike.%${data.q}%,nik.ilike.%${data.q}%,telp.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getPasien = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as Supa).from("apps_pasien").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const upsertPasien = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PasienSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const payload: Record<string, unknown> = { ...data };
    if (!data.id) {
      // generate no_rm via RPC
      const { data: rm, error: rmErr } = await sb.rpc("klinik_next_no_rm");
      if (rmErr) throw rmErr;
      payload.no_rm = rm;
      delete payload.id;
      const { data: row, error } = await sb.from("apps_pasien").insert(payload).select("*").single();
      if (error) throw error;
      await appendAuditRow(sb, { actor_id: context.userId, actor_email: context.claims?.email as string | undefined, module: "Pasien", action: "create", target: row.id, meta: { no_rm: row.no_rm } });
      return row;
    } else {
      const id = data.id;
      delete payload.id;
      delete payload.no_rm;
      const { data: row, error } = await sb.from("apps_pasien").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      await appendAuditRow(sb, { actor_id: context.userId, actor_email: context.claims?.email as string | undefined, module: "Pasien", action: "update", target: id });
      return row;
    }
  });

export const deactivatePasien = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const { error } = await sb.from("apps_pasien").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, actor_email: context.claims?.email as string | undefined, module: "Pasien", action: data.is_active ? "activate" : "deactivate", target: data.id });
    return { ok: true };
  });

/* =============================================================
 * DOKTER
 * ============================================================*/
export const listDokter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as Supa).from("fin_dokter").select("id, code, name, spesialisasi, default_fee_pct, is_ptkp_k0, is_active, schedule_note, created_at, updated_at").order("name");
    if (error) throw error;
    return data ?? [];
  });

/* =============================================================
 * LAYANAN
 * ============================================================*/
export const listLayanan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as Supa).from("fin_layanan").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return data ?? [];
  });

/* =============================================================
 * OBAT
 * ============================================================*/
const ObatSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  unit: z.string().min(1),
  stock: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0).default(0),
  expired_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const listObat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    q: z.string().optional(), low_stock_only: z.boolean().optional(),
    active_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(2000).optional(),
    offset: z.number().int().min(0).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const limit = data.limit ?? 500;
    const offset = data.offset ?? 0;
    let q = sb.from("klinik_obat").select("*").order("name").range(offset, offset + limit - 1);
    if (data.active_only) q = q.eq("is_active", true);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,code.ilike.%${data.q}%,category.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    let out = rows ?? [];
    if (data.low_stock_only) out = out.filter((r: { stock: number; min_stock: number }) => Number(r.stock) <= Number(r.min_stock));
    return out;
  });

export const upsertObat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ObatSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const payload: Record<string, unknown> = { ...data };
    if (!data.id) {
      delete payload.id;
      const { data: row, error } = await sb.from("klinik_obat").insert(payload).select("*").single();
      if (error) throw error;
      await appendAuditRow(sb, { actor_id: context.userId, module: "Obat", action: "create", target: row.id, meta: { code: row.code } });
      return row;
    }
    const id = data.id; delete payload.id;
    const { data: row, error } = await sb.from("klinik_obat").update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, module: "Obat", action: "update", target: id });
    return row;
  });

export const stockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    obat_id: z.string().uuid(),
    movement_type: z.enum(["in", "out", "adjustment"]),
    quantity: z.coerce.number().refine((v) => v > 0 || false, { message: "Kuantitas harus > 0" }),
    note: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // Guard trigger klinik_guard_stock_movement menolak qty<=0 dan out melebihi stok (FOR UPDATE).
    const { error } = await sb.from("klinik_stock_movement").insert({ ...data, created_by: context.userId });
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, module: "Stok", action: data.movement_type, target: data.obat_id, meta: { qty: data.quantity, note: data.note } });
    return { ok: true };
  });

export const listStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    obat_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
    offset: z.number().int().min(0).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 100; const offset = data.offset ?? 0;
    let q = (context.supabase as Supa).from("klinik_stock_movement")
      .select("*, klinik_obat(name,code,unit)")
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (data.obat_id) q = q.eq("obat_id", data.obat_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/* =============================================================
 * REGISTRASI / BOOKING / VISIT / QUEUE
 * ============================================================*/
const BookingSchema = z.object({
  pasien_id: z.string().uuid(),
  dokter_id: z.string().uuid(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  jam_slot: z.string().regex(/^\d{2}:\d{2}$/, "Jam slot tidak valid"),
  keluhan: z.string().optional(),
  source: z.enum(["walk_in", "phone", "whatsapp", "online"]).default("walk_in"),
});

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BookingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // P0: cegah booking ke masa lampau.
    const today = new Date().toISOString().slice(0, 10);
    if (data.tanggal < today) throw new Error("Tanggal booking tidak boleh di masa lampau.");
    // P0: validasi dokter aktif — cegah booking ke dokter nonaktif.
    const { data: dok, error: dokErr } = await sb
      .from("fin_dokter").select("name,is_active").eq("id", data.dokter_id).maybeSingle();
    if (dokErr) throw dokErr;
    if (!dok) throw new Error("Dokter tidak ditemukan.");
    if (dok.is_active === false) throw new Error("Dokter sedang tidak aktif.");
    const { data: row, error } = await sb.from("apps_booking").insert({
      pasien_id: data.pasien_id, dokter_id: data.dokter_id, dokter_nama: dok.name ?? "Dokter",
      tanggal: data.tanggal, jam_slot: data.jam_slot, keluhan: data.keluhan,
      source: data.source, status: "confirmed",
    }).select("*").single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        throw new Error("Slot ini sudah terisi. Silakan pilih jam atau dokter lain.");
      }
      throw error;
    }
    await appendAuditRow(sb, { actor_id: context.userId, module: "Booking", action: "create", target: row.id });
    return row;
  });

export const checkinBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ booking_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const { data: bk, error: be } = await sb.from("apps_booking").select("*").eq("id", data.booking_id).maybeSingle();
    if (be || !bk) throw be ?? new Error("Booking tidak ditemukan");
    // Idempotent: bila visit untuk booking ini sudah ada (partial UNIQUE), kembalikan itu.
    const { data: existing } = await sb.from("klinik_visit").select("*, klinik_queue(*)").eq("booking_id", bk.id).maybeSingle();
    if (existing) return { visit: existing, queue: existing.klinik_queue?.[0] ?? null };
    // Resolve pasien_id
    let pasienId: string | null = bk.pasien_id;
    if (!pasienId && bk.user_id) {
      const { data: pas } = await sb.from("apps_pasien").select("id,patient_type").eq("user_id", bk.user_id).maybeSingle();
      pasienId = pas?.id ?? null;
      if (pasienId) await sb.from("apps_booking").update({ pasien_id: pasienId }).eq("id", bk.id);
    }
    if (!pasienId) throw new Error("Pasien belum terdaftar di master pasien. Lengkapi profil pasien terlebih dulu.");
    const { data: pasFull } = await sb.from("apps_pasien").select("patient_type").eq("id", pasienId).maybeSingle();
    const { data: dok } = await sb.from("fin_dokter").select("code").eq("id", bk.dokter_id).maybeSingle();
    const counter = (dok?.code?.trim()?.[0] ?? "A").toUpperCase();
    const { data: visit, error: ve } = await sb.from("klinik_visit").insert({
      pasien_id: pasienId, dokter_id: bk.dokter_id, booking_id: bk.id,
      chief_complaint: bk.keluhan, status: "registered",
      patient_type: pasFull?.patient_type ?? "Umum",
      created_by: context.userId,
    }).select("*").single();
    if (ve) {
      if ((ve as { code?: string }).code === "23505") {
        const { data: race } = await sb.from("klinik_visit").select("*, klinik_queue(*)").eq("booking_id", bk.id).maybeSingle();
        if (race) return { visit: race, queue: race.klinik_queue?.[0] ?? null };
      }
      throw ve;
    }
    const { data: qn, error: qne } = await sb.rpc("klinik_next_queue_no", { _date: bk.tanggal, _counter: counter });
    if (qne) throw qne;
    const { data: queue, error: qe } = await sb.from("klinik_queue").insert({
      visit_id: visit.id, pasien_id: pasienId, dokter_id: bk.dokter_id,
      queue_no: qn, queue_date: bk.tanggal, counter, status: "waiting",
    }).select("*").single();
    if (qe) throw qe;
    await sb.from("apps_booking").update({ status: "checked_in" }).eq("id", bk.id);
    await appendAuditRow(sb, { actor_id: context.userId, module: "Antrian", action: "checkin", target: visit.id, meta: { queue_no: qn } });
    return { visit, queue };
  });

export const listBookingByDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string().optional(), status: z.string().optional(), dokter_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const d = data.date ?? new Date().toISOString().slice(0, 10);
    let q = (context.supabase as Supa).from("apps_booking")
      .select("*, apps_pasien(no_rm,nama,telp,patient_type), fin_dokter(name,spesialisasi), klinik_visit!klinik_visit_booking_id_fkey(klinik_queue(queue_no,status))")
      .eq("tanggal", d).order("jam_slot");
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.dokter_id) q = q.eq("dokter_id", data.dokter_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// Status yang mengunci booking — batal / reschedule tidak boleh lagi.
// Setelah check-in / dipanggil (arrived) / dilayani (in_service) / selesai,
// pembatalan harus lewat alur poli (no-show / selesai), bukan tombol cancel.
const BOOKING_LOCKED_STATUSES = ["checked_in", "arrived", "in_service", "done", "cancelled"] as const;
const BOOKING_CANCELLABLE_STATUSES = ["pending", "confirmed"] as const;

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending","confirmed","checked_in","done","cancelled"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // Cek status saat ini secara eksplisit sebelum update.
    const { data: cur, error: curErr } = await sb.from("apps_booking").select("status").eq("id", data.id).maybeSingle();
    if (curErr) throw curErr;
    if (!cur) throw new Error("Booking tidak ditemukan.");
    const curStatus = cur.status as string;
    if (data.status === "cancelled" && !BOOKING_CANCELLABLE_STATUSES.includes(curStatus as typeof BOOKING_CANCELLABLE_STATUSES[number])) {
      throw new Error("Booking tidak bisa dibatalkan: status saat ini '" + curStatus + "' sudah terkunci (check-in / dipanggil / dilayani / selesai).");
    }
    // P0: 'checked_in' hanya boleh diset oleh alur checkinBooking (yang membuat visit+queue),
    // bukan lewat updateBookingStatus manual — jika tidak, booking berstatus checked_in
    // tanpa visit/queue → pasien hilang dari antrian.
    if (data.status === "checked_in" && curStatus !== "checked_in") {
      throw new Error("Gunakan tombol Check-in untuk membuat antrian, bukan ubah status manual.");
    }
    if (data.status !== "cancelled" && BOOKING_LOCKED_STATUSES.includes(curStatus as typeof BOOKING_LOCKED_STATUSES[number]) && curStatus !== data.status) {
      throw new Error("Transisi status tidak diizinkan dari '" + curStatus + "' ke '" + data.status + "'.");
    }
    const { data: rows, error } = await sb.from("apps_booking").update({ status: data.status }).eq("id", data.id).select("id");
    if (error) throw error;
    if (!rows || rows.length === 0) throw new Error("Booking tidak bisa diubah.");
    await appendAuditRow(sb, { actor_id: context.userId, module: "Booking", action: data.status, target: data.id, meta: { from: curStatus } });
    return { ok: true };
  });

export const listQueueToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string().optional(), status: z.string().optional(), dokter_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const d = data.date ?? new Date().toISOString().slice(0, 10);
    let q = (context.supabase as Supa).from("klinik_queue")
      .select("*, apps_pasien(no_rm,nama), fin_dokter(name), klinik_visit(chief_complaint,status)")
      .eq("queue_date", d).order("queue_no");
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.dokter_id) q = q.eq("dokter_id", data.dokter_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const QUEUE_TRANSITIONS: Record<string, string[]> = {
  waiting: ["called", "cancelled"],
  called: ["in_service", "cancelled", "waiting"],
  in_service: ["done", "cancelled"],
  done: [],
  cancelled: [],
};
const VISIT_TERMINAL = new Set(["done", "billing", "cancelled"]);

export const updateQueueStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["waiting","called","in_service","done","cancelled"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // State-machine guard: cek status queue saat ini sebelum transisi.
    const { data: cur, error: ce } = await sb.from("klinik_queue").select("status,visit_id").eq("id", data.id).maybeSingle();
    if (ce || !cur) throw ce ?? new Error("Antrian tidak ditemukan");
    const allowed = QUEUE_TRANSITIONS[String(cur.status)] ?? [];
    if (cur.status !== data.status && !allowed.includes(data.status)) {
      throw new Error(`Transisi antrian ${cur.status} → ${data.status} tidak diizinkan`);
    }
    const updates: Record<string, unknown> = { status: data.status };
    if (data.status === "called") updates.called_at = new Date().toISOString();
    if (data.status === "in_service") updates.served_at = new Date().toISOString();
    if (data.status === "done") updates.done_at = new Date().toISOString();
    const { error } = await sb.from("klinik_queue").update(updates).eq("id", data.id);
    if (error) throw error;
    // mirror visit status — jangan overwrite visit yang sudah final (done/billing/cancelled)
    if (cur.visit_id) {
      const { data: v } = await sb.from("klinik_visit").select("status").eq("id", cur.visit_id).maybeSingle();
      if (v && !VISIT_TERMINAL.has(String(v.status))) {
        const visitStatus = data.status === "called" ? "in_exam" : data.status === "in_service" ? "in_doctor" : data.status === "done" ? "billing" : data.status === "cancelled" ? "cancelled" : "registered";
        await sb.from("klinik_visit").update({ status: visitStatus }).eq("id", cur.visit_id);
      }
    }
    await appendAuditRow(sb, { actor_id: context.userId, module: "Antrian", action: data.status, target: data.id });
    return { ok: true };
  });

/* =============================================================
 * REKAM MEDIS
 * ============================================================*/
const MedRecSchema = z.object({
  id: z.string().uuid().optional(),
  visit_id: z.string().uuid(),
  pasien_id: z.string().uuid(),
  dokter_id: z.string().uuid().optional().nullable(),
  anamnesis: z.string().optional().nullable(),
  riwayat_penyakit: z.string().optional().nullable(),
  alergi: z.string().optional().nullable(),
  visus_od: z.string().optional().nullable(),
  visus_os: z.string().optional().nullable(),
  tio_od: z.string().optional().nullable(),
  tio_os: z.string().optional().nullable(),
  slit_lamp: z.string().optional().nullable(),
  fundus: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  icd10_code: z.string().optional().nullable(),
  treatment_plan: z.string().optional().nullable(),
  tindakan: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  follow_up_date: z.string().optional().nullable(),
  is_final: z.boolean().optional(),
});

export const upsertMedicalRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MedRecSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const payload: Record<string, unknown> = { ...data };
    delete payload.id;
    delete payload.visit_id;   // immutable — trigger juga menjaga
    delete payload.pasien_id;  // immutable
    if (data.id) {
      // Cek is_final tersimpan; trigger klinik_medrec_final_guard juga menolak, tapi kita mau error lebih ramah.
      const { data: cur, error: ce } = await sb.from("klinik_medical_record").select("is_final").eq("id", data.id).maybeSingle();
      if (ce) throw ce;
      if (cur?.is_final && !data.is_final) throw new Error("Rekam medis sudah difinalisasi dan tidak dapat diubah.");
      if (cur?.is_final && data.is_final) throw new Error("Rekam medis sudah difinalisasi.");
      const { data: row, error } = await sb.from("klinik_medical_record").update(payload).eq("id", data.id).select("*").single();
      if (error) throw error;
      await appendAuditRow(sb, { actor_id: context.userId, module: "RekamMedis", action: "update", target: data.id });
      return row;
    }
    const { data: row, error } = await sb.from("klinik_medical_record").upsert({ ...payload, visit_id: data.visit_id, pasien_id: data.pasien_id }, { onConflict: "visit_id" }).select("*").single();
    if (error) throw error;
    if (data.is_final) {
      await sb.from("klinik_visit").update({ status: "billing" }).eq("id", data.visit_id);
    }
    await appendAuditRow(sb, { actor_id: context.userId, module: "RekamMedis", action: data.is_final ? "finalize" : "save", target: row.id });
    return row;
  });

export const getMedicalRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ visit_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as Supa).from("klinik_medical_record").select("*").eq("visit_id", data.visit_id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const listVisits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    date: z.string().optional(),
    pasien_id: z.string().uuid().optional(),
    dokter_id: z.string().uuid().optional(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
    offset: z.number().int().min(0).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 100; const offset = data.offset ?? 0;
    let q = (context.supabase as Supa).from("klinik_visit")
      .select("*, apps_pasien(no_rm,nama,patient_type), fin_dokter(name)")
      .order("visit_date", { ascending: false }).range(offset, offset + limit - 1);
    if (data.date) {
      const next = new Date(data.date + "T00:00:00Z"); next.setUTCDate(next.getUTCDate() + 1);
      q = q.gte("visit_date", data.date + "T00:00:00").lt("visit_date", next.toISOString().slice(0,10) + "T00:00:00");
    }
    if (data.pasien_id) q = q.eq("pasien_id", data.pasien_id);
    if (data.dokter_id) q = q.eq("dokter_id", data.dokter_id);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const getVisitDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const { data: visit, error } = await sb.from("klinik_visit").select("*, apps_pasien(*), fin_dokter(id, code, name, spesialisasi, default_fee_pct, is_active, schedule_note)").eq("id", data.id).maybeSingle();
    if (error) throw error;
    const { data: medrec } = await sb.from("klinik_medical_record").select("*").eq("visit_id", data.id).maybeSingle();
    const { data: prescriptions } = await sb.from("klinik_prescription").select("*, klinik_prescription_item(*)").eq("visit_id", data.id);
    return { visit, medrec, prescriptions: prescriptions ?? [] };
  });

/* =============================================================
 * RESEP
 * ============================================================*/
const PresItemSchema = z.object({
  obat_id: z.string().uuid().optional().nullable(),
  obat_name: z.string().min(1),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  instruction: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.1),
  unit_price: z.coerce.number().min(0).default(0),
});

export const createPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    visit_id: z.string().uuid(),
    pasien_id: z.string().uuid(),
    dokter_id: z.string().uuid().optional().nullable(),
    notes: z.string().optional(),
    items: z.array(PresItemSchema).min(1, "Minimal 1 obat"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // Drug-interaction check (whitelist sederhana). Interaksi 'danger' menolak,
    // 'warning' hanya dicatat pada audit meta.
    const { checkInteractions } = await import("./drug-interactions");
    const hits = checkInteractions(data.items.map((it) => it.obat_name));
    const danger = hits.find((h) => h.severity === "danger");
    if (danger) {
      throw new Error(`Interaksi obat berbahaya: ${danger.drugs.join(" + ")} — ${danger.reason}`);
    }
    // Advisory pre-check stok (best-effort UX). Otoritas final ada di dispense: RPC
    // klinik_dispense_prescription_locked mengunci per-obat + FOR UPDATE, sehingga
    // race tidak dapat mengakibatkan stok negatif meski pre-check lolos.
    // Kita batch SELECT sekali agar tidak N+1.
    const obatIds = data.items.map((it) => it.obat_id).filter((v): v is string => !!v);
    if (obatIds.length) {
      const { data: stocks } = await sb.from("klinik_obat").select("id,stock,name").in("id", obatIds);
      const byId = new Map<string, { id: string; stock: number; name: string }>((stocks ?? []).map((r: { id: string; stock: number; name: string }) => [r.id, r]));
      for (const it of data.items) {
        if (!it.obat_id) continue;
        const ob = byId.get(it.obat_id);
        if (ob && Number(ob.stock) < Number(it.quantity)) {
          throw new Error(`Stok ${ob.name} tidak cukup (tersedia ${ob.stock}, dibutuhkan ${it.quantity})`);
        }
      }
    }
    const { data: pres, error } = await sb.from("klinik_prescription").insert({
      visit_id: data.visit_id, pasien_id: data.pasien_id, dokter_id: data.dokter_id, notes: data.notes, status: "sent_to_pharmacy",
    }).select("*").single();
    if (error) throw error;
    const items = data.items.map((it) => ({ ...it, prescription_id: pres.id }));
    const { error: ie } = await sb.from("klinik_prescription_item").insert(items);
    if (ie) throw ie;
    await appendAuditRow(sb, { actor_id: context.userId, module: "Resep", action: "create", target: pres.id, meta: { items: items.length, warnings: hits.filter((h) => h.severity === "warning") } });
    return pres;
  });

/** Periksa interaksi obat tanpa menyimpan — untuk UI preview sebelum submit. */
export const previewInteractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ names: z.array(z.string()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { checkInteractions } = await import("./drug-interactions");
    return checkInteractions(data.names);
  });

export const listPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
    offset: z.number().int().min(0).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 100; const offset = data.offset ?? 0;
    let q = (context.supabase as Supa).from("klinik_prescription")
      .select("*, apps_pasien(no_rm,nama,alergi), fin_dokter(name), klinik_prescription_item(*)")
      .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const dispensePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // Atomic dispense: RPC mengunci per-obat + FOR UPDATE + insert semua movement dalam 1 tx.
    const { error } = await sb.rpc("klinik_dispense_prescription_locked", { _id: data.id });
    if (error) throw new Error(error.message ?? "Gagal dispense resep");
    await appendAuditRow(sb, { actor_id: context.userId, module: "Farmasi", action: "dispense", target: data.id });
    return { ok: true };
  });


/* =============================================================
 * KASIR / INVOICE
 * ============================================================*/
export const listInvoiceForBilling = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().optional(), date: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = (context.supabase as Supa).from("fin_invoice").select("*").order("tanggal", { ascending: false }).limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.date) q = q.eq("tanggal", data.date);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const generateInvoiceFromVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    visit_id: z.string().uuid(),
    items: z.array(z.object({
      description: z.string(), quantity: z.coerce.number().min(0.1), unit_price: z.coerce.number().min(0),
      layanan_id: z.string().uuid().optional().nullable(),
    })).min(1),
    payment_method: z.enum(["cash","transfer","qris","debit","credit","insurance"]).default("cash"),
    paid_amount: z.coerce.number().min(0),
    discount: z.coerce.number().min(0).default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const { data: visit, error } = await sb.from("klinik_visit").select("*, apps_pasien(no_rm,nama,patient_code), fin_dokter(id,name)").eq("id", data.visit_id).maybeSingle();
    if (error || !visit) throw error ?? new Error("Visit tidak ditemukan");
    const patientCode = visit.apps_pasien?.no_rm ?? visit.apps_pasien?.patient_code;
    if (!patientCode) throw new Error("Pasien belum memiliki No. RM. Lengkapi registrasi sebelum menerbitkan invoice.");
    // Idempotent: bila invoice non-void untuk visit ini sudah ada (partial UNIQUE), kembalikan itu.
    const { data: existing } = await sb.from("fin_invoice").select("*").eq("source_visit_id", data.visit_id).neq("status", "void").maybeSingle();
    if (existing) return existing;
    const subtotal = data.items.reduce((a, b) => a + Number(b.quantity) * Number(b.unit_price), 0);
    const total = Math.max(0, subtotal - Number(data.discount));
    const status = data.paid_amount >= total ? "paid" : data.paid_amount > 0 ? "partial" : "unpaid";
    const now = new Date();
    let inv: any = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: invoice, error: ie } = await sb.from("fin_invoice").insert({
        no_invoice: clinicInvoiceNo(now), tanggal: now.toISOString().slice(0,10),
        source_visit_id: data.visit_id,
        patient_code: patientCode,
        patient_name: visit.apps_pasien?.nama, dokter_id: visit.dokter_id,
        subtotal, diskon: Number(data.discount) || 0, pajak: 0, total, status,
        catatan: `Visit ${data.visit_id} • ${data.payment_method} • Bayar ${data.paid_amount}`,
      }).select("*").single();
      if (!ie) { inv = invoice; break; }
      // Log observability (attempt, code, constraint) untuk membedakan collision no_invoice
      // (retryable) dari 23505 lain seperti source_visit_id (idempoten → race parallel).
      // eslint-disable-next-line no-console
      console.warn("[generateInvoiceFromVisit] insert failed", { attempt, code: ie.code, constraint: (ie as { details?: string }).details, message: ie.message });
      // 23505 pada source_visit_id → invoice sudah dibuat oleh request paralel
      if (ie.code === "23505") {
        const { data: race } = await sb.from("fin_invoice").select("*").eq("source_visit_id", data.visit_id).neq("status", "void").maybeSingle();
        if (race) return race;
      }
      if (ie.code !== "23505" || attempt === 2) throw ie;
    }
    if (!inv) throw new Error("Gagal membuat invoice unik");
    // items
    if (data.items.length) {
      const { error: itemError } = await sb.from("fin_invoice_item").insert(data.items.map((it) => ({
        invoice_id: inv.id, layanan_id: it.layanan_id ?? null,
        layanan_nama: it.description, qty: it.quantity, tarif: it.unit_price, subtotal: it.quantity * it.unit_price,
      })));
      if (itemError) {
        await sb.from("fin_invoice").delete().eq("id", inv.id);
        throw itemError;
      }
    }
    // update visit
    const payStatus = status === "paid" ? "paid" : status === "partial" ? "partial" : "unpaid";
    const visitStatus = status === "paid" ? "done" : "billing";
    await sb.from("klinik_visit").update({ payment_status: payStatus, status: visitStatus }).eq("id", data.visit_id);
    await appendAuditRow(sb, { actor_id: context.userId, module: "Kasir", action: "invoice", target: inv.id, meta: { total, status, payment_method: data.payment_method } });
    return inv;
  });

/* =============================================================
 * DASHBOARD STATS
 * ============================================================*/
export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const today = new Date().toISOString().slice(0, 10);
    const from = data.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = data.to ?? today;
    const monthStart = today.slice(0, 7) + "-01";

    const [pasienAll, pasienNew, visitToday, bookingToday, queueActive, invToday, invMonth, invUnpaid, presPending, obat] = await Promise.all([
      sb.from("apps_pasien").select("*", { count: "exact", head: true }).not("no_rm","is",null),
      sb.from("apps_pasien").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
      sb.from("klinik_visit").select("*", { count: "exact", head: true }).gte("visit_date", today + "T00:00:00").lt("visit_date", new Date(new Date(today+"T00:00:00Z").getTime()+86400000).toISOString().slice(0,10) + "T00:00:00"),
      sb.from("apps_booking").select("*", { count: "exact", head: true }).eq("tanggal", today),
      sb.from("klinik_queue").select("*", { count: "exact", head: true }).eq("queue_date", today).in("status", ["waiting","called","in_service"]),
      sb.from("fin_invoice").select("total.sum()").eq("tanggal", today).neq("status","void"),
      sb.from("fin_invoice").select("total.sum()").gte("tanggal", monthStart).neq("status","void"),
      sb.from("fin_invoice").select("*", { count: "exact", head: true }).in("status", ["unpaid","partial"]),
      sb.from("klinik_prescription").select("*", { count: "exact", head: true }).eq("status", "sent_to_pharmacy"),
      sb.from("klinik_obat").select("stock,min_stock,expired_date"),
    ]);

    const lowStock = (obat.data ?? []).filter((o: { stock: number; min_stock: number }) => Number(o.stock) <= Number(o.min_stock)).length;
    const nearExp = (obat.data ?? []).filter((o: { expired_date: string | null }) => o.expired_date && new Date(o.expired_date).getTime() < Date.now() + 60 * 86400000).length;

    // trend visits 30 days
    const toNextStr = new Date(new Date(to + "T00:00:00Z").getTime() + 86400000).toISOString().slice(0,10);
    const { data: visitRows } = await sb.from("klinik_visit").select("visit_date").gte("visit_date", from + "T00:00:00").lt("visit_date", toNextStr + "T00:00:00").limit(10000);
    const trendMap = new Map<string, number>();
    (visitRows ?? []).forEach((r: { visit_date: string }) => {
      const d = String(r.visit_date).slice(0, 10);
      trendMap.set(d, (trendMap.get(d) ?? 0) + 1);
    });
    const trend = Array.from(trendMap.entries()).sort().map(([date, visits]) => ({ date, visits }));

    // revenue monthly 12 (exclude void)
    const yearStart = new Date(); yearStart.setMonth(yearStart.getMonth() - 11); yearStart.setDate(1);
    const { data: invRows } = await sb.from("fin_invoice").select("tanggal,total,status").gte("tanggal", yearStart.toISOString().slice(0,10)).neq("status","void");
    const revMap = new Map<string, number>();
    (invRows ?? []).forEach((r: { tanggal: string; total: number }) => {
      const m = String(r.tanggal).slice(0, 7);
      revMap.set(m, (revMap.get(m) ?? 0) + Number(r.total ?? 0));
    });
    const revenue = Array.from(revMap.entries()).sort().map(([month, total]) => ({ month, total }));

    // payer mix
    const { data: payerRows } = await sb.from("apps_pasien").select("patient_type").not("no_rm","is",null);
    const payerMap = new Map<string, number>();
    (payerRows ?? []).forEach((r: { patient_type: string }) => payerMap.set(r.patient_type ?? "Umum", (payerMap.get(r.patient_type ?? "Umum") ?? 0) + 1));
    const payerMix = Array.from(payerMap.entries()).map(([name, value]) => ({ name, value }));

    return {
      kpi: {
        pasienAll: pasienAll.count ?? 0,
        pasienNew: pasienNew.count ?? 0,
        visitToday: visitToday.count ?? 0,
        bookingToday: bookingToday.count ?? 0,
        queueActive: queueActive.count ?? 0,
        revenueToday: Number((invToday.data?.[0] as { sum?: number } | undefined)?.sum ?? 0),
        revenueMonth: Number((invMonth.data?.[0] as { sum?: number } | undefined)?.sum ?? 0),
        invoiceUnpaid: invUnpaid.count ?? 0,
        prescriptionPending: presPending.count ?? 0,
        lowStock, nearExp,
      },
      trend, revenue, payerMix,
      from, to,
    };
  });

/* =============================================================
 * USER MANAGEMENT (super_admin only)
 * ============================================================*/
const ROLE_ENUM = z.enum(["super_admin","admin_klinik","dokter","perawat","perawat_optometri","pendaftaran","kasir","farmasi","manajemen","pasien"]);

async function assertAdmin(sb: Supa, uid: string) {
  const { data: ok } = await sb.rpc("klinik_is_admin", { _uid: uid });
  if (!ok) throw new Error("Hanya admin yang dapat melakukan aksi ini");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Supa;
    await assertAdmin(sb, context.userId);
    const { data: roles, error } = await sb.from("user_roles").select("user_id, role");
    if (error) throw error;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error: e2 } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (e2) throw e2;
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: { user_id: string; role: string }) => {
      const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr);
    });
    return (list?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) ?? (u.email ?? "").split("@")[0],
      roles: roleMap.get(u.id) ?? [],
      status: (u as { banned_until?: string | null }).banned_until ? "inactive" : "active",
      last_sign_in_at: u.last_sign_in_at ?? null,
      created_at: u.created_at,
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    role: ROLE_ENUM,
    grant: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    await assertAdmin(sb, context.userId);
    if (data.grant) {
      await sb.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await sb.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    }
    await appendAuditRow(sb, { actor_id: context.userId, module: "User", action: data.grant ? "grant_role" : "revoke_role", target: data.user_id, meta: { role: data.role } });
    return { ok: true };
  });

export const toggleUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    await assertAdmin(sb, context.userId);
    if (data.user_id === context.userId) throw new Error("Tidak dapat menonaktifkan akun sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, module: "User", action: data.active ? "activate_user" : "deactivate_user", target: data.user_id, meta: undefined });
    return { ok: true };
  });

export const addInvoicePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    invoice_id: z.string().uuid(),
    amount: z.coerce.number().positive(),
    method: z.enum(["cash","transfer","qris","debit","credit","insurance"]).default("cash"),
    bank: z.string().optional().nullable(),
    no_kartu_last4: z.string().max(4).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    // Anti-race: RPC mengunci invoice + revalidasi sisa dalam 1 tx (mencegah overpayment paralel).
    const { data: rpcRows, error } = await sb.rpc("klinik_add_invoice_payment_locked", {
      _invoice_id: data.invoice_id,
      _amount: data.amount,
      _method: data.method,
      _bank: data.bank ?? null,
      _no_kartu_last4: data.no_kartu_last4 ?? null,
    });
    if (error) throw new Error(error.message ?? "Gagal simpan pembayaran");
    const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    const newPaid = Number(row?.dibayar_baru ?? 0);
    const status = String(row?.status ?? "unpaid");
    await appendAuditRow(sb, { actor_id: context.userId, module: "Kasir", action: "add_payment", target: data.invoice_id, meta: { amount: data.amount, method: data.method, status } });
    return { ok: true, dibayar: newPaid, status };
  });


/* =============================================================
 * JADWAL DOKTER CRUD
 * ============================================================*/
const JadwalSchema = z.object({
  id: z.string().uuid().optional(),
  dokter_id: z.string().uuid().optional().nullable(),
  dokter_name: z.string().min(1),
  poli: z.string().min(1),
  day: z.enum(["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]),
  start_time: z.string().regex(/^\d{2}:\d{2}/, "Format HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}/, "Format HH:MM"),
  quota: z.coerce.number().int().min(0),
  is_active: z.boolean().default(true),
});

export const upsertJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => JadwalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    await assertAdmin(sb, context.userId);
    // Cek overlap via helper murni (boundary a.end==b.start dianggap tidak overlap).
    const { findScheduleOverlap } = await import("./klinik-invariants");
    const { data: clashRows, error: ce } = await sb
      .from("klinik_jadwal")
      .select("id,start_time,end_time,dokter_name,day,is_active")
      .eq("dokter_name", data.dokter_name)
      .eq("day", data.day);
    if (ce) throw ce;
    const clash = findScheduleOverlap(data, (clashRows ?? []) as never);
    if (clash) throw new Error(`Bentrok dengan jadwal ${data.dokter_name} hari ${data.day} (${clash.start_time}–${clash.end_time})`);
    const payload = { ...data, updated_at: new Date().toISOString() };
    const { data: row, error } = data.id
      ? await sb.from("klinik_jadwal").update(payload).eq("id", data.id).select("*").single()
      : await sb.from("klinik_jadwal").insert({ ...payload, booked: 0 }).select("*").single();
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, module: "Jadwal", action: data.id ? "update" : "create", target: row.id });
    return row;
  });


export const deleteJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    await assertAdmin(sb, context.userId);
    const { error } = await sb.from("klinik_jadwal").delete().eq("id", data.id);
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, module: "Jadwal", action: "delete", target: data.id });
    return { ok: true };
  });


export const listJadwal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Supa;
    const { data, error } = await sb
      .from("klinik_jadwal")
      .select("id,dokter_id,dokter_name,poli,day,start_time,end_time,quota,booked,is_active")
      .order("dokter_name");
    if (error) throw error;
    return (data ?? []) as unknown as Array<Record<string, string | number | boolean | null>>;
  });

export const listTindakan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as Supa;
    // Tindakan medis dirangkum dari baris invoice yang berasal dari visit klinis
    // (invoice status != void). Ini bukan sumber otoritatif klinis (untuk
    // itu gunakan klinik_medical_record), tetapi memberi daftar layanan yg
    // benar-benar dikerjakan & ditagih.
    const { data, error } = await sb
      .from("fin_invoice_item")
      .select("id,layanan_nama,tarif,qty,subtotal,created_at,invoice:fin_invoice!inner(no_invoice,tanggal,patient_name,status)")
      .neq("invoice.status", "void")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as unknown as Array<Record<string, string | number | boolean | null>>;
  });

const MASTER_TABLES = {
  dokter: "id,code,name,spesialisasi,sip_number,is_active",
  payer: "id,code,name,jenis,is_active",
  layanan: "id,code,name,kategori_id,tarif,is_active",
  kategori_layanan: "id,code,name,is_active",
  obat: "id,code,name,unit,stock,price,is_active",
  jadwal: "id,dokter_name,poli,day,start_time,end_time,quota,is_active",
} as const;
const MASTER_TABLE_MAP: Record<keyof typeof MASTER_TABLES, string> = {
  dokter: "fin_dokter", payer: "fin_payer", layanan: "fin_layanan",
  kategori_layanan: "fin_kategori_layanan", obat: "klinik_obat", jadwal: "klinik_jadwal",
};

export const listMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    key: z.enum(["dokter","payer","layanan","kategori_layanan","obat","jadwal"]),
    include_inactive: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const table = MASTER_TABLE_MAP[data.key];
    const cols = MASTER_TABLES[data.key];
    let q = sb.from(table).select(cols).limit(500);
    // Default: sembunyikan obat non-aktif dari dropdown resep, kecuali diminta eksplisit.
    if (data.key === "obat" && !data.include_inactive) q = q.eq("is_active", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as unknown as Array<Record<string, string | number | boolean | null>>;
  });

/* =============================================================
 * TEMPLATE PEMERIKSAAN — master klinis
 * ============================================================*/
export const listPemeriksaanTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ include_inactive: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    let q = sb.from("klinik_template_pemeriksaan" as never).select("*").order("label");
    if (!data.include_inactive) q = q.eq("is_active", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as unknown as Array<{ id: string; code: string; label: string; diagnosis: string; icd10_code: string | null; treatment: string | null; is_active: boolean }>;
  });

export const upsertPemeriksaanTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(1),
    label: z.string().min(1),
    diagnosis: z.string().min(1),
    icd10_code: z.string().optional().nullable(),
    treatment: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    const payload = { ...data, created_by: context.userId };
    const { error } = data.id
      ? await sb.from("klinik_template_pemeriksaan" as never).update(payload).eq("id", data.id)
      : await sb.from("klinik_template_pemeriksaan" as never).insert(payload);
    if (error) throw error;
    return { ok: true };
  });

/* =============================================================
 * REKAM MEDIS — AUDIT/VERSIONING
 * ============================================================*/
export const listMedicalRecordHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    visit_id: z.string().uuid().optional(),
    medical_record_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    let q = sb.from("klinik_medical_record_history")
      .select("id, medical_record_id, visit_id, changed_by, changed_at, action, snapshot")
      .order("changed_at", { ascending: false }).limit(50);
    if (data.visit_id) q = q.eq("visit_id", data.visit_id);
    if (data.medical_record_id) q = q.eq("medical_record_id", data.medical_record_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/* =============================================================
 * USER — RESET PASSWORD (admin only)
 * ============================================================*/
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    new_password: z.string().min(8, "Password minimal 8 karakter"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as Supa;
    await assertAdmin(sb, context.userId);
    if (data.user_id === context.userId) throw new Error("Gunakan menu profil untuk mengubah password sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.new_password });
    if (error) throw error;
    await appendAuditRow(sb, { actor_id: context.userId, module: "User", action: "reset_password", target: data.user_id });
    return { ok: true };
  });
