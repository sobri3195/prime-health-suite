import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProfileUpdate = z.object({
  nama: z.string().min(1).max(120),
  nik: z.string().max(32).nullable().optional(),
  tgl_lahir: z.string().nullable().optional(),
  jenis_kelamin: z.enum(["L", "P"]).nullable().optional(),
  telp: z.string().max(40).nullable().optional(),
  alamat: z.string().max(500).nullable().optional(),
  no_bpjs: z.string().max(40).nullable().optional(),
  alergi: z.string().max(500).nullable().optional(),
  kontak_darurat: z.string().max(120).nullable().optional(),
  foto_url: z.string().url().max(500).nullable().optional(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("apps_pasien")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileUpdate.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      user_id: userId,
      nama: data.nama,
      nik: data.nik || null,
      tgl_lahir: data.tgl_lahir || null,
      jenis_kelamin: data.jenis_kelamin || null,
      telp: data.telp || null,
      alamat: data.alamat || null,
      no_bpjs: data.no_bpjs || null,
      alergi: data.alergi || null,
      kontak_darurat: data.kontak_darurat || null,
      foto_url: data.foto_url || null,
    };
    // Upsert so first-time profile save creates the row (avoids PGRST116).
    const { data: row, error } = await supabase
      .from("apps_pasien")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: row };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = data.offset;
    const to = data.offset + data.limit - 1;
    const { data: rows, error, count } = await supabase
      .from("apps_booking")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("tanggal", { ascending: false })
      .order("jam_slot", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { bookings: rows ?? [], total: count ?? 0, limit: data.limit, offset: data.offset };
  });

const CreateBookingInput = z.object({
  dokter_id: z.string().uuid(),
  dokter_nama: z.string().min(1),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jam_slot: z.string().regex(/^\d{2}:\d{2}$/),
  keluhan: z.string().max(500).optional(),
});

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateBookingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (data.tanggal < today) throw new Error("Tanggal booking tidak boleh di masa lalu");
    // Cutoff jam praktik: bila booking untuk hari ini, slot harus setidaknya
    // 30 menit dari sekarang (waktu lokal WIB, offset +7).
    if (data.tanggal === today) {
      const wib = new Date(now.getTime() + 7 * 3600 * 1000);
      const cutoff = new Date(wib.getTime() + 30 * 60 * 1000);
      const [h, m] = data.jam_slot.split(":").map(Number);
      const slotMin = h * 60 + m;
      const cutoffMin = cutoff.getUTCHours() * 60 + cutoff.getUTCMinutes();
      if (slotMin < cutoffMin) throw new Error("Slot sudah lewat. Pilih jam berikutnya atau tanggal lain.");
    }

    // Resolve patient row (auto-created by handle_new_apps_user trigger).
    const { data: pas } = await supabase
      .from("apps_pasien").select("id").eq("user_id", userId).maybeSingle();

    const { data: row, error } = await supabase
      .from("apps_booking")
      .insert({
        user_id: userId,
        pasien_id: pas?.id ?? null,
        dokter_id: data.dokter_id,
        dokter_nama: data.dokter_nama,
        tanggal: data.tanggal,
        jam_slot: data.jam_slot,
        keluhan: data.keluhan ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Slot ini sudah diambil pasien lain. Pilih slot lain.");
      throw new Error(error.message);
    }
    return { booking: row };
  });

const RescheduleInput = z.object({
  id: z.string().uuid(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jam_slot: z.string().regex(/^\d{2}:\d{2}$/),
});
export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RescheduleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("apps_reschedule_booking_locked", {
      _id: data.id, _tanggal: data.tanggal, _jam_slot: data.jam_slot,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Booking tidak ditemukan atau sudah selesai");
    return { booking: row };
  });

const CancelInput = z.object({
  id: z.string().uuid(),
  alasan: z.string().trim().max(500).optional(),
});
export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("apps_booking")
      .update({ status: "cancelled", cancel_reason: data.alasan ?? null })
      .eq("id", data.id)
      .eq("user_id", userId)
      .in("status", ["pending", "confirmed"])
      .select("id, tanggal, jam_slot, dokter_nama");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error("Booking tidak bisa dibatalkan karena sudah check-in / dipanggil / selesai.");
    }
    const b = rows[0] as { tanggal: string; jam_slot: string; dokter_nama: string | null };
    // Reminder dikirim H-1 (lihat apps_send_booking_reminders). Batasi hapus ke jendela
    // [tanggal-2, tanggal] dan cocokkan dokter+jam agar tidak menghapus notif booking lain.
    const from = new Date(b.tanggal); from.setUTCDate(from.getUTCDate() - 2);
    const to = new Date(b.tanggal); to.setUTCDate(to.getUTCDate() + 1);
    let del = supabase
      .from("apps_notif")
      .delete()
      .eq("user_id", userId)
      .eq("type", "reminder")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString())
      .like("body", `%pukul ${b.jam_slot}%`);
    if (b.dokter_nama) del = del.like("body", `%${b.dokter_nama}%`);
    await del;
    return { ok: true };
  });


