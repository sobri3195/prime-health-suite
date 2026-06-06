import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProfileUpdate = z.object({
  nama: z.string().min(1).max(120),
  tgl_lahir: z.string().nullable().optional(),
  jenis_kelamin: z.enum(["L", "P"]).nullable().optional(),
  telp: z.string().max(40).nullable().optional(),
  alamat: z.string().max(500).nullable().optional(),
  no_bpjs: z.string().max(40).nullable().optional(),
  alergi: z.string().max(500).nullable().optional(),
  kontak_darurat: z.string().max(120).nullable().optional(),
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
        tgl_lahir: data.tgl_lahir || null,
        jenis_kelamin: data.jenis_kelamin || null,
        telp: data.telp || null,
        alamat: data.alamat || null,
        no_bpjs: data.no_bpjs || null,
        alergi: data.alergi || null,
        kontak_darurat: data.kontak_darurat || null,
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { profile: row };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("apps_booking")
      .select("*")
      .eq("user_id", userId)
      .order("tanggal", { ascending: false })
      .order("jam_slot", { ascending: false });
    if (error) throw new Error(error.message);
    return { bookings: data ?? [] };
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

    const { data: row, error } = await supabase
      .from("apps_booking")
      .insert({
        user_id: userId,
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

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("apps_booking")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
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
    return { queue: data };
  });

export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("fin_invoice")
      .select("id, no_invoice, tanggal, total, status, fin_invoice_item(layanan_nama, qty, tarif, subtotal)")
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
    const { data, error } = await supabase
      .from("fin_dokter")
      .select("id, code, name, spesialisasi")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { doctors: data ?? [] };
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

    // 09:00–17:00 every 30 minutes, exclude 12:00 & 12:30 (istirahat)
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
