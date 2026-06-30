import type {
  AppLauncherItem, AppNotification, HelpdeskTicket, AppDocument, AppUser, SystemHealth,
} from "@/types/apps";

const iso = (daysAgo: number, hoursAgo = 0) =>
  new Date(Date.now() - daysAgo * 864e5 - hoursAgo * 36e5).toISOString();

export const launcherItems: AppLauncherItem[] = [
  { id: "sim", name: "SIM Klinik Mata", description: "Operasional klinik mata", to: "/sim-klinik", icon: "stethoscope", category: "Klinis" },
  { id: "fin", name: "Prime Simon Finance", description: "Dashboard keuangan", to: "/finance", icon: "wallet", category: "Finance" },
  { id: "doc", name: "SOP & Documents", description: "Pustaka dokumen internal", to: "/apps/documents", icon: "file-text", category: "Knowledge" },
  { id: "hd", name: "Helpdesk", description: "Tiket & dukungan", to: "/apps/helpdesk", icon: "life-buoy", category: "Internal" },
  { id: "int", name: "System Integration", description: "Sync antar sistem", to: "/apps/integration", icon: "plug", category: "Internal" },
  { id: "usr", name: "User Management", description: "Pengguna & akses", to: "/apps/users", icon: "users", category: "Internal" },
  { id: "aud", name: "Audit Log", description: "Jejak aktivitas", to: "/apps/audit-log", icon: "scroll-text", category: "Internal" },
];

export const notifications: AppNotification[] = [
  { id: "n1", ts: iso(0, 1), title: "Sync gagal: SIM → Finance", body: "3 invoice belum terkirim ke Finance.", category: "sync", status: "unread", severity: "critical" },
  { id: "n2", ts: iso(0, 2), title: "Approval pengeluaran menunggu", body: "5 voucher menunggu persetujuan Finance Manager.", category: "approval", status: "unread", severity: "warning" },
  { id: "n3", ts: iso(0, 3), title: "Piutang Asuransi > 60 hari", body: "Rp 142.500.000 perlu follow-up.", category: "claim", status: "unread", severity: "warning" },
  { id: "n4", ts: iso(0, 5), title: "Jadwal dokter padat", body: "dr. Rini, Sp.M kuota terisi 96% hari ini.", category: "schedule", status: "read", severity: "info" },
  { id: "n5", ts: iso(1), title: "Data pasien belum lengkap", body: "12 pasien tidak memiliki NIK terverifikasi.", category: "patient", status: "read", severity: "info" },
  { id: "n6", ts: iso(1, 4), title: "Pemeliharaan terjadwal", body: "Maintenance integrasi 06 Juni, 23:00 WIB.", category: "system", status: "read", severity: "info" },
  { id: "n7", ts: iso(2), title: "Dokumen SOP diperbarui", body: "SOP Refraksi v2.1 telah dipublikasikan.", category: "system", status: "archived", severity: "info" },
];

export const tickets: HelpdeskTicket[] = [
  {
    id: "TKT-2026-0042", subject: "Tidak bisa login SIM Klinik", description: "Error 'invalid credentials' meski password benar.",
    status: "in_progress", priority: "high", category: "login",
    reporter: "front.office@klinikmata.id", pic: "IT Support",
    createdAt: iso(0, 6), updatedAt: iso(0, 1),
    timeline: [
      { ts: iso(0, 6), actor: "front.office@klinikmata.id", message: "Tiket dibuat" },
      { ts: iso(0, 4), actor: "IT Support", message: "Mengecek konfigurasi SSO" },
      { ts: iso(0, 1), actor: "IT Support", message: "Workaround diterapkan, menunggu konfirmasi" },
    ],
  },
  {
    id: "TKT-2026-0041", subject: "Export jurnal CSV kosong", description: "Hasil export hanya header tanpa baris.",
    status: "open", priority: "medium", category: "finance",
    reporter: "accounting@klinikmata.id", pic: "Finance App Owner",
    createdAt: iso(1), updatedAt: iso(1),
    timeline: [{ ts: iso(1), actor: "accounting@klinikmata.id", message: "Tiket dibuat" }],
  },
  {
    id: "TKT-2026-0040", subject: "Request: filter pasien per payer", description: "Butuh filter tambahan di list pasien.",
    status: "open", priority: "low", category: "request",
    reporter: "admin@klinikmata.id", pic: "Product",
    createdAt: iso(2), updatedAt: iso(2),
    timeline: [{ ts: iso(2), actor: "admin@klinikmata.id", message: "Tiket dibuat" }],
  },
  {
    id: "TKT-2026-0039", subject: "Cetak resep buram", description: "Tindakan refraksi: cetak resep tidak terbaca.",
    status: "resolved", priority: "high", category: "klinik",
    reporter: "dr.rini@klinikmata.id", pic: "IT Support",
    createdAt: iso(3), updatedAt: iso(0, 8),
    timeline: [
      { ts: iso(3), actor: "dr.rini@klinikmata.id", message: "Tiket dibuat" },
      { ts: iso(2), actor: "IT Support", message: "Driver printer diperbarui" },
      { ts: iso(0, 8), actor: "IT Support", message: "Diselesaikan, validasi dokter" },
    ],
  },
  {
    id: "TKT-2026-0038", subject: "Bug: total billing tidak update", description: "Setelah hapus item, total tidak refresh.",
    status: "closed", priority: "critical", category: "bug",
    reporter: "kasir@klinikmata.id", pic: "Engineering",
    createdAt: iso(5), updatedAt: iso(4),
    timeline: [
      { ts: iso(5), actor: "kasir@klinikmata.id", message: "Tiket dibuat" },
      { ts: iso(4), actor: "Engineering", message: "Diperbaiki di versi 2.4.1" },
    ],
  },
];

