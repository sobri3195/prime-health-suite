import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { LauncherPage } from "@/components/apps/launcher";
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
import { CLINIC_CONTACT } from "@/lib/brand";
import { useRoles, hasAnyRole, type AppRole } from "@/lib/rbac";

// Operator/staff-only sections. Patient sessions must NOT reach these.
const OPERATOR_SECTIONS = new Set([
  "launcher", "helpdesk", "documents",
  "users", "integration", "audit-log",
]);
const OPERATOR_ROLES: AppRole[] = [
  "super_admin", "admin_klinik", "dokter", "perawat", "perawat_optometri",
  "pendaftaran", "kasir", "farmasi", "manajemen",
];


const KNOWN_SECTIONS = new Set([
  "ai", "belanja", "cart", "checkout", "orders", "edukasi", "wins", "chat",
  "profil", "privasi", "laporan", "launcher", "helpdesk",
  "documents", "users", "integration", "audit-log",
]);


const SECTION_META: Record<string, { title: string; description: string }> = {
  belanja: { title: "Belanja — Prime Apps", description: "Marketplace produk & layanan klinik untuk pasien." },
  cart: { title: "Keranjang — Prime Apps", description: "Ringkasan keranjang belanja Anda." },
  checkout: { title: "Checkout — Prime Apps", description: "Selesaikan pembayaran pesanan." },
  orders: { title: "Riwayat Belanja — Prime Apps", description: "Daftar pesanan dan status pengiriman." },
  profil: { title: "Profil Pasien — Prime Apps", description: "Kelola data profil dan preferensi akun." },
  edukasi: { title: "Edukasi — Prime Apps", description: "Artikel & tips kesehatan mata." },
  chat: { title: "Chat — Prime Apps", description: "Percakapan dengan tim klinik." },
  
  helpdesk: { title: "Helpdesk — Prime Apps", description: "Tiket dukungan & bantuan." },
  documents: { title: "Dokumen — Prime Apps", description: "Pustaka dokumen internal." },
  users: { title: "Pengguna — Prime Apps", description: "Manajemen pengguna & akses." },
  integration: { title: "Integrasi — Prime Apps", description: "Status sinkronisasi antar sistem." },
  "audit-log": { title: "Audit Log — Prime Apps", description: "Jejak aktivitas pengguna." },
  launcher: { title: "App Launcher — Prime Apps", description: "Akses cepat ke aplikasi internal." },
  ai: { title: "AI Assistant — Prime Apps", description: "Asisten AI untuk pasien." },
  laporan: { title: "Laporan — Prime Apps", description: "Ringkasan aktivitas Anda." },
  privasi: { title: "Privasi — Prime Apps", description: "Pengaturan privasi data." },
  wins: { title: "Wins — Prime Apps", description: "Pencapaian & milestone." },
};

export const Route = createFileRoute("/_authenticated/apps/$section")({
  beforeLoad: ({ params }) => {
    if (!KNOWN_SECTIONS.has(params.section)) {
      throw notFound({ data: { section: params.section } });
    }
  },
  head: ({ params }) => {
    const m = SECTION_META[params.section];
    if (!m) return {};
    const url = `${CLINIC_CONTACT.siteUrl}/apps/${params.section}`;
    return {
      meta: [
        { title: m.title },
        { name: "description", content: m.description },
        { property: "og:title", content: m.title },
        { property: "og:description", content: m.description },
        { property: "og:url", content: url },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: Section,
});

function Section() {
  const { section } = Route.useParams();
  const isOperatorSection = OPERATOR_SECTIONS.has(section);
  const { data: roles, isLoading } = useRoles({ enabled: isOperatorSection });

  if (isOperatorSection) {
    if (isLoading) {
      return <div className="p-8 text-sm text-muted-foreground">Memeriksa akses…</div>;
    }
    if (!hasAnyRole(roles, OPERATOR_ROLES)) {
      return (
        <div className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Akses Ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Halaman ini hanya untuk staf klinik. Akun pasien tidak memiliki akses.
          </p>
          <Link to="/apps" className="mt-4 inline-block text-sm underline">
            Kembali ke Beranda
          </Link>
        </div>
      );
    }
  }

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
    case "notifications": return null;
    case "helpdesk": return <HelpdeskPage />;
    case "documents": return <DocumentsPage />;
    case "users": return <UsersPage />;
    case "integration": return <IntegrationPage />;
    case "audit-log": return <AuditLogPage />;
    default: return null;
  }
}
