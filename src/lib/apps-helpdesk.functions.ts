import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_STATUS = ["open", "in_progress", "resolved", "closed"] as const;
const VALID_PRIORITY = ["low", "medium", "high", "critical"] as const;

const TicketListInput = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(VALID_STATUS).optional(),
  priority: z.enum(VALID_PRIORITY).optional(),
  category: z.string().trim().max(50).optional(),
  q: z.string().trim().max(200).optional(),
});

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TicketListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });
    let q = supabase
      .from("apps_ticket")
      .select("id, ticket_no, user_id, reporter, subject, description, category, priority, status, pic, created_at, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (!isStaff) q = q.eq("user_id", userId);
    if (data.status) q = q.eq("status", data.status);
    if (data.priority) q = q.eq("priority", data.priority);
    if (data.category) q = q.eq("category", data.category);
    if (data.q) {
      const esc = data.q.replace(/[%_,]/g, (m) => `\\${m}`);
      q = q.or(`subject.ilike.%${esc}%,ticket_no.ilike.%${esc}%,reporter.ilike.%${esc}%`);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });


export const listTicketReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ticketId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });
    if (!isStaff) {
      const { data: t, error: te } = await supabase
        .from("apps_ticket").select("user_id").eq("id", data.ticketId).maybeSingle();
      if (te) throw new Error(te.message);
      if (!t || t.user_id !== userId) throw new Error("Tidak diizinkan");
    }
    const { data: rows, error } = await supabase
      .from("apps_ticket_reply")
      .select("id, author_id, author_label, message, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

const CreateTicketInput = z.object({
  subject: z.string().trim().min(1, "Subject wajib diisi").max(200),
  description: z.string().trim().min(1, "Deskripsi wajib diisi").max(4000),
  category: z.string().trim().max(50).optional(),
  priority: z.enum(VALID_PRIORITY).optional(),
});

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateTicketInput.parse(d))
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
        subject: data.subject,
        description: data.description,
        category: data.category ?? "request",
        priority: data.priority ?? "medium",
        status: "open",
      })
      .select("id, ticket_no")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// Allowed transitions (state machine). "closed" is terminal — only staff may
// reopen (closed → open) as a deliberate audit-visible action.
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["open", "resolved", "closed"],
  resolved: ["closed", "open"],
  closed: ["open"], // reopen only
};

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(VALID_STATUS),
      pic: z.string().trim().max(100).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });
    if (!isStaff) throw new Error("Hanya staff yang dapat mengubah status tiket");

    // Fetch current state to enforce the transition table.
    const { data: cur, error: cerr } = await supabase
      .from("apps_ticket").select("status").eq("id", data.id).maybeSingle();
    if (cerr) throw new Error(cerr.message);
    if (!cur) throw new Error("Tiket tidak ditemukan");
    const from = (cur as { status: string }).status;
    if (from !== data.status && !(ALLOWED_TRANSITIONS[from] ?? []).includes(data.status)) {
      throw new Error(`Transisi status tidak diizinkan: ${from} → ${data.status}`);
    }

    const patch: { status: typeof data.status; pic?: string | null } = { status: data.status };
    if (data.pic !== undefined) {
      const pic = data.pic && data.pic.length ? data.pic : null;
      if (pic) {
        const { data: emp, error: ee } = await supabase
          .from("hr_employee").select("id").eq("nama", pic).eq("is_active", true).maybeSingle();
        if (ee) throw new Error(ee.message);
        if (!emp) throw new Error(`PIC "${pic}" tidak terdaftar pada daftar karyawan aktif`);
      }
      patch.pic = pic;
    }
    const { error } = await supabase.from("apps_ticket").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ReplyTicketInput = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1, "Pesan kosong").max(4000),
});

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReplyTicketInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: userId });

    // Fetch owner + status so we can enforce: no reply on closed tickets
    // (staff must reopen first), and non-staff must own the ticket.
    const { data: t, error: te } = await supabase
      .from("apps_ticket").select("user_id, status").eq("id", data.ticketId).maybeSingle();
    if (te) throw new Error(te.message);
    if (!t) throw new Error("Tiket tidak ditemukan");
    if (!isStaff && (t as any).user_id !== userId) throw new Error("Tidak diizinkan");
    if ((t as any).status === "closed") {
      throw new Error("Tiket sudah ditutup. Buka kembali (reopen) sebelum membalas.");
    }

    const { error } = await supabase.from("apps_ticket_reply").insert({
      ticket_id: data.ticketId,
      author_id: userId,
      author_label: isStaff ? ((claims as any)?.email ?? "staff") : "reporter",
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

