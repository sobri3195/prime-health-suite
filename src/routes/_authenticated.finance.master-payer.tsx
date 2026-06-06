import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";
import { master as financeMaster } from "@/data/financeData";

export const Route = createFileRoute("/_authenticated/finance/master-payer")({
  component: () => (
    <MasterCrudPage
      title="Payer / Asuransi"
      desc="Daftar payer untuk klasifikasi pendapatan dan klaim."
      module="master-payer"
      fields={[
        { key: "id", label: "Kode" },
        { key: "name", label: "Nama Payer" },
        { key: "type", label: "Jenis", type: "select", options: ["Tunai/Invoice", "Klaim", "Korporat"] },
        { key: "termin", label: "Termin (hari)", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["Aktif", "Non-Aktif"] },
      ]}
      initial={financeMaster.payers.map((p) => ({ ...p, termin: p.type === "Klaim" ? 45 : 7 }))}
      newRow={() => ({ id: "", name: "", type: "Tunai/Invoice", termin: 7, status: "Aktif" })}
    />
  ),
});
