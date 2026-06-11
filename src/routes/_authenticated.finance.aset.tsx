import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/aset")({
  component: () => (
    <MasterCrudPage
      title="Master Aset Tetap"
      desc="Aset tetap (alat medis, furniture, IT) dengan informasi penyusutan."
      module="aset"
      table="fin_aset"
      fields={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Nama Aset" },
        { key: "kategori", label: "Kategori" },
        { key: "cost_center_code", label: "Cost Center" },
        { key: "tanggal_perolehan", label: "Tgl Perolehan" },
        { key: "harga_perolehan", label: "Harga Perolehan", type: "number" },
        { key: "nilai_residu", label: "Nilai Residu", type: "number" },
        { key: "umur_bulan", label: "Umur (bulan)", type: "number" },
        { key: "metode", label: "Metode", type: "select", options: ["straight_line", "double_declining"] },
        { key: "akumulasi_penyusutan", label: "Akm Penyusutan", type: "number" },
        { key: "nilai_buku", label: "Nilai Buku", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["aktif", "rusak", "dijual", "dihapus"] },
        { key: "coa_aset", label: "COA Aset" },
        { key: "coa_akm_penyusutan", label: "COA Akm Penyusutan" },
        { key: "coa_beban_penyusutan", label: "COA Beban Penyusutan" },
      ]}
      newRow={() => ({ kode: "", nama: "", kategori: "", cost_center_code: "", tanggal_perolehan: new Date().toISOString().slice(0, 10), harga_perolehan: 0, nilai_residu: 0, umur_bulan: 60, metode: "straight_line", akumulasi_penyusutan: 0, nilai_buku: 0, status: "aktif", coa_aset: "", coa_akm_penyusutan: "", coa_beban_penyusutan: "" })}
    />
  ),
});
