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

import { PatientAI, PatientProfil, PatientLaporan } from "@/components/apps/patient";
import { PatientBelanjaReal, PatientCart, PatientCheckout, PatientOrders } from "@/components/apps/belanja-real";
import { PatientEdukasi } from "@/components/apps/edukasi";
import { PatientWins } from "@/components/apps/wins";
import { PatientChat } from "@/components/apps/chat";
import { PatientPrivasi } from "@/components/apps/privacy";


function Section() {
  const { section } = Route.useParams();
  switch (section) {
    case "ai": return <PatientAI />;
    case "belanja": return <PatientBelanjaReal />;
    case "cart": return <PatientCart />;
    case "checkout": return <PatientCheckout />;
    case "orders": return <PatientOrders />;
    case "edukasi": return <PatientEdukasi />;
    case "wins": return <PatientWins />;
    case "chat": return <PatientChat />;
    case "profil": return <PatientProfil />;
    case "privasi": return <PatientPrivasi />;

    case "laporan": return <PatientLaporan />;
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
