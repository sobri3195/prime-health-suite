import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ===== Roles =====
export type AppRole = "super_admin" | "admin_klinik" | "dokter" | "perawat" | "perawat_optometri" | "pendaftaran" | "kasir" | "farmasi" | "manajemen" | "pasien";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppRole[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.role as AppRole);
  });

// ===== Settings =====
export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clinic_setting")
      .select("key,value,updated_at");
    if (error) throw error;
    const out: Record<string, Record<string, unknown>> = {};
    (data ?? []).forEach((r: { key: string; value: unknown }) => {
      out[r.key] = (r.value ?? {}) as Record<string, unknown>;
    });
    return out as Record<string, Record<string, string | number | boolean>>;
  });

const SaveSettingSchema = z.object({
  key: z.enum(["profile", "notif", "security", "integrations"]),
  value: z.record(z.string(), z.any()),
});

export const saveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSettingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("clinic_setting")
      .upsert({ key: data.key, value: data.value, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    await appendAuditRow(supabase, {
      actor_id: userId,
      actor_email: context.claims?.email as string | undefined,
      module: "Settings",
      action: "save",
      target: data.key,
      meta: data.value,
    });
    return { ok: true };
  });

// ===== Audit =====
const AppendAuditSchema = z.object({
  module: z.string().min(1).max(64),
  action: z.string().min(1).max(64),
  target: z.string().max(256).optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupaClient = any;

export async function appendAuditRow(
  supabase: SupaClient,
  row: {
    actor_id?: string;
    actor_email?: string;
    actor_role?: string;
    module: string;
    action: string;
    target?: string;
    meta?: Record<string, unknown>;
  },
) {
  await supabase.from("clinic_audit_log").insert({
    actor_id: row.actor_id ?? null,
    actor_email: row.actor_email ?? null,
    actor_role: row.actor_role ?? null,
    module: row.module,
    action: row.action,
    target: row.target ?? null,
    meta: row.meta ?? null,
  });
}

export const appendAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AppendAuditSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    await appendAuditRow(supabase as unknown as SupaClient, {
      actor_id: userId,
      actor_email: claims?.email as string | undefined,
      module: data.module,
      action: data.action,
      target: data.target,
      meta: data.meta,
    });
    return { ok: true };
  });

const ListAuditSchema = z.object({
  q: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  actor: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().min(1).max(500).optional(),
});

