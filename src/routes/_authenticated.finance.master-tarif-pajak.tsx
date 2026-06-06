import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";
import { master as financeMaster } from "@/data/financeData";

export const Route = createFileRoute("/_authenticated/finance/master-tarif-pajak")({
  component: () => (
    <MasterCrudPage
      title="Tarif Pajak"
      desc="Master tarif PPN, PPh Badan, dan PPh 21 untuk perhitungan otomatis."
      module="master-tarif-pajak"
      fields={[
        { key: "id", label: "Kode" },
        { key: "name", label: "Nama Pajak" },
        { key: "rate", label: "Tarif (%)", type: "number" },
      ]}
      initial={financeMaster.taxes.map((t) => ({ ...t, rate: Number((t.rate * 100).toFixed(2)) }))}
      newRow={() => ({ id: "", name: "", rate: 0 })}
    />
  ),
});
