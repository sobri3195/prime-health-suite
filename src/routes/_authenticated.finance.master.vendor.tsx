import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/vendor")({
  
  head: () => pageHead({ title: "Vendor — Finance", description: "Vendor pada modul keuangan klinik.", path: "/finance/master/vendor" }),
  component: () => (
    <MasterCrudPage
      title="Vendor"
      desc="Daftar supplier obat, alat medis, utilitas, dll."
      module="master-vendor"
      table="fin_vendor"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama" },
        { key: "kategori", label: "Kategori" },
        { key: "npwp", label: "NPWP" },
        { key: "term_hari", label: "Term (hari)", type: "number" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", kategori: "", npwp: "", term_hari: 30, is_active: true })}
    />
  ),
});
