import { pageHead } from "@/lib/page-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMaster } from "@/lib/klinik.functions";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink, Search, Database } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/sim-klinik/master")({
  head: () => pageHead({ title: 'Master Data — SIM Klinik', description: 'Master dokter, payer, tarif, dan referensi klinik terintegrasi Finance.', path: '/sim-klinik/master' }),
  component: MasterPage,
});

type Row = { id: string; code: string; name: string; meta: string; status: string };

type Tab = {
  key: string;
  label: string;
  table: string;
  select: string;
  manageHref?: string;
  map: (r: any) => Row;
};

const TABS: Tab[] = [
  {
    key: "dokter",
    label: "Dokter",
    table: "fin_dokter",
    select: "id,code,name,spesialisasi,sip_number,is_active",
    manageHref: "/finance/master/dokter",
    map: (r) => ({
      id: r.id,
      code: r.code ?? "-",
      name: r.name,
      meta: [r.spesialisasi, r.sip_number && `SIP ${r.sip_number}`].filter(Boolean).join(" • ") || "-",
      status: r.is_active ? "Aktif" : "Nonaktif",
    }),
  },
  {
    key: "payer",
    label: "Payer / Asuransi",
    table: "fin_payer",
    select: "id,code,name,jenis,is_active",
    manageHref: "/finance/master/payer",
    map: (r) => ({
      id: r.id, code: r.code ?? "-", name: r.name,
      meta: r.jenis ?? "-",
      status: r.is_active ? "Aktif" : "Nonaktif",
    }),
  },
  {
    key: "layanan",
    label: "Layanan / Tindakan",
    table: "fin_layanan",
    select: "id,code,name,kategori_id,tarif,is_active",
    map: (r) => ({
      id: r.id, code: r.code ?? "-", name: r.name,
      meta: r.tarif != null ? `Tarif Rp ${Number(r.tarif).toLocaleString("id-ID")}` : "-",
      status: r.is_active ? "Aktif" : "Nonaktif",
    }),
  },
  {
    key: "kategori_layanan",
    label: "Kategori Layanan",
    table: "fin_kategori_layanan",
    select: "id,code,name,is_active",
    map: (r) => ({
      id: r.id, code: r.code ?? "-", name: r.name, meta: "-",
      status: r.is_active ? "Aktif" : "Nonaktif",
    }),
  },
  {
    key: "obat",
    label: "Obat / Farmasi",
    table: "klinik_obat",
    select: "id,code,name,unit,stock,price,is_active",
    map: (r) => ({
      id: r.id, code: r.code ?? "-", name: r.name,
      meta: `Stok ${r.stock ?? 0} ${r.unit ?? ""} • Rp ${Number(r.price ?? 0).toLocaleString("id-ID")}`,
      status: r.is_active ? "Aktif" : "Nonaktif",
    }),
  },
  {
    key: "jadwal",
    label: "Jadwal Dokter",
    table: "klinik_jadwal",
    select: "id,dokter_name,poli,day,start_time,end_time,quota,is_active",
    map: (r) => ({
      id: r.id, code: r.poli ?? "-", name: r.dokter_name,
      meta: `${r.day} ${r.start_time}–${r.end_time} • Kuota ${r.quota}`,
      status: r.is_active ? "Aktif" : "Nonaktif",
    }),
  },
];

function MasterPage() {
  const [tabKey, setTabKey] = useState(TABS[0].key);
  const [q, setQ] = useState("");
  const tab = TABS.find((t) => t.key === tabKey)!;

  const callList = useServerFn(listMaster);
  const { data = [], isLoading, error } = useQuery<Row[]>({
    queryKey: ["sim-master", tab.key],
    queryFn: async () => {
      const rows = await callList({ data: { key: tab.key as "dokter"|"payer"|"layanan"|"kategori_layanan"|"obat"|"jadwal" } });
      return (rows ?? []).map(tab.map);
    },
  });

  const rows = useMemo(() => {
    if (!q) return data;
    const k = q.toLowerCase();
    return data.filter((r) => `${r.name} ${r.code} ${r.meta}`.toLowerCase().includes(k));
  }, [data, q]);

  return (
    <div>
      <PageHeader
        title="Master Data Klinik"
        desc="Data master terhubung langsung ke Finance & Klinik: dokter, payer, layanan, obat, jadwal."
      />

      <Tabs value={tabKey} onValueChange={(v) => { setTabKey(v); setQ(""); }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-wrap">
            {TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
          </TabsList>
          <div className="flex items-center gap-2">
            {tab.manageHref && (
              <Button asChild variant="outline" size="sm">
                <Link to={tab.manageHref}>
                  Kelola di Finance <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari di ${tab.label}…`} className="pl-9" />
            </div>
          </div>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-0">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">Memuat data…</TableCell></TableRow>
                  ) : error ? (
                    <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-destructive">Gagal memuat data.</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <EmptyState
                      inTableColSpan={4}
                      icon={Database}
                      title={`Tidak ada data ${t.label.toLowerCase()}`}
                      description={q ? "Coba ubah kata kunci pencarian." : "Data akan muncul setelah ditambahkan pada modul terkait."}
                    />
                  ) : rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.meta}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.status === "Aktif" ? "default" : "secondary"}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
