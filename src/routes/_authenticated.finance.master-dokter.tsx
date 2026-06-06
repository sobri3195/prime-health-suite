import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master-dokter")({
  component: () => (
    <MasterCrudPage
      title="Dokter"
      desc="Daftar dokter beserta spesialisasi dan kode jasa medis."
      module="master-dokter"
      fields={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Nama" },
        { key: "spesialisasi", label: "Spesialisasi" },
        { key: "jasaPercent", label: "% Jasa Medis", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["Aktif", "Non-Aktif"] },
      ]}
      initial={[
        { kode: "DR-001", nama: "dr. Rini, Sp.M", spesialisasi: "Refraksi", jasaPercent: 40, status: "Aktif" },
        { kode: "DR-002", nama: "dr. Bagas, Sp.M", spesialisasi: "Glaukoma", jasaPercent: 45, status: "Aktif" },
        { kode: "DR-003", nama: "dr. Anisa, Sp.M", spesialisasi: "Retina", jasaPercent: 45, status: "Aktif" },
        { kode: "DR-004", nama: "dr. Hadi, Sp.M(K)", spesialisasi: "Katarak", jasaPercent: 50, status: "Aktif" },
        { kode: "DR-005", nama: "dr. Tania, Sp.M", spesialisasi: "Pediatrik", jasaPercent: 40, status: "Aktif" },
        { kode: "DR-006", nama: "dr. Yusuf, Sp.M", spesialisasi: "Kornea", jasaPercent: 45, status: "Aktif" },
      ]}
      newRow={() => ({ kode: "", nama: "", spesialisasi: "", jasaPercent: 40, status: "Aktif" })}
    />
  ),
});
