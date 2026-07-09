import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Helpers ----------
async function getOrCreateMyEmployee(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  claims: Record<string, unknown> | undefined,
) {
  const { data: existing } = await supabase
    .from("hr_employee").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;
  const nama =
    (claims?.full_name as string) ||
    (claims?.name as string) ||
    (claims?.email as string)?.split("@")[0] ||
    "Karyawan";
  const { data, error } = await supabase
    .from("hr_employee")
    .insert({ user_id: userId, nama })
    .select("*").single();
  if (error) throw error;
  return data;
}

function calcTarifPerJam(gajiPokok: number, override?: number | null): number {
  if (override && override > 0) return Number(override);
  // Depnaker baseline: gaji_pokok / 173 * 1.5 (jam pertama)
  if (!gajiPokok || gajiPokok <= 0) return 0;
  return Number(((gajiPokok / 173) * 1.5).toFixed(2));
}

// ---------- Shift ----------
export const listShift = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hr_shift").select("*").eq("is_active", true).order("jam_mulai");
    if (error) throw error;
    return data ?? [];
  });

// ---------- Employee ----------
export const getMyEmployee = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const emp = await getOrCreateMyEmployee(context.supabase, context.userId, context.claims);
    return emp;
  });

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hr_employee").select("*").eq("is_active", true).order("nama");
    if (error) throw error;
    return data ?? [];
  });

// ---------- Attendance ----------
const RangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().min(1).max(500).optional(),
});

export const listMyAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const emp = await getOrCreateMyEmployee(context.supabase, context.userId, context.claims);
    let q = context.supabase.from("hr_attendance").select("*")
      .eq("employee_id", emp.id).order("tanggal", { ascending: false }).limit(data.limit ?? 200);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const ClockSchema = z.object({ shift_id: z.string().uuid().optional() });

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClockSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const emp = await getOrCreateMyEmployee(context.supabase, context.userId, context.claims);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    // pick shift
    let shift_id = data.shift_id ?? emp.shift_default_id ?? null;
    if (!shift_id) {
      const { data: shifts } = await context.supabase
        .from("hr_shift").select("*").eq("is_active", true).order("jam_mulai");
      shift_id = shifts?.[0]?.id ?? null;
    }
    // upsert
    const { data: existing } = await context.supabase
      .from("hr_attendance").select("*")
      .eq("employee_id", emp.id).eq("tanggal", today).maybeSingle();
    if (existing?.clock_in) {
      return { ok: true, row: existing, message: "Sudah clock-in hari ini." };
    }
    let row;
    if (existing) {
      const { data: upd, error } = await context.supabase.from("hr_attendance")
        .update({ clock_in: now, shift_id }).eq("id", existing.id).select("*").single();
      if (error) throw error; row = upd;
    } else {
      const { data: ins, error } = await context.supabase.from("hr_attendance")
        .insert({ employee_id: emp.id, tanggal: today, clock_in: now, shift_id, status: "hadir" })
        .select("*").single();
      if (error) throw error; row = ins;
    }
    return { ok: true, row };
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const emp = await getOrCreateMyEmployee(context.supabase, context.userId, context.claims);
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing, error: eErr } = await context.supabase
      .from("hr_attendance").select("*")
      .eq("employee_id", emp.id).eq("tanggal", today).maybeSingle();
    if (eErr) throw eErr;
    if (!existing?.clock_in) {
      throw new Error("Belum clock-in hari ini.");
    }
    const now = new Date();
    const inTs = new Date(existing.clock_in as string);
    const totalJam = Math.max(0, +(((now.getTime() - inTs.getTime()) / 3_600_000)).toFixed(2));
    const { data, error } = await context.supabase.from("hr_attendance")
      .update({ clock_out: now.toISOString(), total_jam_kerja: totalJam })
      .eq("id", existing.id).select("*").single();
    if (error) throw error;
    return { ok: true, row: data };
  });

// ---------- Overtime ----------
const OvertimeRequestSchema = z.object({
  tanggal: z.string().min(10),
  jam_mulai: z.string().min(5),
  jam_selesai: z.string().min(5),
  durasi_jam: z.number().min(0.25).max(12),
  alasan: z.string().max(500).optional(),
  mode: z.enum(["uang", "jam"]),
  attendance_id: z.string().uuid().optional(),
});

export const listMyOvertime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const emp = await getOrCreateMyEmployee(context.supabase, context.userId, context.claims);
    let q = context.supabase.from("hr_overtime").select("*")
      .eq("employee_id", emp.id).order("tanggal", { ascending: false }).limit(data.limit ?? 200);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const listPendingOvertime = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS akan memfilter — super_admin lihat semua, lainnya nihil
    const { data, error } = await context.supabase.from("hr_overtime")
      .select("*, hr_employee(nama,jabatan)")
      .eq("status", "pending").order("tanggal", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const requestOvertime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OvertimeRequestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const emp = await getOrCreateMyEmployee(context.supabase, context.userId, context.claims);
    const tarif = calcTarifPerJam(Number(emp.gaji_pokok ?? 0), emp.tarif_lembur_per_jam);
    const nominal = data.mode === "uang" ? +(tarif * data.durasi_jam).toFixed(2) : null;
    const { data: row, error } = await context.supabase.from("hr_overtime").insert({
      employee_id: emp.id,
      attendance_id: data.attendance_id ?? null,
      tanggal: data.tanggal,
      jam_mulai: data.jam_mulai,
      jam_selesai: data.jam_selesai,
      durasi_jam: data.durasi_jam,
      alasan: data.alasan ?? null,
      mode: data.mode,
      tarif_per_jam: data.mode === "uang" ? tarif : null,
      nominal,
      status: "pending",
    }).select("*").single();
    if (error) throw error;
    return row;
  });

const ApproveSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional(),
});

export const approveOvertime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // RLS hanya izinkan super_admin update milik orang lain
    const { data: ot, error: getErr } = await supabase.from("hr_overtime")
      .select("*").eq("id", data.id).single();
    if (getErr) throw getErr;
    if (ot.status !== "pending") throw new Error("Pengajuan sudah diproses.");
    // Cegah self-approval: pengaju tidak boleh menyetujui/menolak pengajuannya sendiri.
    const { data: emp } = await supabase.from("hr_employee")
      .select("user_id").eq("id", ot.employee_id).maybeSingle();
    if (emp?.user_id && emp.user_id === userId) {
      throw new Error("Anda tidak dapat menyetujui pengajuan lembur Anda sendiri.");
    }

    const { data: updated, error } = await supabase.from("hr_overtime")
      .update({
        status: data.decision,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        approval_note: data.note ?? null,
      }).eq("id", data.id).select("*").single();
    if (error) throw error;

    // jika mode=jam dan disetujui → tambah saldo jam karyawan
    if (data.decision === "approved" && ot.mode === "jam") {
      const { data: emp } = await supabase.from("hr_employee")
        .select("saldo_jam_lembur").eq("id", ot.employee_id).single();
      const newSaldo = Number(emp?.saldo_jam_lembur ?? 0) + Number(ot.durasi_jam);
      await supabase.from("hr_employee")
        .update({ saldo_jam_lembur: newSaldo }).eq("id", ot.employee_id);
    }
    return updated;
  });
