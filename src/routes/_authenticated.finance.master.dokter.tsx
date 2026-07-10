import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/dokter")({
  
  head: () => pageHead({ title: "Dokter — Finance", description: "Dokter pada modul keuangan klinik.", path: "/finance/master/dokter" }),
  component: () => (
    <MasterCrudPage
      title="Dokter"
      desc="Daftar dokter, spesialisasi, dan persentase jasa medis."
      module="master-dokter"
      table="fin_dokter"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama" },
        { key: "spesialisasi", label: "Spesialisasi" },
        { key: "default_fee_pct", label: "% Jasa", type: "number" },
        { key: "phone", label: "Telepon" },
        { key: "sip_number", label: "No. SIP" },
        { key: "npwp", label: "NPWP" },
        { key: "is_ptkp_k0", label: "PTKP K/0", type: "boolean" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", spesialisasi: "", default_fee_pct: 40, phone: "", sip_number: "", npwp: "", is_ptkp_k0: true, is_active: true })}
    />
  ),
});
