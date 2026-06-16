import { createServerFn } from "@tanstack/react-start";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const reconJurnal = createServerFn({ method: "POST" })
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const sb = await adminClient();
    const { data: rows, error } = await sb.rpc("fin_recon_jurnal", { _from: data.from, _to: data.to });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const reconUnposted = createServerFn({ method: "POST" })
  .inputValidator((d: { from: string; to: string }) => d)
  .handler(async ({ data }) => {
    const sb = await adminClient();
    const { data: rows, error } = await sb.rpc("fin_recon_unposted", { _from: data.from, _to: data.to });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const postingAudit = createServerFn({ method: "POST" })
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
