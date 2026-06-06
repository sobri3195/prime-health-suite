import { useMemo, useState } from "react";
import { tickets } from "@/data/appsData";
import type { HelpdeskTicket, TicketStatus, TicketPriority, TicketCategory } from "@/types/apps";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

const ST: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];
const PR: { value: TicketPriority | "all"; label: string }[] = [
  { value: "all", label: "Semua prioritas" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const CAT: { value: TicketCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua kategori" },
  { value: "login", label: "Login" }, { value: "data", label: "Data" },
  { value: "finance", label: "Finance" }, { value: "klinik", label: "Klinik" },
  { value: "laporan", label: "Laporan" }, { value: "bug", label: "Bug" },
  { value: "request", label: "Request Fitur" },
];

const priorityTone: Record<TicketPriority, "ok" | "info" | "warn" | "danger"> = {
  low: "ok", medium: "info", high: "warn", critical: "danger",
};
const statusTone: Record<TicketStatus, "info" | "warn" | "ok" | "muted"> = {
  open: "info", in_progress: "warn", resolved: "ok", closed: "muted",
};

export function HelpdeskPage() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<TicketStatus | "all">("all");
  const [pr, setPr] = useState<TicketPriority | "all">("all");
  const [cat, setCat] = useState<TicketCategory | "all">("all");
  const [selected, setSelected] = useState<HelpdeskTicket | null>(null);
  const [showNew, setShowNew] = useState(false);

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (st === "all" || t.status === st) &&
        (pr === "all" || t.priority === pr) &&
        (cat === "all" || t.category === cat) &&
        (!qq ||
          t.subject.toLowerCase().includes(qq) ||
          t.id.toLowerCase().includes(qq) ||
          t.reporter.toLowerCase().includes(qq)),
    );
  }, [q, st, pr, cat]);

  return (
    <PageContainer>
      <PageHeader title="Helpdesk" desc="Kelola tiket dukungan internal." />
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

      {items.length === 0 ? (
        <EmptyState title="Tidak ada tiket" hint="Coba ubah filter atau buat tiket baru." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ID</th><th className="px-4 py-3">Subjek</th>
                <th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Prioritas</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="cursor-pointer border-t border-border hover:bg-muted/50" onClick={() => setSelected(t)}>
                  <td className="px-4 py-2 font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-2 font-medium">{t.subject}</td>
                  <td className="px-4 py-2"><StatusBadge tone="muted">{t.category}</StatusBadge></td>
                  <td className="px-4 py-2"><StatusBadge tone={priorityTone[t.priority]}>{t.priority}</StatusBadge></td>
                  <td className="px-4 py-2"><StatusBadge tone={statusTone[t.status]}>{t.status}</StatusBadge></td>
                  <td className="px-4 py-2">{t.pic}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <TicketDrawer ticket={selected} onClose={() => setSelected(null)} />}
      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onSubmit={() => { setShowNew(false); toast.success("Tiket berhasil dibuat (mock)"); }}
        />
      )}
    </PageContainer>
  );
}

function TicketDrawer({ ticket, onClose }: { ticket: HelpdeskTicket; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-background p-6 shadow-[var(--shadow-elegant)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{ticket.id}</div>
            <h2 className="mt-1 text-lg font-semibold">{ticket.subject}</h2>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={statusTone[ticket.status]}>{ticket.status}</StatusBadge>
          <StatusBadge tone={priorityTone[ticket.priority]}>{ticket.priority}</StatusBadge>
          <StatusBadge tone="muted">{ticket.category}</StatusBadge>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{ticket.description}</p>
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <div>Pelapor: <span className="text-foreground">{ticket.reporter}</span></div>
          <div>PIC: <span className="text-foreground">{ticket.pic}</span></div>
        </div>
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold">Timeline</div>
          <ol className="space-y-3 border-l border-border pl-4">
            {ticket.timeline.map((a, i) => (
              <li key={i}>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.ts).toLocaleString("id-ID")} · {a.actor}
                </div>
                <div className="text-sm">{a.message}</div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </>
  );
}

function NewTicketModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Tiket baru</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        >
          <input required placeholder="Subjek" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <textarea required placeholder="Deskripsi kendala" rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              {CAT.slice(1).map((c) => <option key={c.value}>{c.label}</option>)}
            </select>
            <select className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              {PR.slice(1).map((p) => <option key={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm">Batal</button>
            <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground">Buat tiket</button>
          </div>
        </form>
      </div>
    </>
  );
}
