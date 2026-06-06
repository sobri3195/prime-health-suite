import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Wallet, FileBarChart, Calculator, Receipt, TrendingUp } from "lucide-react";
import { ProductLanding } from "@/components/product-landing";
import { faviconDataUrl } from "@/lib/brand";

const SITE = "https://prime-health-suite.lovable.app";

export const Route = createFileRoute("/produk/finance")({
  head: () => ({
    meta: [
      { title: "Simon Finance — Dashboard Keuangan Klinik Mata" },
      { name: "description", content: "Pendapatan harian, honor dokter otomatis, jurnal akuntansi, neraca, laba-rugi, dan arus kas — semua sinkron dengan SIM Klinik secara real-time." },
      { property: "og:title", content: "Simon Finance — Dashboard Keuangan Klinik Mata" },
      { property: "og:description", content: "Jurnal otomatis, honor dokter, dan laporan keuangan real-time untuk klinik mata." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/produk/finance` },
      { name: "theme-color", content: "#0d7a5f" },
    ],
    links: [
      { rel: "canonical", href: `${SITE}/produk/finance` },
      { rel: "icon", type: "image/svg+xml", href: faviconDataUrl("📊") },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Simon Finance",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description: "Dashboard keuangan klinik mata: pendapatan, honor dokter, jurnal otomatis, dan laporan keuangan.",
      }),
    }],
  }),
  component: () => (
    <ProductLanding
      system="finance"
      loginTo="/finance/login"
      defaultRoleLabel="Finance / Accounting"
      headline="Keuangan klinik mata, transparan dan real-time."
      subhead="Setiap transaksi SIM Klinik otomatis menjadi jurnal. Honor dokter terhitung harian, laporan keuangan selalu siap tanpa rekonsiliasi manual."
      benefits={[
        { icon: TrendingUp, title: "Pendapatan real-time", desc: "Pantau kasir, kartu, dan ranking dokter setiap saat." },
        { icon: Calculator, title: "Honor otomatis", desc: "Bagi hasil dokter berdasarkan tarif & default fee per layanan." },
        { icon: FileBarChart, title: "Laporan instan", desc: "Neraca, laba-rugi, dan arus kas tersusun dari jurnal otomatis." },
      ]}
      features={[
        "Input pendapatan harian",
        "Kasir harian & rekap kartu/EDC/QRIS",
        "Ranking dokter & highlight pendapatan",
        "Honor dokter (input, potongan, rekap)",
        "Jurnal otomatis & buku besar",
        "Neraca, laba-rugi, arus kas",
        "Master COA, dokter, payer, vendor, pajak",
        "Multi-cost center & profil klinik",
      ]}
      audiences={[
        { role: "Finance Manager & Accounting", what: "Kontrol penuh COA, jurnal, dan laporan keuangan." },
        { role: "Owner & Auditor", what: "Akses read-only ke laporan & audit log." },
      ]}
    />
  ),
});

// Reserved icons for future sections
void BarChart3; void Wallet; void Receipt;
