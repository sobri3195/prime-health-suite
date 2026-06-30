import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/payer")({
  component: () => (
    <MasterCrudPage
      title="Payer"
      desc="Pihak pembayar: tunai, asuransi, BPJS, korporat."
      module="master-payer"
      table="fin_payer"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama" },
        { key: "tipe", label: "Tipe", type: "select", options: ["Tunai", "Asuransi", "BPJS", "Korporat"] },
        { key: "term_hari", label: "Term (hari)", type: "number" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", tipe: "Asuransi", term_hari: 30, is_active: true })}
    />
  ),
});
