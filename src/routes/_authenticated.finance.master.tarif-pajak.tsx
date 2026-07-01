import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/tarif-pajak")({
  
  head: () => pageHead({ title: "Tarif Pajak — Finance", description: "Tarif Pajak pada modul keuangan klinik.", path: "/finance/master/tarif-pajak" }),
  component: () => (
    <MasterCrudPage
      title="Tarif Pajak"
      desc="PPN, PPh21 progresif, PPh23, PPh Final (4 ayat 2)."
      module="master-tarif-pajak"
      table="fin_tarif_pajak"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama" },
        { key: "jenis", label: "Jenis", type: "select", options: ["PPN", "PPh21", "PPh23", "PPh4(2)"] },
        { key: "tarif_pct", label: "Tarif %", type: "number" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", jenis: "PPN", tarif_pct: 11, is_active: true })}
    />
  ),
});
