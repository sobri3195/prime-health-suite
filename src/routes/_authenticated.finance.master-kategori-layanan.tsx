import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master-kategori-layanan")({
  component: () => (
    <MasterCrudPage
      title="Kategori Layanan"
      desc="Grouping layanan klinik untuk pelaporan."
      module="master-kategori-layanan"
      table="fin_kategori_layanan"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama Kategori" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", is_active: true })}
    />
  ),
});
