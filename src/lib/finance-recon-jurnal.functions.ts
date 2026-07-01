import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const reconJurnal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const sb = await adminClient();
    const { data: rows, error } = await sb.rpc("fin_recon_jurnal", { _from: data.from, _to: data.to });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const reconUnposted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const sb = await adminClient();
    const { data: rows, error } = await sb.rpc("fin_recon_unposted", { _from: data.from, _to: data.to });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const postingAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string; limit?: number; sumber?: string } = { from: "", to: "" }) => d)
  .handler(async ({ data }) => {
    const sb = await adminClient();
    let q = sb.from("fin_posting_audit").select("*").order("posted_at", { ascending: false }).limit(data.limit ?? 500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.sumber) q = q.eq("sumber", data.sumber);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// Compact widget data: current period totals + previous-period trend for the Finance dashboard.
export const reconWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const sb = await adminClient();
    const slaHours = Number(process.env.FINANCE_UNPOSTED_SLA_HOURS) || 24;

    // Current period
    const { data: cur } = await sb.rpc("fin_recon_jurnal", { _from: data.from, _to: data.to });
    const curRows = (cur ?? []) as any[];
    const totalSelisih = curRows.reduce((a, r) => a + Math.abs(Number(r.selisih) || 0), 0);
    const totalUnposted = curRows.reduce((a, r) => a + Number(r.unposted_count || 0), 0);

    // Overdue unposted (>SLA)
    const { data: upo } = await sb.rpc("fin_recon_unposted", { _from: data.from, _to: data.to });
    const cutoff = Date.now() - slaHours * 36e5;
    const overdueCount = (upo ?? []).filter((r: any) => new Date(r.tanggal + "T00:00:00").getTime() <= cutoff).length;

    // Previous period of equal length
    const dFrom = new Date(data.from + "T00:00:00");
    const dTo = new Date(data.to + "T00:00:00");
    const days = Math.max(1, Math.round((dTo.getTime() - dFrom.getTime()) / 86_400_000) + 1);
    const prevTo = new Date(dFrom.getTime() - 86_400_000);
    const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const { data: prev } = await sb.rpc("fin_recon_jurnal", { _from: iso(prevFrom), _to: iso(prevTo) });
    const prevRows = (prev ?? []) as any[];
    const prevSelisih = prevRows.reduce((a, r) => a + Math.abs(Number(r.selisih) || 0), 0);
    const prevUnposted = prevRows.reduce((a, r) => a + Number(r.unposted_count || 0), 0);

    return {
      slaHours,
      totalSelisih, totalUnposted, overdueCount,
      prevSelisih, prevUnposted,
      prevRange: { from: iso(prevFrom), to: iso(prevTo) },
      perSumber: curRows.map((r) => ({
        sumber: r.sumber,
        selisih: Math.abs(Number(r.selisih) || 0),
        unposted: Number(r.unposted_count) || 0,
      })),
    };
  });

export const slaConfig = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async () => ({
  slaHours: Number(process.env.FINANCE_UNPOSTED_SLA_HOURS) || 24,
  source: process.env.FINANCE_UNPOSTED_SLA_HOURS ? "env" : "default",
}));
