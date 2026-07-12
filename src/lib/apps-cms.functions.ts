import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Artikel = {
  id: string; slug: string; judul: string; ringkasan: string | null;
  konten: string; kategori: string; cover_url: string | null; published_at: string;
};

const ArtikelListInput = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(100).optional(),
  kategori: z.string().trim().max(50).optional(),
});

export const listArtikel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ArtikelListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let query = context.supabase
      .from("apps_artikel")
      .select("id, slug, judul, ringkasan, kategori, cover_url, published_at", { count: "exact" })
      .eq("is_published", true);
    if (data.q) {
      // Escape LIKE wildcards AND PostgREST .or() separators (, . ( ) " \).
      // Then wrap each value in double quotes so PostgREST treats it as literal.
      const esc = data.q
        .replace(/[\\%_]/g, (m) => `\\${m}`)
        .replace(/["(),.]/g, " ")
        .trim();
      if (esc) {
        const v = `"%${esc}%"`;
        query = query.or(`judul.ilike.${v},ringkasan.ilike.${v},kategori.ilike.${v}`);
      }
    }
    if (data.kategori) query = query.eq("kategori", data.kategori);
    const { data: rows, error, count } = await query
      .order("published_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    let ratings: Record<string, { avg: number; count: number }> = {};
    if (ids.length) {
      const { data: rt } = await context.supabase
        .from("apps_artikel_rating").select("artikel_id, rating").in("artikel_id", ids);
      for (const r of rt ?? []) {
        const k = (r as { artikel_id: string }).artikel_id;
        const v = (r as { rating: number }).rating;
        const cur = ratings[k] ?? { avg: 0, count: 0 };
        ratings[k] = { avg: cur.avg + v, count: cur.count + 1 };
      }
      for (const k of Object.keys(ratings)) {
        const v = ratings[k];
        ratings[k] = { avg: v.count ? v.avg / v.count : 0, count: v.count };
      }
    }

    return {
      artikel: (rows ?? []).map((r) => ({
        ...r,
        rating_avg: ratings[r.id]?.avg ?? 0,
        rating_count: ratings[r.id]?.count ?? 0,
      })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const getArtikel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("apps_artikel").select("*").eq("slug", data.slug).eq("is_published", true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Artikel tidak ditemukan");
    const { data: rt } = await context.supabase
      .from("apps_artikel_rating").select("rating, user_id").eq("artikel_id", (row as { id: string }).id);
    const list = rt ?? [];
    const avg = list.length ? list.reduce((s, r) => s + (r as { rating: number }).rating, 0) / list.length : 0;
    const mine = list.find((r) => (r as { user_id: string }).user_id === context.userId) as { rating: number } | undefined;
    return {
      artikel: row as Artikel,
      rating_avg: avg,
      rating_count: list.length,
      my_rating: mine?.rating ?? 0,
    };
  });

export const rateArtikel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ artikel_id: z.string().uuid(), rating: z.number().int().min(1).max(5) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("apps_artikel_rating")
      .upsert(
        { artikel_id: data.artikel_id, user_id: context.userId, rating: data.rating, updated_at: new Date().toISOString() },
        { onConflict: "artikel_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
