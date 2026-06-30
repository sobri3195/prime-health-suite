import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_STATUS = ["open", "in_progress", "resolved", "closed"] as const;
const VALID_PRIORITY = ["low", "medium", "high", "critical"] as const;

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apps_ticket")
      .select("id, ticket_no, user_id, reporter, subject, description, category, priority, status, pic, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const listTicketReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("apps_ticket_reply")
      .select("id, author_id, author_label, message, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; description: string; category?: string; priority?: string }) => {
    if (!d.subject?.trim()) throw new Error("Subject wajib diisi");
    if (!d.description?.trim()) throw new Error("Deskripsi wajib diisi");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const ticketNo = `TKT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const reporter = (claims as any)?.email ?? userId;
    const { data: row, error } = await supabase
      .from("apps_ticket")
      .insert({
        ticket_no: ticketNo,
        user_id: userId,
        reporter,
        subject: data.subject.trim(),
        description: data.description.trim(),
        category: data.category ?? "request",
        priority: VALID_PRIORITY.includes((data.priority as any) ?? "medium") ? data.priority ?? "medium" : "medium",
        status: "open",
      })
      .select("id, ticket_no")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string; pic?: string }) => {
    if (!VALID_STATUS.includes(d.status as any)) throw new Error("Status tidak valid");
    return d;
  })
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.pic !== undefined) patch.pic = data.pic;
    const { error } = await context.supabase.from("apps_ticket").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticketId: string; message: string }) => {
    if (!d.message?.trim()) throw new Error("Pesan kosong");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });
    const { error } = await supabase.from("apps_ticket_reply").insert({
      ticket_id: data.ticketId,
      author_id: userId,
      author_label: isStaff ? ((claims as any)?.email ?? "staff") : "reporter",
      message: data.message.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
