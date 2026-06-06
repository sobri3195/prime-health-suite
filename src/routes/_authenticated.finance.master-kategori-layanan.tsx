import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master-kategori-layanan")({
  component: () => (
    <MasterCrudPage
      title="Kategori Layanan"
      desc="Tarif layanan klinik untuk mapping pendapatan."
      module="master-kategori-layanan"
      fields={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Layanan" },
        { key: "kategori", label: "Kategori", type: "select", options: ["Konsultasi", "Diagnostik", "Tindakan", "Bedah"] },
        { key: "tarif", label: "Tarif (Rp)", type: "number" },
        { key: "akun", label: "Akun Pendapatan" },
      ]}
      initial={[
        { kode: "SVC-01", nama: "Konsultasi Sp.M", kategori: "Konsultasi", tarif: 175000, akun: "4101" },
        { kode: "SVC-02", nama: "Refraksi", kategori: "Diagnostik", tarif: 85000, akun: "4102" },
        { kode: "SVC-03", nama: "Tonometri", kategori: "Diagnostik", tarif: 75000, akun: "4102" },
        { kode: "SVC-04", nama: "OCT", kategori: "Diagnostik", tarif: 450000, akun: "4102" },
        { kode: "SVC-05", nama: "Laser YAG", kategori: "Tindakan", tarif: 1800000, akun: "4104" },
        { kode: "SVC-06", nama: "Phacoemulsifikasi", kategori: "Bedah", tarif: 12500000, akun: "4103" },
        { kode: "SVC-07", nama: "Injeksi Intravitreal", kategori: "Tindakan", tarif: 5500000, akun: "4104" },
        { kode: "SVC-08", nama: "Biometri", kategori: "Diagnostik", tarif: 250000, akun: "4102" },
      ]}
      newRow={() => ({ kode: "", nama: "", kategori: "Konsultasi", tarif: 0, akun: "4101" })}
    />
  ),
});
