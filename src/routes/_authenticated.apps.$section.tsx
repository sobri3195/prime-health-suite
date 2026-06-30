import { createFileRoute, notFound } from "@tanstack/react-router";
import { LauncherPage } from "@/components/apps/launcher";
import { NotificationsPage } from "@/components/apps/notifications";
import { HelpdeskPage } from "@/components/apps/helpdesk";
import { DocumentsPage } from "@/components/apps/documents";
import { UsersPage } from "@/components/apps/users";
import { AuditLogPage } from "@/components/apps/audit-log";
import { IntegrationPage } from "@/components/apps/integration";
import { PatientAI, PatientProfil, PatientLaporan } from "@/components/apps/patient";
import { PatientBelanjaReal, PatientCart, PatientCheckout, PatientOrders } from "@/components/apps/belanja-real";
import { PatientEdukasi } from "@/components/apps/edukasi";
import { PatientWins } from "@/components/apps/wins";
import { PatientChat } from "@/components/apps/chat";
import { PatientPrivasi } from "@/components/apps/privacy";

const KNOWN_SECTIONS = new Set([
  "ai", "belanja", "cart", "checkout", "orders", "edukasi", "wins", "chat",
  "profil", "privasi", "laporan", "launcher", "notifications", "helpdesk",
  "documents", "users", "integration", "audit-log",
]);

export const Route = createFileRoute("/_authenticated/apps/$section")({
  beforeLoad: ({ params }) => {
    if (!KNOWN_SECTIONS.has(params.section)) {
      throw notFound({ data: { section: params.section } });
    }
  },
  component: Section,
});

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
    default: return null;
  }
}
