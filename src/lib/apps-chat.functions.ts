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
  .inputValidator((d: { room_id: string; body: string }) =>
    z.object({ room_id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("apps_chat_msg")
      .insert({ room_id: data.room_id, sender: "patient", body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
