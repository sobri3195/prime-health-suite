import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/cost-center")({
  
  head: () => pageHead({ title: "Cost Center — Finance", description: "Cost Center pada modul keuangan klinik.", path: "/finance/master/cost-center" }),
  component: () => (
    <MasterCrudPage
      title="Cost Center"
      desc="Pusat biaya untuk alokasi pendapatan & pengeluaran per unit."
      module="master-cost-center"
      table="fin_cost_center"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama" },
        { key: "pic", label: "PIC" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", pic: "", is_active: true })}
    />
  ),
});
