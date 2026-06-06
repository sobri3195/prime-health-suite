import { useMemo } from "react";
import { Sparkles, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { notifications, tickets, systemHealth, users, documents } from "@/data/appsData";

type Insight = { tone: "warn" | "info" | "ok"; title: string; detail: string };

function buildInsights(): Insight[] {
  const out: Insight[] = [];
  const unread = notifications.filter((n) => n.status === "unread");
  const critical = unread.filter((n) => n.severity === "critical");
  const syncIssues = notifications.filter((n) => n.category === "sync" && n.status !== "archived");
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress");
  const highPriority = openTickets.filter((t) => t.priority === "high" || t.priority === "critical");
  const degraded = systemHealth.filter((s) => s.status !== "online");
  const draftDocs = documents.filter((d) => d.status === "draft");
  const inactiveUsers = users.filter((u) => u.status === "inactive");

  if (critical.length) {
    out.push({
      tone: "warn",
      title: `${critical.length} notifikasi kritikal belum dibaca`,
      detail: critical[0].title + ". Tinjau segera untuk mencegah dampak operasional.",
    });
  }
  if (syncIssues.length) {
    out.push({
      tone: "warn",
      title: "Integrasi memerlukan perhatian",
      detail: `${syncIssues.length} event sync antar sistem berstatus gagal/menunggu.`,
    });
  }
  if (highPriority.length) {
    out.push({
      tone: "warn",
      title: `${highPriority.length} tiket prioritas tinggi terbuka`,
      detail: `Termasuk: "${highPriority[0].subject}" (${highPriority[0].category}).`,
    });
  }
  if (degraded.length) {
    out.push({
      tone: "warn",
      title: `Status sistem: ${degraded.map((d) => d.name).join(", ")}`,
      detail: "Beberapa layanan terdeteksi degraded. Pantau latency dan retry queue.",
    });
  }
  if (draftDocs.length) {
    out.push({
      tone: "info",
      title: `${draftDocs.length} dokumen masih berstatus draft`,
      detail: `Selesaikan review dokumen seperti "${draftDocs[0].title}".`,
    });
  }
  out.push({
    tone: "ok",
    title: `${unread.length} notifikasi baru hari ini`,
    detail: `Aktivitas tim: ${users.length - inactiveUsers.length} user aktif dari ${users.length} total.`,
  });

  return out.slice(0, 5);
}

export function AIInsightPanel() {
  const insights = useMemo(buildInsights, []);
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-surface-muted/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gradient-accent)] text-navy">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">AI Insight</div>
          <div className="text-[11px] text-muted-foreground">Berbasis data yang sedang tampil</div>
        </div>
      </div>
      <ul className="space-y-3">
        {insights.map((i, idx) => {
          const Icon = i.tone === "warn" ? AlertTriangle : i.tone === "ok" ? TrendingUp : Info;
          const tone =
            i.tone === "warn"
              ? "text-destructive bg-destructive/10"
              : i.tone === "ok"
              ? "text-emerald-accent bg-emerald-accent/10"
              : "text-cyan-accent bg-cyan-accent/10";
          return (
            <li key={idx} className="flex gap-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="text-sm">
                <div className="font-medium leading-snug">{i.title}</div>
                <div className="text-xs text-muted-foreground">{i.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