export const documents: AppDocument[] = [
  { id: "d1", title: "SOP Refraksi Dewasa", category: "SOP Klinik", version: "v2.1", status: "active", owner: "Komite Medik", updatedAt: iso(2) },
  { id: "d2", title: "SOP Pencatatan Pendapatan", category: "SOP Finance", version: "v1.4", status: "active", owner: "Finance", updatedAt: iso(7) },
  { id: "d3", title: "Panduan Penggunaan SIM Klinik", category: "Panduan Aplikasi", version: "v3.0", status: "active", owner: "IT", updatedAt: iso(1) },
  { id: "d4", title: "Formulir Informed Consent", category: "Formulir", version: "v1.0", status: "active", owner: "Komite Medik", updatedAt: iso(30) },
  { id: "d5", title: "Kebijakan Privasi Data Pasien", category: "Kebijakan", version: "v2.0", status: "active", owner: "Compliance", updatedAt: iso(14) },
  { id: "d6", title: "SOP Klaim BPJS", category: "SOP Finance", version: "v0.9", status: "draft", owner: "AR Team", updatedAt: iso(0, 4) },
  { id: "d7", title: "SOP Lama Funduskopi", category: "SOP Klinik", version: "v1.0", status: "archived", owner: "Komite Medik", updatedAt: iso(180) },
];

export const users: AppUser[] = [
  { id: "u1", name: "Andi Wijaya", email: "admin@klinikmata.id", role: "super_admin", status: "active", lastLogin: iso(0, 1), systems: ["apps", "sim-klinik", "finance"] },
  { id: "u2", name: "Linda Owner", email: "owner@klinikmata.id", role: "owner", status: "active", lastLogin: iso(0, 4), systems: ["apps", "sim-klinik", "finance"] },
  { id: "u3", name: "dr. Rini, Sp.M", email: "dr.rini@klinikmata.id", role: "dokter", status: "active", lastLogin: iso(0, 2), systems: ["apps", "sim-klinik"] },
  { id: "u4", name: "Sari Front Office", email: "front.office@klinikmata.id", role: "front_office", status: "active", lastLogin: iso(0, 0), systems: ["apps", "sim-klinik"] },
  { id: "u5", name: "Budi Kasir", email: "kasir@klinikmata.id", role: "kasir", status: "active", lastLogin: iso(0, 3), systems: ["apps", "sim-klinik", "finance"] },
  { id: "u6", name: "Maya Finance", email: "finance@klinikmata.id", role: "finance_manager", status: "active", lastLogin: iso(1), systems: ["apps", "finance"] },
  { id: "u7", name: "Anita Accounting", email: "accounting@klinikmata.id", role: "accounting", status: "active", lastLogin: iso(0, 5), systems: ["apps", "finance"] },
  { id: "u8", name: "Rudi Auditor", email: "auditor@klinikmata.id", role: "auditor", status: "inactive", lastLogin: iso(12), systems: ["apps", "sim-klinik", "finance"] },
];

export const systemHealth: SystemHealth[] = [
  { id: "apps", name: "Prime Apps Portal", status: "online", latencyMs: 42 },
  { id: "sim-klinik", name: "SIM Klinik Mata", status: "online", latencyMs: 68 },
  { id: "finance", name: "Prime Simon Finance", status: "online", latencyMs: 73 },
  { id: "integration", name: "Integration Bus", status: "degraded", latencyMs: 412 },
];
