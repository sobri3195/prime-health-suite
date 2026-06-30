import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMasterSnapshot } from "@/lib/finance-dashboard.functions";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/master/")({
  component: MasterFinance,
});

const QUICK_LINKS: { label: string; href: string }[] = [
  { label: "Profil Klinik", href: "/finance/master/profil-klinik" },
  { label: "Dokter", href: "/finance/master/dokter" },
  { label: "Karyawan", href: "/finance/master/karyawan" },
  { label: "Vendor", href: "/finance/master/vendor" },
  { label: "Payer / Asuransi", href: "/finance/master/payer" },
  { label: "COA", href: "/finance/master/coa" },
  { label: "Cost Center", href: "/finance/master/cost-center" },
  { label: "Tarif Pajak", href: "/finance/master/tarif-pajak" },
  { label: "Kategori Layanan", href: "/finance/master/kategori-layanan" },
  { label: "Aturan MDR", href: "/finance/master/mdr" },
  { label: "Template Invoice", href: "/finance/master/template-invoice" },
  { label: "Template Voucher", href: "/finance/master/template-voucher" },
];

function MasterFinance() {
  const call = useServerFn(getMasterSnapshot);
  const q = useQuery({ queryKey: ["fin", "master-snapshot"], queryFn: () => call() });
  const d = q.data;

  return (
    <div>
      <PageHeader title="Master Data Finance" desc="Ringkasan referensi keuangan (live). Buka halaman master untuk CRUD lengkap." />

      <div className="mb-6 flex flex-wrap gap-2">
        {QUICK_LINKS.map((l) => (
          <Button key={l.href} asChild variant="outline" size="sm" className="h-8 gap-1">
            <Link to={l.href}>{l.label} <ExternalLink className="h-3 w-3" /></Link>
          </Button>
        ))}
      </div>

      <Tabs defaultValue="payer">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="payer">Payer ({d?.payers.length ?? 0})</TabsTrigger>
          <TabsTrigger value="vendor">Vendor ({d?.vendors.length ?? 0})</TabsTrigger>
          <TabsTrigger value="coa">COA ({d?.coa.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tax">Pajak ({d?.taxes.length ?? 0})</TabsTrigger>
          <TabsTrigger value="cc">Cost Center ({d?.costCenters.length ?? 0})</TabsTrigger>
          <TabsTrigger value="kat">Kategori Layanan ({d?.kategori.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="payer">
          <Card cols={["Kode", "Nama", "Tipe", "Status"]} rows={(d?.payers ?? []).map((p: any) => [
            <span key="c" className="font-mono text-xs">{p.code ?? "—"}</span>, p.name, p.tipe ?? "—",
            <Badge key="s" variant="secondary">{p.is_active ? "Aktif" : "Nonaktif"}</Badge>,
          ])} loading={q.isLoading} />
        </TabsContent>
        <TabsContent value="vendor">
          <Card cols={["Kode", "Nama", "Kategori", "Status"]} rows={(d?.vendors ?? []).map((v: any) => [
            <span key="c" className="font-mono text-xs">{v.code ?? "—"}</span>, v.name, v.kategori ?? "—",
            <Badge key="s" variant="secondary">{v.is_active ? "Aktif" : "Nonaktif"}</Badge>,
          ])} loading={q.isLoading} />
        </TabsContent>
        <TabsContent value="coa">
          <Card cols={["Kode", "Nama Akun", "Tipe"]} rows={(d?.coa ?? []).map((c: any) => [
            <span key="c" className="font-mono text-xs">{c.code}</span>, c.name,
            <Badge key="t" variant="secondary">{c.type}</Badge>,
          ])} loading={q.isLoading} />
        </TabsContent>
        <TabsContent value="tax">
          <Card cols={["Kode", "Jenis", "Nama", "Tarif"]} rows={(d?.taxes ?? []).map((t: any) => [
            <span key="c" className="font-mono text-xs">{t.code}</span>, t.jenis, t.name,
            `${(Number(t.tarif_pct) || 0).toFixed(1)}%`,
          ])} loading={q.isLoading} />
        </TabsContent>
        <TabsContent value="cc">
          <Card cols={["Kode", "Nama", "Status"]} rows={(d?.costCenters ?? []).map((c: any) => [
            <span key="c" className="font-mono text-xs">{c.code}</span>, c.name,
            <Badge key="s" variant="secondary">{c.is_active ? "Aktif" : "Nonaktif"}</Badge>,
          ])} loading={q.isLoading} />
        </TabsContent>
        <TabsContent value="kat">
          <Card cols={["Kode", "Nama", "Status"]} rows={(d?.kategori ?? []).map((k: any) => [
            <span key="c" className="font-mono text-xs">{k.code ?? "—"}</span>, k.name,
            <Badge key="s" variant="secondary">{k.is_active ? "Aktif" : "Nonaktif"}</Badge>,
          ])} loading={q.isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ cols, rows, loading }: { cols: string[]; rows: React.ReactNode[][]; loading?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader><TableRow>{cols.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={cols.length} className="py-10 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={cols.length} className="py-12 text-center text-sm text-muted-foreground">Tidak ada data. Tambah via halaman master.</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
