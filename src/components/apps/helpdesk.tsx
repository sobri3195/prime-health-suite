import { useMemo, useState } from "react";
import { tickets } from "@/data/apps-demo-seed";
import type { HelpdeskTicket, TicketStatus, TicketPriority, TicketCategory } from "@/types/apps";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

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
  const { t: tr, lang } = useI18n();
  const locale = lang === "id" ? "id-ID" : "en-US";

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
      <PageHeader title={tr("help.title")} desc={tr("help.desc")} />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder={tr("help.search")} />
        <Select value={st} onChange={setSt} options={ST} />
        <Select value={pr} onChange={setPr} options={PR} />
        <Select value={cat} onChange={setCat} options={CAT} />
        <button
          onClick={() => setShowNew(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground hover:opacity-95"
        >
          <Plus className="h-4 w-4" /> {tr("help.new")}
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={tr("help.none.title")} hint={tr("help.none.hint")} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{tr("help.col.id")}</th><th className="px-4 py-3">{tr("help.col.subject")}</th>
                <th className="px-4 py-3">{tr("help.col.category")}</th><th className="px-4 py-3">{tr("help.col.priority")}</th>
                <th className="px-4 py-3">{tr("help.col.status")}</th><th className="px-4 py-3">{tr("help.col.pic")}</th>
                <th className="px-4 py-3">{tr("help.col.updated")}</th>
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
                    {new Date(t.updatedAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <TicketDrawer ticket={selected} onClose={() => setSelected(null)} locale={locale} tr={tr} />}
      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onSubmit={() => { setShowNew(false); toast.success(tr("help.created")); }}
          tr={tr}
        />
      )}
    </PageContainer>
  );
}


function TicketDrawer({ ticket, onClose, locale, tr }: { ticket: HelpdeskTicket; onClose: () => void; locale: string; tr: (k: string) => string }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-background p-6 shadow-[var(--shadow-elegant)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{ticket.id}</div>
            <h2 className="mt-1 text-lg font-semibold">{ticket.subject}</h2>
          </div>
          <button onClick={onClose} aria-label={tr("common.cancel")}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={statusTone[ticket.status]}>{ticket.status}</StatusBadge>
          <StatusBadge tone={priorityTone[ticket.priority]}>{ticket.priority}</StatusBadge>
          <StatusBadge tone="muted">{ticket.category}</StatusBadge>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{ticket.description}</p>
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <div>{tr("help.reporter")}: <span className="text-foreground">{ticket.reporter}</span></div>
          <div>{tr("help.col.pic")}: <span className="text-foreground">{ticket.pic}</span></div>
        </div>
        <div className="mt-6">
          <div className="mb-2 text-sm font-semibold">{tr("help.timeline")}</div>
          <ol className="space-y-3 border-l border-border pl-4">
            {ticket.timeline.map((a, i) => (
              <li key={i}>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.ts).toLocaleString(locale)} · {a.actor}
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

function NewTicketModal({ onClose, onSubmit, tr }: { onClose: () => void; onSubmit: () => void; tr: (k: string) => string }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 id="new-ticket-title" className="text-lg font-semibold">{tr("help.modal.title")}</h2>
        <form
          aria-labelledby="new-ticket-title"
          className="mt-4 space-y-3"
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        >
          <div>
            <label htmlFor="nt-subject" className="mb-1 block text-xs font-medium text-muted-foreground">{tr("help.modal.subject")}</label>
            <input id="nt-subject" name="subject" required placeholder={tr("help.modal.subject")} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="nt-desc" className="mb-1 block text-xs font-medium text-muted-foreground">{tr("help.modal.desc")}</label>
            <textarea id="nt-desc" name="description" required placeholder={tr("help.modal.desc")} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nt-cat" className="mb-1 block text-xs font-medium text-muted-foreground">{tr("help.col.category")}</label>
              <select id="nt-cat" name="category" className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                {CAT.slice(1).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="nt-pri" className="mb-1 block text-xs font-medium text-muted-foreground">{tr("help.col.priority")}</label>
              <select id="nt-pri" name="priority" className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                {PR.slice(1).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm">{tr("common.cancel")}</button>
            <button type="submit" className="rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground">{tr("help.modal.submit")}</button>
          </div>
        </form>
      </div>
    </>
  );
}

