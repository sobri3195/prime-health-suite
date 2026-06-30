import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/coa")({
  component: () => (
    <MasterCrudPage
      title="Chart of Account (COA)"
      desc="Master akun untuk jurnal dan laporan keuangan."
      module="master-coa"
      table="fin_coa"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama Akun" },
        { key: "type", label: "Tipe", type: "select", options: ["Asset", "Liability", "Equity", "Revenue", "Expense"] },
        { key: "parent_code", label: "Parent" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", type: "Asset", parent_code: "", is_active: true })}
    />
  ),
});
