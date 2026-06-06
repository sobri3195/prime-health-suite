import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage, PageHeader } from "@/components/app-shell";
import { findNav } from "@/lib/nav-config";
import { useSyncExternalStore } from "react";
import { getAudit, subscribeAudit } from "@/lib/audit-log";

export const Route = createFileRoute("/_authenticated/apps/$section")({
  component: Section,
});

function Section() {
  const { section } = Route.useParams();
  const meta = findNav("apps", section);
  if (section === "audit") return <AuditView />;
  return <PlaceholderPage title={meta?.label ?? section} />;
}

function AuditView() {
  const audit = useSyncExternalStore(
    (cb) => { const u = subscribeAudit(cb); return () => { u; }; },
    () => getAudit(),
    () => getAudit(),
  );
  return (
    <div>
      <PageHeader title="Audit Log" desc="Jejak aktivitas penting di seluruh platform." />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aktor</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {audit.slice(0, 50).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground">{new Date(a.ts).toLocaleString("id-ID")}</td>
                <td className="px-4 py-2">{a.actor}</td>
                <td className="px-4 py-2"><span className="rounded-md bg-muted px-2 py-0.5 text-xs">{a.action}</span></td>
                <td className="px-4 py-2 font-mono text-xs">{a.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
