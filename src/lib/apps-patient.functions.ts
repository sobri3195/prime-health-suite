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
    const { data: row, error } = await supabase
      .from("apps_pasien")
      .update({
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
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { profile: row };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; offset?: number } = {}) => ({
    limit: Math.min(Math.max(Number(d.limit ?? 50), 1), 200),
    offset: Math.max(Number(d.offset ?? 0), 0),
  }))
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
    const today = new Date().toISOString().slice(0, 10);
    if (data.tanggal < today) throw new Error("Tanggal booking tidak boleh di masa lalu");

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
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    if (data.tanggal < today) throw new Error("Tanggal baru tidak boleh di masa lalu");
    const { data: row, error } = await supabase
      .from("apps_booking")
      .update({ tanggal: data.tanggal, jam_slot: data.jam_slot, status: "pending" })
      .eq("id", data.id)
      .eq("user_id", userId)
      .in("status", ["pending", "confirmed"])
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === "23505") throw new Error("Slot baru sudah diambil. Pilih slot lain.");
      throw new Error(error.message);
    }
    if (!row) throw new Error("Booking tidak ditemukan atau sudah selesai");
    return { booking: row };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("apps_booking")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", userId)
      .in("status", ["pending", "confirmed"])
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error("Booking tidak bisa dibatalkan karena sudah check-in / dipanggil / selesai.");
    }
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
    return { queue: data, posisi, total };
  });

export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fin_invoice")
      .select("id, no_invoice, tanggal, total, status, catatan, fin_invoice_item(layanan_nama, qty, tarif, subtotal)")
      .eq("apps_user_id", userId)
      .order("tanggal", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { invoices: data ?? [] };
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

    const slots: string[] = [];
    for (let h = 9; h < 17; h++) {
      for (const m of [0, 30]) {
        if (h === 12) continue;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return {
      slots: slots.map((s) => ({ jam: s, available: !takenSet.has(s) })),
    };
  });

/* ------------ Notifikasi ------------ */

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("apps_notif")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const unread = (data ?? []).filter((n) => !n.read_at).length;
    return { notifs: data ?? [], unread };
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