export const getMyQueueToday = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("apps_booking")
      .select("*")
      .eq("user_id", userId)
      .eq("tanggal", today)
      .in("status", ["pending", "confirmed", "checked_in"])
      .order("jam_slot", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let posisi: number | null = null;
    let total: number | null = null;
    if (data) {
      const { data: pos } = await supabase.rpc("apps_queue_position", { _booking_id: data.id });
      if (pos && pos.length) {
        posisi = (pos[0] as { posisi: number }).posisi;
        total = (pos[0] as { total: number }).total;
      }
    }
    const { data: setting } = await supabase
      .from("clinic_setting").select("value").eq("key", "slot_menit_default").maybeSingle();
    const raw = setting?.value as unknown;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    const slot_menit = Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
    return { queue: data, posisi, total, slot_menit };

  });

const PageInput = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PageInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await supabase
      .from("fin_invoice")
      .select("id, no_invoice, tanggal, total, status, catatan, fin_invoice_item(layanan_nama, qty, tarif, subtotal)", { count: "exact" })
      .eq("apps_user_id", userId)
      .order("tanggal", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { invoices: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });


export const listDoctorsForBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // Uses SECURITY DEFINER RPC that exposes only safe directory columns
    // (id, code, name, spesialisasi, schedule_note). Sensitive columns like
    // npwp / phone / sip_number / is_ptkp_k0 are not readable by patients.
    const { data, error } = await supabase.rpc("apps_list_doctors");
    if (error) throw new Error(error.message);
    return { doctors: (data ?? []) as Array<{ id: string; code: string | null; name: string; spesialisasi: string | null; schedule_note: string | null }> };
  });

const SlotInput = z.object({
  dokter_id: z.string().uuid(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listAvailableSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SlotInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: taken, error } = await supabase.rpc("apps_slot_terisi_for", {
      _dokter_id: data.dokter_id,
      _tanggal: data.tanggal,
    });
    if (error) throw new Error(error.message);
    const takenSet = new Set((taken ?? []).map((r: { jam_slot: string }) => r.jam_slot));

    // Read the doctor's schedule for the requested weekday. klinik_jadwal is
    // staff-RLS, so use the admin client to expose only start/end windows.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const [y, mo, d] = data.tanggal.split("-").map(Number);
    const weekday = DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];

    const { data: jadwal, error: jErr } = await supabaseAdmin
      .from("klinik_jadwal")
      .select("start_time, end_time, is_active")
      .eq("dokter_id", data.dokter_id)
      .eq("day", weekday)
      .eq("is_active", true);
    if (jErr) throw new Error(jErr.message);

    const toMin = (t: string) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    // If tanggal === hari ini (WIB), buang slot yang <= (sekarang + 30 menit)
    // supaya UI tidak menawarkan slot yang akan langsung ditolak oleh
    // createBooking cutoff.
    const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
    const todayWib = nowWib.toISOString().slice(0, 10);
    const cutoffMin = data.tanggal === todayWib
      ? nowWib.getUTCHours() * 60 + nowWib.getUTCMinutes() + 30
      : -1;

    const slotSet = new Set<string>();
    for (const j of jadwal ?? []) {
      const start = toMin(j.start_time);
      const end = toMin(j.end_time);
      for (let t = start; t + 30 <= end; t += 30) {
        if (t >= cutoffMin) slotSet.add(fmt(t));
      }
    }
    const slots = Array.from(slotSet).sort();

    return {
      slots: slots.map((s) => ({ jam: s, available: !takenSet.has(s) })),
    };
  });


/* ------------ Notifikasi ------------ */

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page: z.number().int().min(1).max(1000).default(1),
      pageSize: z.number().int().min(1).max(100).default(30),
    }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const [{ data: rows, error, count }, { count: unread, error: unreadErr }] = await Promise.all([
      supabase.from("apps_notif").select("*", { count: "exact" })
        .eq("user_id", userId).order("created_at", { ascending: false }).range(from, to),
      supabase.from("apps_notif").select("id", { count: "exact", head: true })
        .eq("user_id", userId).is("read_at", null),
    ]);
    if (error) throw new Error(error.message);
    if (unreadErr) throw new Error(unreadErr.message);
    return { notifs: rows ?? [], unread: unread ?? 0, total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const markNotifRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("apps_notif")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotifRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("apps_notif")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("apps_notif")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
