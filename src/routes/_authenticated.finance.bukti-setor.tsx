import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/bukti-setor")({
  component: () => (
    <MasterCrudPage
      title="Bukti Setor Bank"
      desc="Setoran kas/koin ke rekening bank."
      module="bukti-setor"
      table="fin_bukti_setor"
      fields={[
        { key: "no_setor", label: "No Setor" },
        { key: "tanggal", label: "Tanggal" },
        { key: "kas_coa", label: "COA Kas (asal)" },
        { key: "bank_coa", label: "COA Bank (tujuan)" },
        { key: "amount", label: "Jumlah", type: "number" },
        { key: "ref_bank", label: "Ref. Bank" },
        { key: "keterangan", label: "Keterangan" },
        { key: "status", label: "Status", type: "select", options: ["draft", "posted", "void"] },
      ]}
      newRow={() => ({ no_setor: `BS-${Date.now()}`, tanggal: new Date().toISOString().slice(0, 10), kas_coa: "1100", bank_coa: "1110", amount: 0, ref_bank: "", keterangan: "", status: "draft" })}
    />
  ),
});
