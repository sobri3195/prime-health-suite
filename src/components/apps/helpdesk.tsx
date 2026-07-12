import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState, SkeletonList } from "./ui";
import { Plus, X, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import {
  listTickets, listTicketReplies, createTicket, updateTicketStatus, replyTicket,
} from "@/lib/apps-helpdesk.functions";
import { friendlyError } from "@/lib/apps-error";

type Ticket = {
  id: string; ticket_no: string; user_id: string; reporter: string;
  subject: string; description: string; category: string;
  priority: string; status: string; pic: string | null;
  created_at: string; updated_at: string;
};

const ST = [
  { value: "all", label: "Semua status" },
  { value: "open", label: "Open" }, { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" }, { value: "closed", label: "Closed" },
];
const PR = [
  { value: "all", label: "Semua prioritas" },
  { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
  { value: "high", label: "High" }, { value: "critical", label: "Critical" },
];
const CAT = [
  { value: "all", label: "Semua kategori" },
  { value: "login", label: "Login" }, { value: "data", label: "Data" },
  { value: "finance", label: "Finance" }, { value: "klinik", label: "Klinik" },
  { value: "laporan", label: "Laporan" }, { value: "bug", label: "Bug" },
  { value: "request", label: "Request Fitur" },
];

const priorityTone: Record<string, "ok" | "info" | "warn" | "danger"> = {
  low: "ok", medium: "info", high: "warn", critical: "danger",
};
const statusTone: Record<string, "info" | "warn" | "ok" | "muted"> = {
  open: "info", in_progress: "warn", resolved: "ok", closed: "muted",
};

export function HelpdeskPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listTickets);
  const callCreate = useServerFn(createTicket);
  const callUpdate = useServerFn(updateTicketStatus);

  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [pr, setPr] = useState("all");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const ticketsQ = useQuery({ queryKey: ["apps", "tickets", page], queryFn: () => callList({ data: { page, pageSize } }) });
  const total = ticketsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid || cancelled) return;
      const { data: isStaff } = await supabase.rpc("klinik_is_staff", { _uid: uid });
      if (cancelled) return;
      const ticketFilter = isStaff ? undefined : { filter: `user_id=eq.${uid}` };
      channel = supabase.channel("apps-tickets")
        .on("postgres_changes", { event: "*", schema: "public", table: "apps_ticket", ...(ticketFilter ?? {}) }, () => {
          qc.invalidateQueries({ queryKey: ["apps", "tickets"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "apps_ticket_reply" }, () => {
          qc.invalidateQueries({ queryKey: ["apps", "tickets"] });
          qc.invalidateQueries({ queryKey: ["apps", "ticket-replies"] });
        })
        .subscribe();
      if (cancelled && channel) supabase.removeChannel(channel);
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  const createM = useMutation({
    mutationFn: (d: { subject: string; description: string; category: string; priority: string }) =>
      callCreate({ data: d }),
    onSuccess: () => {
      toast.success("Tiket dibuat");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["apps", "tickets"] });
    },
    onError: (e: unknown) => toast.error(friendlyError(e)),
  });

  const updateM = useMutation({
    mutationFn: (d: { id: string; status: string }) => callUpdate({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps", "tickets"] }),
    onError: (e: unknown) => toast.error(friendlyError(e)),
  });

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (ticketsQ.data?.items ?? []).filter((t: Ticket) =>
      (st === "all" || t.status === st) &&
      (pr === "all" || t.priority === pr) &&
      (cat === "all" || t.category === cat) &&
      (!qq || t.subject.toLowerCase().includes(qq) || t.ticket_no.toLowerCase().includes(qq) || t.reporter.toLowerCase().includes(qq))
    );
  }, [ticketsQ.data, q, st, pr, cat]);

  return (
    <PageContainer>
      <PageHeader title="Helpdesk" desc="Tiket dukungan internal & pasien." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari tiket…" />
        <Select value={st} onChange={setSt} options={ST} />
        <Select value={pr} onChange={setPr} options={PR} />
        <Select value={cat} onChange={setCat} options={CAT} />
        <button
          onClick={() => setShowNew(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> Tiket baru
        </button>
      </div>

      {ticketsQ.isLoading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada tiket" hint="Buat tiket baru atau ubah filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">No</th><th className="px-4 py-3">Subjek</th>
                <th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Prioritas</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Diupdate</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t: Ticket) => (
                <tr key={t.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => setSelected(t)}>
                  <td className="px-4 py-2 font-mono text-xs">{t.ticket_no}</td>
                  <td className="px-4 py-2 font-medium">{t.subject}</td>
                  <td className="px-4 py-2"><StatusBadge tone="muted">{t.category}</StatusBadge></td>
                  <td className="px-4 py-2"><StatusBadge tone={priorityTone[t.priority] ?? "muted"}>{t.priority}</StatusBadge></td>
                  <td className="px-4 py-2"><StatusBadge tone={statusTone[t.status] ?? "muted"}>{t.status}</StatusBadge></td>
                  <td className="px-4 py-2">{t.pic ?? "-"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Halaman {page} dari {totalPages} · {total} tiket</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {selected && (
        <TicketDrawer
          ticket={selected}
          onClose={() => setSelected(null)}
          onStatus={(status) => updateM.mutate({ id: selected.id, status })}
        />
      )}
      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onSubmit={(d) => createM.mutate(d)}
          isPending={createM.isPending}
        />
      )}
    </PageContainer>
  );
}

function TicketDrawer({ ticket, onClose, onStatus }: { ticket: Ticket; onClose: () => void; onStatus: (s: string) => void }) {
  const qc = useQueryClient();
  const callReplies = useServerFn(listTicketReplies);
  const callReply = useServerFn(replyTicket);
  const [msg, setMsg] = useState("");

  const repliesQ = useQuery({
    queryKey: ["apps", "ticket-replies", ticket.id],
    queryFn: () => callReplies({ data: { ticketId: ticket.id } }),
  });

  const replyM = useMutation({
    mutationFn: () => callReply({ data: { ticketId: ticket.id, message: msg } }),
    onSuccess: () => {
      setMsg("");
      qc.invalidateQueries({ queryKey: ["apps", "ticket-replies", ticket.id] });
    },
    onError: (e: unknown) => toast.error(friendlyError(e)),
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-[var(--shadow-elegant)]">
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{ticket.ticket_no}</div>
            <h2 id="ticket-detail-title" className="mt-1 text-lg font-semibold">{ticket.subject}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge tone={statusTone[ticket.status] ?? "muted"}>{ticket.status}</StatusBadge>
              <StatusBadge tone={priorityTone[ticket.priority] ?? "muted"}>{ticket.priority}</StatusBadge>
              <StatusBadge tone="muted">{ticket.category}</StatusBadge>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm">{ticket.description}</p>
          <div className="mt-2 text-xs text-muted-foreground">Pelapor: {ticket.reporter}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <label className="text-xs text-muted-foreground self-center">Ubah status:</label>
            {["open", "in_progress", "resolved", "closed"].map((s) => (
              <button key={s} onClick={() => onStatus(s)}
                disabled={ticket.status === s}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold">Balasan</div>
            {repliesQ.isLoading ? (
              <SkeletonList rows={2} />
            ) : (repliesQ.data?.items ?? []).length === 0 ? (
              <div className="text-xs text-muted-foreground">Belum ada balasan.</div>
            ) : (
              <ol className="space-y-3 border-l border-border pl-4">
                {repliesQ.data!.items.map((r: any) => (
                  <li key={r.id}>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("id-ID")} · {r.author_label}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{r.message}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (msg.trim()) replyM.mutate(); }}
          className="border-t border-border p-4"
        >
          <div className="flex gap-2">
            <input
              value={msg} onChange={(e) => setMsg(e.target.value)}
              placeholder="Tulis balasan…"
              aria-label="Tulis balasan"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit" disabled={!msg.trim() || replyM.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-2 text-sm font-medium text-navy-foreground disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Kirim
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function NewTicketModal({
  onClose, onSubmit, isPending,
}: { onClose: () => void; onSubmit: (d: { subject: string; description: string; category: string; priority: string }) => void; isPending: boolean }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("request");
  const [priority, setPriority] = useState("medium");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="new-ticket-title" className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 id="new-ticket-title" className="text-lg font-semibold">Tiket Baru</h2>
        <form
          aria-labelledby="new-ticket-title"
          className="mt-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ subject, description, category, priority }); }}
        >
          <div>
            <label htmlFor="nt-subject" className="mb-1 block text-xs font-medium text-muted-foreground">Subjek</label>
            <input id="nt-subject" name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="nt-desc" className="mb-1 block text-xs font-medium text-muted-foreground">Deskripsi</label>
            <textarea id="nt-desc" name="description" required value={description} onChange={(e) => setDescription(e.target.value)}
              rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nt-cat" className="mb-1 block text-xs font-medium text-muted-foreground">Kategori</label>
              <select id="nt-cat" name="category" value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                {CAT.slice(1).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="nt-pri" className="mb-1 block text-xs font-medium text-muted-foreground">Prioritas</label>
              <select id="nt-pri" name="priority" value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                {PR.slice(1).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm">Batal</button>
            <button type="submit" disabled={isPending}
              className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground disabled:opacity-60">
              {isPending ? "Menyimpan…" : "Buat tiket"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
