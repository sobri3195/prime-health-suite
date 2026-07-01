import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/aset-penyusutan")({
  
  head: () => pageHead({ title: "Penyusutan Aset — Finance", description: "Penyusutan Aset pada modul keuangan klinik.", path: "/finance/aset-penyusutan" }),
  component: () => (
    <MasterCrudPage
      title="Penyusutan Aset"
      desc="Jadwal penyusutan bulanan per aset (otomatis straight-line jika diisi)."
      module="aset-penyusutan"
      table="fin_aset_penyusutan"
      fields={[
        { key: "aset_id", label: "Aset (UUID)" },
        { key: "periode", label: "Periode (YYYY-MM)" },
        { key: "tanggal", label: "Tanggal" },
        { key: "beban", label: "Beban", type: "number" },
        { key: "akumulasi", label: "Akumulasi", type: "number" },
        { key: "nilai_buku", label: "Nilai Buku", type: "number" },
        { key: "posted", label: "Posted", type: "boolean" },
      ]}
      newRow={() => ({ aset_id: "", periode: new Date().toISOString().slice(0, 7), tanggal: new Date().toISOString().slice(0, 10), beban: 0, akumulasi: 0, nilai_buku: 0, posted: false })}
    />
  ),
});
