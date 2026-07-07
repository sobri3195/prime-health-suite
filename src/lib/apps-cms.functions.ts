import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Artikel = {
  id: string; slug: string; judul: string; ringkasan: string | null;
  konten: string; kategori: string; cover_url: string | null; published_at: string;
};

const ArtikelListInput = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const listArtikel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ArtikelListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await context.supabase
      .from("apps_artikel")
      .select("id, slug, judul, ringkasan, kategori, cover_url, published_at", { count: "exact" })
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { artikel: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
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
    return { artikel: row as Artikel };
  });
