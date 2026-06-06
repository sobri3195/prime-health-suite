import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";
import { financeMaster } from "@/data/financeData";

export const Route = createFileRoute("/_authenticated/finance/master-coa")({
  component: () => (
    <MasterCrudPage
      title="Chart of Account (COA)"
      desc="Master akun untuk jurnal dan laporan keuangan."
      module="master-coa"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama Akun" },
        { key: "type", label: "Tipe", type: "select", options: ["Asset", "Liability", "Equity", "Revenue", "Expense"] },
      ]}
      initial={financeMaster.coa.map((c) => ({ ...c }))}
      newRow={() => ({ code: "", name: "", type: "Asset" })}
    />
  ),
});
