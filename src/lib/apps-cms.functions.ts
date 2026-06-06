import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Artikel = {
  id: string; slug: string; judul: string; ringkasan: string | null;
  konten: string; kategori: string; cover_url: string | null; published_at: string;
};

export const listArtikel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apps_artikel")
      .select("id, slug, judul, ringkasan, kategori, cover_url, published_at")
      .eq("is_published", true).order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { artikel: data ?? [] };
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
