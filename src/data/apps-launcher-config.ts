// Launcher menu bersumber dari konfigurasi role, bukan seed statis demo.
// Tiap item punya daftar role yang boleh melihatnya. `LauncherPage` memfilter
// berdasarkan role user yang sedang login (lihat components/apps/launcher.tsx).
import type { AppRole } from "@/lib/rbac";
import type { AppLauncherItem } from "@/types/apps";

export type LauncherEntry = AppLauncherItem & { roles: AppRole[] };

const ALL_STAFF: AppRole[] = [
  "super_admin", "admin_klinik", "manajemen", "dokter", "perawat",
  "perawat_optometri", "pendaftaran", "kasir", "farmasi",
];

export const LAUNCHER_ENTRIES: LauncherEntry[] = [
  { id: "sim", name: "SIM Klinik Mata", description: "Operasional klinik mata",
    to: "/sim-klinik", icon: "stethoscope", category: "Klinis", roles: ALL_STAFF },
  { id: "fin", name: "Prime Simon Finance", description: "Dashboard keuangan",
    to: "/finance", icon: "wallet", category: "Finance",
    roles: ["super_admin","admin_klinik","manajemen","kasir","farmasi"] },
  { id: "doc", name: "SOP & Documents", description: "Pustaka dokumen internal",
    to: "/apps/documents", icon: "file-text", category: "Knowledge", roles: ALL_STAFF },
  { id: "hd", name: "Helpdesk", description: "Tiket & dukungan",
    to: "/apps/helpdesk", icon: "life-buoy", category: "Internal", roles: ALL_STAFF },
  { id: "int", name: "System Integration", description: "Sync antar sistem",
    to: "/apps/integration", icon: "plug", category: "Internal",
    roles: ["super_admin","admin_klinik"] },
  { id: "usr", name: "User Management", description: "Pengguna & akses",
    to: "/apps/users", icon: "users", category: "Internal",
    roles: ["super_admin","admin_klinik"] },
  { id: "aud", name: "Audit Log", description: "Jejak aktivitas",
    to: "/apps/audit-log", icon: "scroll-text", category: "Internal",
    roles: ["super_admin","admin_klinik","manajemen"] },
];
