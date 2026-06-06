import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";
import { financeMaster } from "@/data/financeData";

export const Route = createFileRoute("/_authenticated/finance/master-cost-center")({
  component: () => (
    <MasterCrudPage
      title="Cost Center"
      desc="Pengelompokan pengeluaran berdasarkan pusat biaya."
      module="master-cost-center"
      fields={[
        { key: "id", label: "Kode" },
        { key: "name", label: "Nama Cost Center" },
        { key: "account", label: "Akun Default" },
      ]}
      initial={financeMaster.costCategories.map((c) => ({ ...c }))}
      newRow={() => ({ id: "", name: "", account: "" })}
    />
  ),
});
