import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export const listPublicDiklat = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("klinik_diklat")
    .select("id, slug, judul, ringkasan, tanggal, cover_image_url, youtube_url, tags, dokter_id, views_count")
    .eq("is_published", true)
    .order("tanggal", { ascending: false })
    .limit(100);
  if (error) throw error;
  const ids = Array.from(new Set((data ?? []).map((d) => d.dokter_id).filter(Boolean))) as string[];
  let dokterMap: Record<string, { name: string; spesialisasi: string | null }> = {};
  if (ids.length) {
    const { data: dks } = await supabaseAdmin
      .from("fin_dokter")
      .select("id, name, spesialisasi")
      .in("id", ids);
    dokterMap = Object.fromEntries((dks ?? []).map((d) => [d.id, { name: d.name, spesialisasi: d.spesialisasi }]));
  }
  return (data ?? []).map((d) => ({ ...d, dokter: d.dokter_id ? dokterMap[d.dokter_id] ?? null : null }));
});

export const getDiklatBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("klinik_diklat")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    let dokter: { id: string; name: string; spesialisasi: string | null } | null = null;
    if (row.dokter_id) {
      const { data: dk } = await supabaseAdmin
        .from("fin_dokter")
        .select("id, name, spesialisasi")
        .eq("id", row.dokter_id)
        .maybeSingle();
      dokter = dk ?? null;
    }
    void supabaseAdmin
      .from("klinik_diklat")
      .update({ views_count: (row.views_count ?? 0) + 1 })
      .eq("id", row.id)
      .then(() => {});
    return { ...row, dokter };
  });

export const listAllDiklat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("klinik_diklat")
      .select("id, slug, judul, tanggal, dokter_id, is_published, views_count, youtube_url, cover_image_url, tags")
      .order("tanggal", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  judul: z.string().min(3).max(200),
  ringkasan: z.string().max(500).optional().nullable(),
  deskripsi: z.string().max(20000).optional().nullable(),
  tanggal: z.string().min(8).max(10),
  dokter_id: z.string().uuid().optional().nullable(),
  youtube_url: z.string().url().max(500).optional().nullable(),
  cover_image_url: z.string().url().max(500).optional().nullable(),
  galeri: z.array(z.string().url().max(500)).max(20).default([]),
  pdf_url: z.string().url().max(500).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(15).default([]),
  is_published: z.boolean().default(false),
});

export const upsertDiklat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const baseSlug = slugify(data.judul) || "diklat";
    const payload = {
      judul: data.judul,
      ringkasan: data.ringkasan ?? null,
      deskripsi: data.deskripsi ?? null,
      tanggal: data.tanggal,
      dokter_id: data.dokter_id ?? null,
      youtube_url: data.youtube_url ?? null,
      cover_image_url: data.cover_image_url ?? null,
      galeri: data.galeri,
      pdf_url: data.pdf_url ?? null,
      tags: data.tags,
      is_published: data.is_published,
    };
    if (data.id) {
      const { error } = await context.supabase.from("klinik_diklat").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    // ensure unique slug
    let slug = baseSlug;
    let n = 1;
    while (true) {
      const { data: existing } = await context.supabase
        .from("klinik_diklat")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const { data: ins, error } = await context.supabase
      .from("klinik_diklat")
      .insert({ ...payload, slug, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    return { id: ins.id };
  });

export const deleteDiklat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("klinik_diklat").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listDokterOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fin_dokter")
      .select("id, name, spesialisasi")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const listPublishedDiklatSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("klinik_diklat")
    .select("slug, updated_at")
    .eq("is_published", true);
  return data ?? [];
});
