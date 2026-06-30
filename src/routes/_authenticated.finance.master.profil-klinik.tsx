import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/profil-klinik")({
  component: () => (
    <MasterCrudPage
      title="Profil Klinik"
      desc="Identitas legal untuk dokumen pajak, invoice, dan laporan."
      module="master-profil-klinik"
      table="fin_profil_klinik"
      singleton
      fields={[
        { key: "nama", label: "Nama Klinik" },
        { key: "npwp", label: "NPWP" },
        { key: "alamat", label: "Alamat" },
        { key: "kota", label: "Kota" },
        { key: "telp", label: "Telepon" },
        { key: "email", label: "Email" },
        { key: "logo_url", label: "URL Logo" },
      ]}
      newRow={() => ({ nama: "", npwp: "", alamat: "", kota: "", telp: "", email: "", logo_url: "" })}
    />
  ),
});
