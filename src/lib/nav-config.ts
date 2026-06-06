import {
  LayoutDashboard, Bell, LifeBuoy, FileText, Users, Plug, ScrollText, Settings,
  Stethoscope, UserPlus, Calendar, ClipboardList, Activity, Pill, Receipt, Files, BarChart3, Database,
  Wallet, TrendingDown, Landmark, ReceiptText, BookOpen, Scale, LineChart, FileSpreadsheet, ShieldCheck,
  PiggyBank, ArrowDownUp, Building2, Briefcase, Truck, ShieldQuestion, Boxes, BadgePercent, Layers,
  CreditCard, Trophy, FileBarChart, CalendarDays, ListChecks, Coins, MinusSquare,
  Home, Brain, ShoppingBag, User, ShieldCheck as ShieldCheckIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { System } from "./auth";

import type { AppRole } from "./rbac";

export type NavItem = {
  slug: string;
  label: string;
  icon: LucideIcon;
  group?: string;
  roles?: AppRole[];
  status?: "ready" | "coming_soon";
};

export const SYSTEM_LABEL: Record<System, string> = {
  apps: "Prime Apps",
  "sim-klinik": "SIM Klinik Mata",
  finance: "Prime Simon Finance",
};

export const NAV: Record<System, NavItem[]> = {
  apps: [
    { slug: "", label: "Beranda", icon: Home },
    { slug: "ai", label: "AI", icon: Brain },
    { slug: "belanja", label: "Belanja", icon: ShoppingBag },
    { slug: "edukasi", label: "Edukasi", icon: BookOpen },
    { slug: "wins", label: "Daily Wins", icon: Trophy },
    { slug: "chat", label: "Chat FO", icon: LifeBuoy },
    { slug: "profil", label: "Profil", icon: User },
    { slug: "privasi", label: "Privasi & Keamanan", icon: ShieldCheckIcon },
    { slug: "laporan", label: "Laporan", icon: BarChart3 },

  ],
  "sim-klinik": [
    { slug: "", label: "Dashboard Klinik", icon: LayoutDashboard, roles: ["super_admin"] },
    { slug: "pasien", label: "Pasien", icon: Stethoscope, roles: ["super_admin"] },
    { slug: "registrasi", label: "Registrasi & Kunjungan", icon: UserPlus, roles: ["super_admin"] },
    { slug: "jadwal", label: "Jadwal Dokter", icon: Calendar, roles: ["super_admin"] },
    { slug: "pemeriksaan", label: "Pemeriksaan", icon: ClipboardList, roles: ["super_admin"], status: "coming_soon" },
    { slug: "tindakan", label: "Tindakan Klinik Mata", icon: Activity, roles: ["super_admin"] },
    { slug: "resep", label: "Resep & Obat", icon: Pill, roles: ["super_admin"] },
    { slug: "billing", label: "Billing Klinik", icon: Receipt, roles: ["super_admin"] },
    { slug: "dokumen", label: "Dokumen Pasien", icon: Files, roles: ["super_admin"] },
    { slug: "laporan", label: "Laporan Klinik", icon: BarChart3, roles: ["super_admin"] },
    { slug: "master", label: "Master Data Klinik", icon: Database, roles: ["super_admin"] },
    { slug: "audit", label: "Audit Log Klinik", icon: ScrollText, roles: ["super_admin"] },
    { slug: "settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
  ],
  finance: [
    { slug: "", label: "Dashboard", icon: LayoutDashboard, group: "Dashboard" },

    { slug: "master-profil-klinik", label: "Profil Klinik", icon: Building2, group: "Master Data" },
    { slug: "master-dokter", label: "Dokter", icon: Stethoscope, group: "Master Data" },
    { slug: "master-karyawan", label: "Karyawan", icon: Briefcase, group: "Master Data" },
    { slug: "master-vendor", label: "Vendor", icon: Truck, group: "Master Data" },
    { slug: "master-payer", label: "Payer / Asuransi", icon: ShieldQuestion, group: "Master Data" },
    { slug: "master-coa", label: "COA", icon: Boxes, group: "Master Data" },
    { slug: "master-cost-center", label: "Cost Center", icon: Layers, group: "Master Data" },
    { slug: "master-tarif-pajak", label: "Tarif Pajak", icon: BadgePercent, group: "Master Data" },
    { slug: "master-kategori-layanan", label: "Kategori Layanan", icon: ListChecks, group: "Master Data" },

    { slug: "pendapatan-input-harian", label: "Input Pendapatan Harian", icon: Wallet, group: "Pendapatan" },
    { slug: "pendapatan", label: "Detail Pendapatan", icon: ReceiptText, group: "Pendapatan" },
    { slug: "pendapatan-ranking-dokter", label: "Ranking Dokter", icon: Trophy, group: "Pendapatan" },
    { slug: "pendapatan-report-highlight", label: "Report Highlight", icon: FileBarChart, group: "Pendapatan" },
    { slug: "pendapatan-kasir-harian", label: "Pendapatan Kasir Harian", icon: CalendarDays, group: "Pendapatan" },
    { slug: "pendapatan-kartu", label: "Kartu Debit/Kredit", icon: CreditCard, group: "Pendapatan" },

    { slug: "honor-input", label: "Input Jasa Medis", icon: Coins, group: "Dokter & Honor" },
    { slug: "honor-rekap", label: "Rekap Jasa Dokter", icon: BarChart3, group: "Dokter & Honor" },
    { slug: "honor-potongan", label: "Potongan Jasa Dokter", icon: MinusSquare, group: "Dokter & Honor" },

    { slug: "piutang", label: "Piutang & Klaim", icon: ReceiptText, group: "Operasional" },
    { slug: "pengeluaran", label: "Pengeluaran", icon: TrendingDown, group: "Operasional" },
    { slug: "pajak", label: "Pajak", icon: ShieldCheck, group: "Operasional" },
    { slug: "bank", label: "Bank & Rekonsiliasi", icon: Landmark, group: "Operasional" },
    { slug: "voucher", label: "Voucher", icon: PiggyBank, group: "Operasional" },

    { slug: "jurnal", label: "Jurnal", icon: BookOpen, group: "Akuntansi" },
    { slug: "buku-besar", label: "Buku Besar", icon: BookOpen, group: "Akuntansi" },
    { slug: "laba-rugi", label: "Laba Rugi", icon: LineChart, group: "Akuntansi" },
    { slug: "arus-kas", label: "Arus Kas", icon: ArrowDownUp, group: "Akuntansi" },
    { slug: "neraca", label: "Neraca Saldo", icon: Scale, group: "Akuntansi" },
    { slug: "laporan", label: "Laporan Manajemen", icon: FileSpreadsheet, group: "Akuntansi" },

    { slug: "audit", label: "Audit Log Finance", icon: ScrollText, group: "Sistem" },
    { slug: "settings", label: "Settings", icon: Settings, group: "Sistem" },
  ],
};

export function findNav(system: System, slug: string) {
  return NAV[system].find((n) => n.slug === slug);
}
