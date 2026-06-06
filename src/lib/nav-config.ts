import {
  LayoutDashboard, Grid3x3, Bell, LifeBuoy, FileText, Users, Plug, ScrollText, Settings,
  Stethoscope, UserPlus, Calendar, ClipboardList, Activity, Pill, Receipt, Files, BarChart3, Database,
  Wallet, TrendingDown, Landmark, ReceiptText, BookOpen, Scale, LineChart, FileSpreadsheet, ShieldCheck,
  PiggyBank, ArrowDownUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { System } from "./auth";

export type NavItem = { slug: string; label: string; icon: LucideIcon };

export const SYSTEM_LABEL: Record<System, string> = {
  apps: "Prime Apps",
  "sim-klinik": "SIM Klinik Mata",
  finance: "Prime Simon Finance",
};

export const NAV: Record<System, NavItem[]> = {
  apps: [
    { slug: "", label: "Workspace Dashboard", icon: LayoutDashboard },
    { slug: "launcher", label: "App Launcher", icon: Grid3x3 },
    { slug: "notifications", label: "Notifications", icon: Bell },
    { slug: "helpdesk", label: "Helpdesk", icon: LifeBuoy },
    { slug: "documents", label: "SOP & Documents", icon: FileText },
    { slug: "users", label: "User Overview", icon: Users },
    { slug: "integration", label: "System Integration", icon: Plug },
    { slug: "audit-log", label: "Audit Log", icon: ScrollText },
    { slug: "settings", label: "Settings", icon: Settings },
  ],
  "sim-klinik": [
    { slug: "", label: "Dashboard Klinik", icon: LayoutDashboard },
    { slug: "pasien", label: "Pasien", icon: Stethoscope },
    { slug: "registrasi", label: "Registrasi & Kunjungan", icon: UserPlus },
    { slug: "jadwal", label: "Jadwal Dokter", icon: Calendar },
    { slug: "pemeriksaan", label: "Pemeriksaan", icon: ClipboardList },
    { slug: "tindakan", label: "Tindakan Klinik Mata", icon: Activity },
    { slug: "resep", label: "Resep & Obat", icon: Pill },
    { slug: "billing", label: "Billing Klinik", icon: Receipt },
    { slug: "dokumen", label: "Dokumen Pasien", icon: Files },
    { slug: "laporan", label: "Laporan Klinik", icon: BarChart3 },
    { slug: "master", label: "Master Data Klinik", icon: Database },
    { slug: "audit", label: "Audit Log Klinik", icon: ScrollText },
    { slug: "settings", label: "Settings", icon: Settings },
  ],
  finance: [
    { slug: "", label: "Dashboard Finance", icon: LayoutDashboard },
    { slug: "pendapatan", label: "Pendapatan", icon: Wallet },
    { slug: "piutang", label: "Piutang & Klaim", icon: ReceiptText },
    { slug: "pengeluaran", label: "Pengeluaran", icon: TrendingDown },
    { slug: "pajak", label: "Pajak", icon: ShieldCheck },
    { slug: "bank", label: "Bank & Rekonsiliasi", icon: Landmark },
    { slug: "voucher", label: "Voucher", icon: PiggyBank },
    { slug: "jurnal", label: "Jurnal", icon: BookOpen },
    { slug: "buku-besar", label: "Buku Besar", icon: BookOpen },
    { slug: "laba-rugi", label: "Laba Rugi", icon: LineChart },
    { slug: "arus-kas", label: "Arus Kas", icon: ArrowDownUp },
    { slug: "neraca", label: "Neraca Saldo", icon: Scale },
    { slug: "laporan", label: "Laporan Manajemen", icon: FileSpreadsheet },
    { slug: "master", label: "Master Data Finance", icon: Database },
    { slug: "audit", label: "Audit Log Finance", icon: ScrollText },
    { slug: "settings", label: "Settings", icon: Settings },
  ],
};

export function findNav(system: System, slug: string) {
  return NAV[system].find((n) => n.slug === slug);
}
