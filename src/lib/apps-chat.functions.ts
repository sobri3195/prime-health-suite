import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getOrCreateRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ex } = await context.supabase
      .from("apps_chat_room").select("*").eq("user_id", context.userId).maybeSingle();
    if (ex) return { room: ex };
    const { data, error } = await context.supabase
      .from("apps_chat_room").insert({ user_id: context.userId }).select("*").single();
    if (error) throw new Error(error.message);
    // System welcome message
    await context.supabase.from("apps_chat_msg").insert({
      room_id: data.id, sender: "system",
      body: "Selamat datang di Helpdesk Prime Apps. Tim Front Office kami akan membalas pada jam kerja (Senin–Sabtu, 08:00–20:00 WIB).",
    });
    return { room: data };
  });

export const listChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { room_id: string }) => z.object({ room_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("apps_chat_msg").select("*").eq("room_id", data.room_id)
      .order("created_at", { ascending: true }).limit(200);
    if (error) throw new Error(error.message);
    return { messages: rows ?? [] };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { room_id: string; body: string; attachment_path?: string; attachment_name?: string; attachment_mime?: string }) =>
    z.object({
      room_id: z.string().uuid(),
      body: z.string().max(2000),
      attachment_path: z.string().max(500).optional(),
      attachment_name: z.string().max(200).optional(),
      attachment_mime: z.string().max(100).optional(),
    }).refine(v => v.body.trim().length > 0 || !!v.attachment_path, { message: "Pesan atau lampiran wajib diisi" }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("apps_chat_msg")
      .insert({
        room_id: data.room_id, sender: "patient", body: data.body,
        attachment_path: data.attachment_path ?? null,
        attachment_name: data.attachment_name ?? null,
        attachment_mime: data.attachment_mime ?? null,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const signChatAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sig, error } = await context.supabase.storage.from("apps-mata").createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: sig.signedUrl };
  });
