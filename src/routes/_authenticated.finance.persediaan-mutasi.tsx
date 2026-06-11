import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/persediaan-mutasi")({
  component: () => (
    <MasterCrudPage
      title="Mutasi Persediaan"
      desc="Catat penerimaan, pengeluaran, dan penyesuaian stok. Saldo akan otomatis terupdate."
      module="persediaan-mutasi"
      table="fin_persediaan_mutasi"
      fields={[
        { key: "tanggal", label: "Tanggal" },
        { key: "persediaan_id", label: "Persediaan (UUID)" },
        { key: "tipe", label: "Tipe", type: "select", options: ["in", "out", "adjustment"] },
        { key: "qty", label: "Qty", type: "number" },
        { key: "harga", label: "Harga", type: "number" },
        { key: "ref_no", label: "Ref. No" },
        { key: "keterangan", label: "Keterangan" },
      ]}
      newRow={() => ({ tanggal: new Date().toISOString().slice(0, 10), persediaan_id: "", tipe: "in", qty: 0, harga: 0, ref_no: "", keterangan: "" })}
    />
  ),
});
