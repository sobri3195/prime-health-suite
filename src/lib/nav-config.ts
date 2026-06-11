import {
  LayoutDashboard, Bell, LifeBuoy, FileText, Users, Plug, ScrollText, Settings,
  Stethoscope, UserPlus, Calendar, ClipboardList, Activity, Pill, Receipt, Files, BarChart3, Database,
  Wallet, TrendingDown, Landmark, ReceiptText, BookOpen, Scale, LineChart, FileSpreadsheet, ShieldCheck,
  PiggyBank, ArrowDownUp, Building2, Briefcase, Truck, ShieldQuestion, Boxes, BadgePercent, Layers,
  CreditCard, Trophy, FileBarChart, CalendarDays, ListChecks, Coins, MinusSquare,
  Home, Brain, ShoppingBag, User, ShieldCheck as ShieldCheckIcon,
  Clock, Timer, GraduationCap, Trash2,
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
    { slug: "", label: "Dashboard Klinik", icon: LayoutDashboard, roles: ["super_admin","admin_klinik","manajemen","dokter","perawat","perawat_optometri","kasir","farmasi","pendaftaran"] },
    { slug: "pasien", label: "Pasien", icon: Stethoscope, roles: ["super_admin","admin_klinik","pendaftaran","dokter","perawat","perawat_optometri","kasir","manajemen"] },
    { slug: "registrasi", label: "Registrasi & Kunjungan", icon: UserPlus, roles: ["super_admin","admin_klinik","pendaftaran"] },
    { slug: "antrian", label: "Antrian", icon: ListChecks, roles: ["super_admin","admin_klinik","pendaftaran","dokter","perawat","perawat_optometri","kasir"] },
    { slug: "jadwal", label: "Jadwal Dokter", icon: Calendar, roles: ["super_admin","admin_klinik","pendaftaran","manajemen"] },
    { slug: "pemeriksaan", label: "Pemeriksaan & Rekam Medis", icon: ClipboardList, roles: ["super_admin","admin_klinik","dokter","perawat","perawat_optometri"] },
    { slug: "resep", label: "Resep & Farmasi", icon: Pill, roles: ["super_admin","admin_klinik","dokter","farmasi"] },
    { slug: "obat", label: "Stok Obat", icon: Boxes, roles: ["super_admin","admin_klinik","farmasi","manajemen"] },
    { slug: "billing", label: "Kasir & Billing", icon: Receipt, roles: ["super_admin","admin_klinik","kasir","manajemen"] },
    { slug: "dokumen", label: "Dokumen Pasien", icon: Files, roles: ["super_admin","admin_klinik","dokter","perawat","perawat_optometri"] },
    { slug: "diklat", label: "Diklat & Dokumentasi", icon: GraduationCap, roles: ["super_admin","admin_klinik","dokter","perawat","perawat_optometri","manajemen"] },
    { slug: "absensi", label: "Absensi", icon: Clock },
    { slug: "lembur", label: "Lembur", icon: Timer },
    { slug: "laporan", label: "Laporan Klinik", icon: BarChart3, roles: ["super_admin","admin_klinik","manajemen"] },
    { slug: "master", label: "Master Data Klinik", icon: Database, roles: ["super_admin","admin_klinik"] },
    { slug: "users", label: "Manajemen User", icon: Users, roles: ["super_admin","admin_klinik"] },
    { slug: "audit", label: "Audit Log Klinik", icon: ScrollText, roles: ["super_admin","admin_klinik","manajemen"] },
    { slug: "settings", label: "Settings", icon: Settings, roles: ["super_admin","admin_klinik"] },
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
    { slug: "master-mdr", label: "Aturan MDR", icon: CreditCard, group: "Master Data" },
    { slug: "master-template-invoice", label: "Template Invoice", icon: FileText, group: "Master Data" },
    { slug: "master-template-voucher", label: "Template Voucher", icon: FileText, group: "Master Data" },

    { slug: "pendapatan-input-harian", label: "Input Pendapatan Harian", icon: Wallet, group: "Pendapatan" },
    { slug: "pendapatan", label: "Detail Pendapatan", icon: ReceiptText, group: "Pendapatan" },
    { slug: "pendapatan-ranking-dokter", label: "Ranking Dokter", icon: Trophy, group: "Pendapatan" },
    { slug: "pendapatan-report-highlight", label: "Report Highlight", icon: FileBarChart, group: "Pendapatan" },
    { slug: "pendapatan-kasir-harian", label: "Pendapatan Kasir Harian", icon: CalendarDays, group: "Pendapatan" },
    { slug: "pendapatan-kartu", label: "Kartu Debit/Kredit", icon: CreditCard, group: "Pendapatan" },

    { slug: "honor-input", label: "Input Jasa Medis", icon: Coins, group: "Dokter & Honor" },
    { slug: "honor-rekap", label: "Rekap Jasa Dokter", icon: BarChart3, group: "Dokter & Honor" },
    { slug: "honor-potongan", label: "Potongan Jasa Dokter", icon: MinusSquare, group: "Dokter & Honor" },
    { slug: "honor-pembayaran", label: "Pembayaran Honor", icon: Wallet, group: "Dokter & Honor" },
    { slug: "honor-pph", label: "PPh Honor Dokter", icon: ShieldCheck, group: "Dokter & Honor" },

    { slug: "piutang", label: "Piutang & Klaim", icon: ReceiptText, group: "Piutang & Hutang" },
    { slug: "aging-piutang", label: "Aging Piutang", icon: ReceiptText, group: "Piutang & Hutang" },
    { slug: "aging-hutang", label: "Aging Hutang", icon: ReceiptText, group: "Piutang & Hutang" },
    { slug: "surat-tagih", label: "Surat Penagihan Asuransi", icon: FileText, group: "Piutang & Hutang" },

    { slug: "pengeluaran", label: "Pengeluaran", icon: TrendingDown, group: "Pengajuan & Voucher" },
    { slug: "vendor-bayar", label: "Pembayaran Vendor", icon: Truck, group: "Pengajuan & Voucher" },
    { slug: "voucher", label: "Voucher (Umum)", icon: PiggyBank, group: "Pengajuan & Voucher" },
    { slug: "voucher-bbk", label: "Voucher BBK (Penerimaan)", icon: PiggyBank, group: "Pengajuan & Voucher" },
    { slug: "voucher-bkk", label: "Voucher BKK (Pengeluaran)", icon: PiggyBank, group: "Pengajuan & Voucher" },
    { slug: "kas-kecil", label: "Kas Kecil", icon: Coins, group: "Pengajuan & Voucher" },
    { slug: "voucher-kas-kecil", label: "Voucher Kas Kecil", icon: Coins, group: "Pengajuan & Voucher" },
    { slug: "bukti-setor", label: "Bukti Setor Bank", icon: Landmark, group: "Pengajuan & Voucher" },

    { slug: "bank", label: "Bank", icon: Landmark, group: "Bank & Rekonsiliasi" },
    { slug: "rekonsiliasi", label: "Rekonsiliasi Kas/Bank", icon: ArrowDownUp, group: "Bank & Rekonsiliasi" },

    { slug: "persediaan", label: "Master Persediaan", icon: Boxes, group: "Persediaan" },
    { slug: "persediaan-mutasi", label: "Mutasi Persediaan", icon: ArrowDownUp, group: "Persediaan" },
    { slug: "persediaan-laporan", label: "Laporan Persediaan", icon: FileBarChart, group: "Persediaan" },

    { slug: "aset", label: "Master Aset", icon: Building2, group: "Aset Tetap" },
    { slug: "aset-penyusutan", label: "Penyusutan Aset", icon: TrendingDown, group: "Aset Tetap" },
    { slug: "aset-laporan", label: "Laporan Aset by Cost Center", icon: FileBarChart, group: "Aset Tetap" },

    { slug: "pajak", label: "Pajak (Umum)", icon: ShieldCheck, group: "Pajak" },
    { slug: "pajak-pph2123", label: "PPh 21 / 23", icon: ShieldCheck, group: "Pajak" },
    { slug: "pajak-pph-honor", label: "PPh Honor Dokter", icon: ShieldCheck, group: "Pajak" },
    { slug: "pajak-ppn", label: "PPN Prepopulated", icon: ShieldCheck, group: "Pajak" },
    { slug: "pajak-rekap", label: "Rekap Pajak Bulanan", icon: FileSpreadsheet, group: "Pajak" },

    { slug: "payroll", label: "Payroll (Umum)", icon: Wallet, group: "Payroll" },
    { slug: "payroll-absensi", label: "Absensi", icon: Clock, group: "Payroll" },
    { slug: "payroll-rekap", label: "Rekap Gaji", icon: BarChart3, group: "Payroll" },
    { slug: "payroll-slip", label: "Slip Gaji", icon: FileText, group: "Payroll" },

    { slug: "jurnal", label: "Jurnal", icon: BookOpen, group: "Akuntansi" },
    { slug: "buku-besar", label: "Buku Besar", icon: BookOpen, group: "Akuntansi" },
    { slug: "laba-rugi", label: "Laba Rugi", icon: LineChart, group: "Akuntansi" },
    { slug: "laba-rugi-payer", label: "Laba Rugi by Payer", icon: LineChart, group: "Akuntansi" },
    { slug: "arus-kas", label: "Arus Kas", icon: ArrowDownUp, group: "Akuntansi" },
    { slug: "neraca", label: "Neraca Saldo", icon: Scale, group: "Akuntansi" },
    { slug: "perubahan-modal", label: "Perubahan Modal", icon: TrendingDown, group: "Akuntansi" },
    { slug: "rab", label: "RAB vs Realisasi", icon: FileSpreadsheet, group: "Akuntansi" },
    { slug: "laporan", label: "Laporan Manajemen", icon: FileSpreadsheet, group: "Akuntansi" },

    { slug: "import-export", label: "Import / Export", icon: ArrowDownUp, group: "Sistem" },
    { slug: "audit", label: "Audit Log Finance", icon: ScrollText, group: "Sistem" },
    { slug: "settings", label: "Settings", icon: Settings, group: "Sistem" },
    { slug: "reset-data", label: "Reset Data", icon: Trash2, group: "Sistem" },
  ],
};

export function findNav(system: System, slug: string) {
  return NAV[system].find((n) => n.slug === slug);
}
