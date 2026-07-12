import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyPoin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page: z.number().int().min(1).max(1000).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: tot, error: totErr } = await context.supabase.rpc("apps_my_poin_total");
    if (totErr) throw new Error(totErr.message);
    const { data: hist, count, error: histErr } = await context.supabase.from("apps_poin")
      .select("*", { count: "exact" }).eq("user_id", context.userId)
      .order("created_at", { ascending: false }).range(from, to);
    if (histErr) throw new Error(histErr.message);
    return { total: (tot as number) ?? 0, history: hist ?? [], totalHistory: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

// NOTE: addPoin dihapus dari public server-fn — sebelumnya endpoint publik tanpa
// guard bisnis memungkinkan client memposting delta arbitrer & self-redeem reward.
// Poin harus dimutasi HANYA lewat RPC server-side yang memverifikasi kejadian
// nyata (mis. apps_redeem_reward, trigger booking selesai, dsb).


export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { period?: "week" | "month" | "all" }) =>
    z.object({ period: z.enum(["week", "month", "all"]).default("week") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("apps_leaderboard_periodik", { _period: data.period });
    if (error) throw new Error(error.message);
    return { board: (rows ?? []) as Array<{ rank: number; nama_mask: string; total_poin: number; is_me: boolean }>, period: data.period };
  });

export const listReward = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("apps_reward")
      .select("*").eq("is_active", true).order("harga_poin");
    if (error) throw new Error(error.message);
    return { reward: data ?? [] };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reward_id: string }) =>
    z.object({ reward_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("apps_redeem_reward", { _reward_id: data.reward_id });
    if (error) throw new Error(error.message);
    const first = Array.isArray(row) ? row[0] : row;
    return { kode_voucher: first?.kode_voucher as string, redeem_id: first?.redeem_id as string };
  });

export const listMyRedeem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apps_reward_redeem")
      .select("*, reward:apps_reward(nama, harga_poin)")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { redeem: data ?? [] };
  });
