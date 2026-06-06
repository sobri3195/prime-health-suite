import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";
import { financeMaster } from "@/data/financeData";

export const Route = createFileRoute("/_authenticated/finance/master-vendor")({
  component: () => (
    <MasterCrudPage
      title="Vendor"
      desc="Daftar supplier alkes, obat, dan jasa pendukung."
      module="master-vendor"
      fields={[
        { key: "id", label: "Kode" },
        { key: "name", label: "Nama Vendor" },
        { key: "type", label: "Tipe", type: "select", options: ["Supplier", "Service", "Sewa"] },
        { key: "termin", label: "Termin (hari)", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["Aktif", "Non-Aktif"] },
      ]}
      initial={financeMaster.vendors.map((v) => ({ ...v, termin: 30 }))}
      newRow={() => ({ id: "", name: "", type: "Supplier", termin: 30, status: "Aktif" })}
    />
  ),
});
