import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FinanceFilter } from "@/types/finance";

interface Props {
  value: FinanceFilter;
  onChange: (v: FinanceFilter) => void;
  doctors: string[];
  services: string[];
}

export function FinanceFilters({ value, onChange, doctors, services }: Props) {
  const set = <K extends keyof FinanceFilter>(k: K, v: FinanceFilter[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select value={value.period} onValueChange={(v) => set("period", v as FinanceFilter["period"])}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hari Ini</SelectItem>
          <SelectItem value="mtd">Bulan Berjalan</SelectItem>
          <SelectItem value="ytd">Tahun Berjalan</SelectItem>
          <SelectItem value="all">Semua Periode</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.payer} onValueChange={(v) => set("payer", v as FinanceFilter["payer"])}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Payer" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Payer</SelectItem>
          <SelectItem value="Umum">Umum</SelectItem>
          <SelectItem value="BPJS">BPJS</SelectItem>
          <SelectItem value="Asuransi">Asuransi</SelectItem>
          <SelectItem value="Perusahaan">Perusahaan</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.doctor} onValueChange={(v) => set("doctor", v)}>
        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Dokter" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Dokter</SelectItem>
          {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.service} onValueChange={(v) => set("service", v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Layanan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Layanan</SelectItem>
          {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.status} onValueChange={(v) => set("status", v as FinanceFilter["status"])}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="partial">Partial</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export const defaultFilter: FinanceFilter = {
  period: "mtd", payer: "all", doctor: "all", service: "all", status: "all",
};
