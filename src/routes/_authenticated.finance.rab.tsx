import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/rab")({
  
  head: () => pageHead({ title: "RAB vs Realisasi — Finance", description: "RAB vs Realisasi pada modul keuangan klinik.", path: "/finance/rab" }),
  component: () => (
    <MasterCrudPage
      title="RAB vs Realisasi"
      desc="Anggaran (RAB) per periode per COA. Realisasi diambil dari jurnal posted."
      module="rab"
      table="fin_rab"
      fields={[
        { key: "periode", label: "Periode (YYYY-MM)" },
        { key: "coa_code", label: "Kode COA" },
        { key: "coa_nama", label: "Nama COA" },
        { key: "cost_center_code", label: "Cost Center" },
        { key: "anggaran", label: "Anggaran", type: "number" },
        { key: "catatan", label: "Catatan" },
      ]}
      newRow={() => ({ periode: new Date().toISOString().slice(0, 7), coa_code: "", coa_nama: "", cost_center_code: "", anggaran: 0, catatan: "" })}
    />
  ),
});
