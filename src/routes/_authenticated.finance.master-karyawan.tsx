import { createFileRoute } from "@tanstack/react-router";
import { MasterCrudPage } from "@/components/master-crud";

export const Route = createFileRoute("/_authenticated/finance/master-karyawan")({
  component: () => (
    <MasterCrudPage
      title="Karyawan"
      desc="Daftar karyawan untuk perhitungan gaji dan PPh 21."
      module="master-karyawan"
      fields={[
        { key: "nik", label: "NIK" },
        { key: "nama", label: "Nama" },
        { key: "departemen", label: "Departemen", type: "select", options: ["Operasional", "Finance", "Front Office", "Apotek", "Perawat"] },
        { key: "jabatan", label: "Jabatan" },
        { key: "gajiPokok", label: "Gaji Pokok", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["Aktif", "Non-Aktif"] },
      ]}
      initial={[
        { nik: "EMP-001", nama: "Sari Wulandari", departemen: "Front Office", jabatan: "Supervisor", gajiPokok: 6500000, status: "Aktif" },
        { nik: "EMP-002", nama: "Andi Pratama", departemen: "Finance", jabatan: "Accounting Officer", gajiPokok: 7500000, status: "Aktif" },
        { nik: "EMP-003", nama: "Rina Sukmawati", departemen: "Perawat", jabatan: "Perawat Senior", gajiPokok: 5800000, status: "Aktif" },
        { nik: "EMP-004", nama: "Budi Hartono", departemen: "Apotek", jabatan: "Apoteker", gajiPokok: 8200000, status: "Aktif" },
        { nik: "EMP-005", nama: "Dewi Lestari", departemen: "Operasional", jabatan: "Admin", gajiPokok: 5200000, status: "Aktif" },
      ]}
      newRow={() => ({ nik: "", nama: "", departemen: "Operasional", jabatan: "", gajiPokok: 0, status: "Aktif" })}
    />
  ),
});
