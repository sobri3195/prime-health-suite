import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const saveAiHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    keluhan: string; gejala: string[]; durasi: string; nyeri: number;
    hasil: unknown; summary: string; risk: string; foto_url?: string | null;
  }) => z.object({
    keluhan: z.string().min(1).max(1000),
    gejala: z.array(z.string()).max(20),
    durasi: z.string().max(40),
    nyeri: z.number().int().min(0).max(10),
    hasil: z.any(),
    summary: z.string().max(2000),
    risk: z.string().max(20),
    foto_url: z.string().max(500).nullish(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("apps_ai_history")
      .insert({
        user_id: context.userId,
        keluhan: data.keluhan, gejala: data.gejala, durasi: data.durasi, nyeri: data.nyeri,
        hasil: data.hasil, summary: data.summary, risk: data.risk,
        foto_url: data.foto_url ?? null,
      }).select("id").single();
    if (error) throw new Error(error.message);
    // Award 10 poin per skrining — jangan gagalkan penyimpanan history bila
    // insert poin bermasalah (misal RLS/quota). Log ke server, kembalikan poin=0.
    let poin = 10;
    const { error: poinErr } = await context.supabase.from("apps_poin").insert({
      user_id: context.userId, delta: 10,
      alasan: "Skrining AI Mata", ref_type: "ai", ref_id: row.id,
    });
    if (poinErr) {
      console.error("[apps-ai] gagal award poin:", poinErr.message);
      poin = 0;
    }
    return { id: row.id, poin };
  });

export const listMyAiHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      page: z.number().int().min(1).max(1000).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await context.supabase
      .from("apps_ai_history").select("*", { count: "exact" })
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { history: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const signEyePhotoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ext: string }) =>
    z.object({ ext: z.string().regex(/^(jpg|jpeg|png|webp)$/i) }).parse(d))
  .handler(async ({ data, context }) => {
    const path = `${context.userId}/${Date.now()}.${data.ext.toLowerCase()}`;
    const { data: sig, error } = await context.supabase.storage
      .from("apps-mata").createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: sig.token, signedUrl: sig.signedUrl };
  });

export const signEyePhotoView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(context.userId + "/")) throw new Error("Forbidden");
    const { data: sig, error } = await context.supabase.storage
      .from("apps-mata").createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: sig.signedUrl };
  });
