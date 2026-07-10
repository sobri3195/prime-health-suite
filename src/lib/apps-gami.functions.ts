import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMyPoin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tot } = await context.supabase.rpc("apps_my_poin_total");
    const { data: hist } = await context.supabase.from("apps_poin")
      .select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(20);
    return { total: (tot as number) ?? 0, history: hist ?? [] };
  });

export const addPoin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { delta: number; alasan: string; ref_type?: string; ref_id?: string }) =>
    z.object({
      delta: z.number().int().min(-1000).max(1000),
      alasan: z.string().min(1).max(200),
      ref_type: z.string().max(40).optional(),
      ref_id: z.string().max(200).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("apps_poin").insert({
      user_id: context.userId, delta: data.delta, alasan: data.alasan,
      ref_type: data.ref_type ?? null, ref_id: data.ref_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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