export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListAuditSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("clinic_audit_log").select("*").order("ts", { ascending: false }).limit(data.limit ?? 200);
    if (data.module) q = q.eq("module", data.module);
    if (data.action) q = q.eq("action", data.action);
    if (data.actor) q = q.ilike("actor_email", `%${data.actor}%`);
    if (data.from) q = q.gte("ts", data.from);
    if (data.to) q = q.lte("ts", data.to);
    if (data.q) q = q.or(`target.ilike.%${data.q}%,actor_email.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// ===== Documents =====
const ListDocSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListDocSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const pageSize = Math.min(Math.max(Number((data as any).pageSize ?? 50), 1), 200);
    const page = Math.max(Number((data as any).page ?? 0), 0);
    const fromIdx = page * pageSize;
    const toIdx = fromIdx + pageSize - 1;
    let q = context.supabase.from("clinic_document").select("*", { count: "exact" }).order("uploaded_at", { ascending: false }).range(fromIdx, toIdx);
    if (data.type) q = q.eq("doc_type", data.type);
    if (data.from) q = q.gte("uploaded_at", data.from);
    if (data.to) q = q.lte("uploaded_at", data.to);
    if (data.q) q = q.or(`title.ilike.%${data.q}%,patient_code.ilike.%${data.q}%,patient_name.ilike.%${data.q}%`);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });

const UploadDocSchema = z.object({
  patient_code: z.string().min(1).max(64),
  patient_name: z.string().min(1).max(200),
  doc_type: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  mime: z.enum(["pdf", "image", "zip"]).default("pdf"),
  size_bytes: z.number().int().min(0).default(0),
  storage_path: z.string().max(512).optional(),
});

export const uploadDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadDocSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = claims?.email as string | undefined;
    const { data: row, error } = await supabase.from("clinic_document").insert({
      ...data,
      uploaded_by: userId,
      uploaded_by_email: email,
    }).select("*").single();
    if (error) throw error;
    await appendAuditRow(supabase as unknown as SupaClient, {
      actor_id: userId, actor_email: email,
      module: "Dokumen", action: "upload",
      target: row.id, meta: { title: data.title, patient_code: data.patient_code },
    });
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { error } = await supabase.from("clinic_document").delete().eq("id", data.id);
    if (error) throw error;
    await appendAuditRow(supabase as unknown as SupaClient, {
      actor_id: userId, actor_email: claims?.email as string | undefined,
      module: "Dokumen", action: "delete", target: data.id,
    });
    return { ok: true };
  });

// ===== Laporan aggregates =====
const LaporanSchema = z.object({
  kind: z.enum(["kunjungan", "tindakan", "payer", "pendapatan", "top_tindakan", "doctor_monthly", "occupancy"]),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LaporanSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const from = data.from ?? new Date(Date.now() - 30 * 864e5).toISOString();
    const to = data.to ?? new Date().toISOString();

    const { data: invoices, error } = await supabase
      .from("fin_invoice").select("id, tanggal, total, patient_code, patient_name, payer_id")
      .gte("tanggal", from.slice(0, 10)).lte("tanggal", to.slice(0, 10));
    if (error) throw error;
    const { data: bookings } = await supabase
      .from("apps_booking").select("id, tanggal, dokter_nama, status")
      .gte("tanggal", from.slice(0, 10)).lte("tanggal", to.slice(0, 10));

    // Kunjungan bulanan (dari klinik_visit lebih akurat, fallback ke bookings)
    const trendMap = new Map<string, number>();
    (bookings ?? []).forEach((b) => {
      const m = (b.tanggal as string).slice(0, 7);
      trendMap.set(m, (trendMap.get(m) ?? 0) + 1);
    });
    const trend = Array.from(trendMap.entries()).sort().map(([month, visits]) => ({ month, visits }));

    // Beban dokter (total)
    const docMap = new Map<string, number>();
    (bookings ?? []).forEach((b) => docMap.set(b.dokter_nama as string, (docMap.get(b.dokter_nama as string) ?? 0) + 1));
    const doctors = Array.from(docMap.entries()).map(([doctor, count]) => ({ doctor, count }));

    // Distribusi penjamin
    const payerIds = Array.from(new Set((invoices ?? []).map((i: { payer_id: string | null }) => i.payer_id).filter(Boolean) as string[]));
    const payerNames = new Map<string, string>();
    if (payerIds.length) {
      const { data: payersRows } = await supabase.from("fin_payer").select("id,name").in("id", payerIds);
      (payersRows ?? []).forEach((p: { id: string; name: string }) => payerNames.set(p.id, p.name));
    }
    const payerAgg = new Map<string, { count: number; revenue: number }>();
    (invoices ?? []).forEach((i: { payer_id: string | null; total: number }) => {
      const name = i.payer_id ? (payerNames.get(i.payer_id) ?? "Lainnya") : "Umum";
      const cur = payerAgg.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1; cur.revenue += Number(i.total ?? 0);
      payerAgg.set(name, cur);
    });
    const payers = Array.from(payerAgg.entries()).map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }));

    // Top 10 tindakan — filter berdasarkan tanggal invoice (bukan created_at item)
    const invoiceIds = (invoices ?? []).map((i: { id: string }) => i.id);
    const { data: items } = invoiceIds.length
      ? await supabase
          .from("fin_invoice_item").select("layanan_nama, qty, subtotal, invoice_id")
          .in("invoice_id", invoiceIds).limit(5000)
      : { data: [] as Array<{ layanan_nama: string | null; qty: number; subtotal: number }> };
    const tindakanMap = new Map<string, { count: number; revenue: number }>();
    (items ?? []).forEach((it: { layanan_nama: string | null; qty: number; subtotal: number }) => {
      const name = it.layanan_nama ?? "Lainnya";
      const cur = tindakanMap.get(name) ?? { count: 0, revenue: 0 };
      cur.count += Number(it.qty ?? 0); cur.revenue += Number(it.subtotal ?? 0);
      tindakanMap.set(name, cur);
    });
    const topTindakan = Array.from(tindakanMap.entries())
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    // Kunjungan per dokter per bulan
    const dmMap = new Map<string, number>();
    (bookings ?? []).forEach((b) => {
      const key = `${(b.tanggal as string).slice(0, 7)}|${b.dokter_nama}`;
      dmMap.set(key, (dmMap.get(key) ?? 0) + 1);
    });
    const doctorMonthly = Array.from(dmMap.entries()).map(([k, v]) => {
      const [month, doctor] = k.split("|");
      return { month, doctor, count: v };
    }).sort((a, b) => a.month.localeCompare(b.month));

    // Occupancy rate: booked / quota dari klinik_jadwal aktif
    const { data: jadwal } = await supabase.from("klinik_jadwal")
      .select("dokter_name, day, quota, booked, is_active").eq("is_active", true);
    const quotaSum = (jadwal ?? []).reduce((a, j: { quota: number }) => a + Number(j.quota ?? 0), 0);
    const bookedSum = (jadwal ?? []).reduce((a, j: { booked: number }) => a + Number(j.booked ?? 0), 0);
    const occupancyByDoctor = Array.from(
      (jadwal ?? []).reduce((m: Map<string, { quota: number; booked: number }>, j: { dokter_name: string; quota: number; booked: number }) => {
        const cur = m.get(j.dokter_name) ?? { quota: 0, booked: 0 };
        cur.quota += Number(j.quota ?? 0); cur.booked += Number(j.booked ?? 0);
        m.set(j.dokter_name, cur); return m;
      }, new Map()).entries()
    ).map(([doctor, v]) => ({ doctor, quota: v.quota, booked: v.booked, rate: v.quota > 0 ? Math.round((v.booked / v.quota) * 100) : 0 }));

    const totalRevenue = (invoices ?? []).reduce((a, b) => a + Number(b.total ?? 0), 0);
    return {
      kind: data.kind,
      from, to,
      totals: {
        visits: (bookings ?? []).length,
        invoices: (invoices ?? []).length,
        revenue: totalRevenue,
        occupancyOverall: quotaSum > 0 ? Math.round((bookedSum / quotaSum) * 100) : 0,
      },
      trend, doctors, payers,
      topTindakan, doctorMonthly, occupancy: occupancyByDoctor,
      invoices: invoices ?? [],
    };
  });

