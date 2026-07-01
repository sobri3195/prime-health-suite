import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/surat-tagih")({
  
  head: () => pageHead({ title: "Surat Penagihan Asuransi — Finance", description: "Surat Penagihan Asuransi pada modul keuangan klinik.", path: "/finance/surat-tagih" }),
  component: () => (
    <MasterCrudPage
      title="Surat Penagihan Asuransi"
      desc="Surat penagihan ke payer / perusahaan asuransi. Lampirkan periode dan ID invoice."
      module="surat-tagih"
      table="fin_surat_tagih"
      fields={[
        { key: "no_surat", label: "No Surat" },
        { key: "tanggal", label: "Tanggal" },
        { key: "payer_nama", label: "Payer / Asuransi" },
        { key: "periode_dari", label: "Periode Dari" },
        { key: "periode_sampai", label: "Periode Sampai" },
        { key: "total", label: "Total Tagihan", type: "number" },
        { key: "catatan", label: "Catatan" },
        { key: "status", label: "Status", type: "select", options: ["draft", "dikirim", "diterima", "ditolak", "lunas"] },
      ]}
      newRow={() => ({ no_surat: `ST-${Date.now()}`, tanggal: new Date().toISOString().slice(0, 10), payer_nama: "", periode_dari: "", periode_sampai: "", total: 0, catatan: "", status: "draft" })}
    />
  ),
});
