import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_STATUS = ["open", "in_progress", "resolved", "closed"] as const;
const VALID_PRIORITY = ["low", "medium", "high", "critical"] as const;

const TicketListInput = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TicketListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    // Defense-in-depth: filter own tickets unless caller is staff. RLS also
    // enforces this; explicit filter keeps queries index-friendly.
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });
    let q = supabase
      .from("apps_ticket")
      .select("id, ticket_no, user_id, reporter, subject, description, category, priority, status, pic, created_at, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (!isStaff) q = q.eq("user_id", userId);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
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
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(VALID_STATUS),
      pic: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only staff may change status; a reporter closing their own ticket
    // is a separate action (not implemented). RLS also enforces this.
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });
    if (!isStaff) throw new Error("Hanya staff yang dapat mengubah status tiket");
    const patch = data.pic !== undefined
      ? { status: data.status, pic: data.pic }
      : { status: data.status };
    const { error } = await supabase.from("apps_ticket").update(patch).eq("id", data.id);
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
