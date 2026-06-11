import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/persediaan")({
  component: () => (
    <MasterCrudPage
      title="Master Persediaan"
      desc="Daftar barang/inventory yang dikelola klinik."
      module="persediaan"
      table="fin_persediaan"
      fields={[
        { key: "kode", label: "Kode" },
        { key: "nama", label: "Nama" },
        { key: "satuan", label: "Satuan" },
        { key: "kategori", label: "Kategori" },
        { key: "harga_beli", label: "Harga Beli", type: "number" },
        { key: "harga_jual", label: "Harga Jual", type: "number" },
        { key: "stok", label: "Stok", type: "number" },
        { key: "min_stok", label: "Min Stok", type: "number" },
        { key: "coa_persediaan", label: "COA Persediaan" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ kode: "", nama: "", satuan: "pcs", kategori: "", harga_beli: 0, harga_jual: 0, stok: 0, min_stok: 0, coa_persediaan: "", is_active: true })}
    />
  ),
});
