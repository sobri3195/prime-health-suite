import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app-shell";
import { findNav } from "@/lib/nav-config";
import { LauncherPage } from "@/components/apps/launcher";
import { NotificationsPage } from "@/components/apps/notifications";
import { HelpdeskPage } from "@/components/apps/helpdesk";
import { DocumentsPage } from "@/components/apps/documents";
import { UsersPage } from "@/components/apps/users";
import { AuditLogPage } from "@/components/apps/audit-log";
import { IntegrationPage } from "@/components/apps/integration";

export const Route = createFileRoute("/_authenticated/apps/$section")({
  component: Section,
});

function Section() {
  const { section } = Route.useParams();
  switch (section) {
    case "launcher": return <LauncherPage />;
    case "notifications": return <NotificationsPage />;
    case "helpdesk": return <HelpdeskPage />;
    case "documents": return <DocumentsPage />;
    case "users": return <UsersPage />;
    case "integration": return <IntegrationPage />;
    case "audit-log": return <AuditLogPage />;
    default: {
      const meta = findNav("apps", section);
      return <PlaceholderPage title={meta?.label ?? section} />;
    }
  }
}
