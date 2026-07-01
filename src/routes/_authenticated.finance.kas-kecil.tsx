import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/kas-kecil")({
  
  head: () => pageHead({ title: "Kas Kecil — Finance", description: "Kas Kecil pada modul keuangan klinik.", path: "/finance/kas-kecil" }),
  component: () => (
    <MasterCrudPage
      title="Kas Kecil"
      desc="Penerimaan, pengeluaran, dan replenish kas kecil (petty cash)."
      module="kas-kecil"
      table="fin_kas_kecil"
      fields={[
        { key: "no_voucher", label: "No Voucher" },
        { key: "tanggal", label: "Tanggal" },
        { key: "tipe", label: "Tipe", type: "select", options: ["penerimaan", "pengeluaran", "replenish"] },
        { key: "penerima", label: "Penerima/Pembayar" },
        { key: "amount", label: "Jumlah", type: "number" },
        { key: "coa_lawan", label: "COA Lawan" },
        { key: "keterangan", label: "Keterangan" },
        { key: "status", label: "Status", type: "select", options: ["draft", "posted", "void"] },
      ]}
      newRow={() => ({ no_voucher: `KK-${Date.now()}`, tanggal: new Date().toISOString().slice(0, 10), tipe: "pengeluaran", penerima: "", amount: 0, coa_lawan: "", keterangan: "", status: "draft" })}
    />
  ),
});
