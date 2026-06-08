import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateRunSchema = z.object({
  periode_bulan: z.number().int().min(1).max(12),
  periode_tahun: z.number().int().min(2024).max(2100),
});

export const listPayrollRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hr_payroll_run").select("*")
      .order("periode_tahun", { ascending: false })
      .order("periode_bulan", { ascending: false }).limit(60);
    if (error) throw error;
    return data ?? [];
  });

export const getPayrollDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: run, error: rErr } = await context.supabase
      .from("hr_payroll_run").select("*").eq("id", data.id).single();
    if (rErr) throw rErr;
    const { data: items, error: iErr } = await context.supabase
      .from("hr_payroll_item").select("*")
      .eq("payroll_run_id", data.id).order("nama_snapshot");
    if (iErr) throw iErr;
    return { run, items: items ?? [] };
  });

export const createPayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateRunSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // periode range
    const start = new Date(data.periode_tahun, data.periode_bulan - 1, 1);
    const end = new Date(data.periode_tahun, data.periode_bulan, 0);
    const fromStr = start.toISOString().slice(0, 10);
    const toStr = end.toISOString().slice(0, 10);

    // ensure no duplicate
    const { data: existing } = await supabase.from("hr_payroll_run")
      .select("id").eq("periode_bulan", data.periode_bulan)
      .eq("periode_tahun", data.periode_tahun).maybeSingle();
    if (existing) throw new Error("Payroll periode ini sudah ada.");

    // create run header
    const { data: run, error: rErr } = await supabase.from("hr_payroll_run").insert({
      periode_bulan: data.periode_bulan,
      periode_tahun: data.periode_tahun,
      dibuat_oleh: userId,
      status: "draft",
    }).select("*").single();
    if (rErr) throw rErr;

    // fetch employees
    const { data: emps, error: eErr } = await supabase.from("hr_employee")
      .select("id,nama,gaji_pokok").eq("is_active", true);
    if (eErr) throw eErr;

    // fetch approved overtime (mode uang, belum ada run) untuk periode
    const { data: ots } = await supabase.from("hr_overtime")
      .select("id,employee_id,durasi_jam,nominal")
      .eq("status", "approved").eq("mode", "uang")
      .is("payroll_run_id", null)
      .gte("tanggal", fromStr).lte("tanggal", toStr);

    const byEmp = new Map<string, { jam: number; nominal: number; ids: string[] }>();
    for (const o of ots ?? []) {
      const cur = byEmp.get(o.employee_id) ?? { jam: 0, nominal: 0, ids: [] };
      cur.jam += Number(o.durasi_jam);
      cur.nominal += Number(o.nominal ?? 0);
      cur.ids.push(o.id);
      byEmp.set(o.employee_id, cur);
    }

    let totalGaji = 0, totalLembur = 0, totalTH = 0;
    type ItemInsert = {
      payroll_run_id: string;
      employee_id: string;
      nama_snapshot: string;
      gaji_pokok: number;
      total_jam_lembur: number;
      nominal_lembur: number;
      potongan: number;
      take_home: number;
    };
    const itemRows: ItemInsert[] = [];
    for (const e of emps ?? []) {
      const agg = byEmp.get(e.id) ?? { jam: 0, nominal: 0, ids: [] };
      const gaji = Number(e.gaji_pokok ?? 0);
      const take = +(gaji + agg.nominal).toFixed(2);
      totalGaji += gaji; totalLembur += agg.nominal; totalTH += take;
      itemRows.push({
        payroll_run_id: run.id,
        employee_id: e.id,
        nama_snapshot: e.nama,
        gaji_pokok: gaji,
        total_jam_lembur: agg.jam,
        nominal_lembur: agg.nominal,
        potongan: 0,
        take_home: take,
      });
    }
    if (itemRows.length) {
      const { error: insErr } = await supabase.from("hr_payroll_item").insert(itemRows);
      if (insErr) throw insErr;
    }

    // tag overtime to this run
    const allIds = (ots ?? []).map((o) => o.id);
    if (allIds.length) {
      await supabase.from("hr_overtime")
        .update({ payroll_run_id: run.id }).in("id", allIds);
    }

    // update totals
    const { data: updRun } = await supabase.from("hr_payroll_run").update({
      total_gaji: totalGaji,
      total_lembur: totalLembur,
      total_take_home: totalTH,
    }).eq("id", run.id).select("*").single();

    return updRun ?? run;
  });

export const finalizePayrollRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("hr_payroll_run")
      .update({
        status: "final",
        difinalisasi_oleh: userId,
        difinalisasi_at: new Date().toISOString(),
      }).eq("id", data.id).select("*").single();
    if (error) throw error;
    return row;
  });
