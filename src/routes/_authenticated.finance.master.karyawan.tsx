import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master/karyawan")({
  
  head: () => pageHead({ title: "Karyawan — Finance", description: "Karyawan pada modul keuangan klinik.", path: "/finance/master/karyawan" }),
  component: () => (
    <MasterCrudPage
      title="Karyawan"
      desc="Daftar karyawan & gaji pokok untuk payroll."
      module="master-karyawan"
      table="fin_karyawan"
      fields={[
        { key: "code", label: "Kode" },
        { key: "name", label: "Nama" },
        { key: "jabatan", label: "Jabatan" },
        { key: "gaji_pokok", label: "Gaji Pokok", type: "number" },
        { key: "npwp", label: "NPWP" },
        { key: "is_active", label: "Aktif", type: "boolean" },
      ]}
      newRow={() => ({ code: "", name: "", jabatan: "", gaji_pokok: 0, npwp: "", is_active: true })}
    />
  ),
});
