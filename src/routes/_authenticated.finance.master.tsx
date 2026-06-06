import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { master } from "@/data/financeData";
import { formatIDR } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/master")({
  component: MasterFinance,
});

const TABS = ["Payer", "Vendor", "COA", "Bank Account", "Kategori Biaya", "Pajak", "Target Revenue", "Mapping Layanan"] as const;
type Tab = (typeof TABS)[number];

function MasterFinance() {
  const [tab, setTab] = useState<Tab>("Payer");

  return (
    <div>
      <PageHeader title="Master Data Finance" desc="Pengaturan referensi keuangan klinik." />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-4 flex-wrap">
          {TABS.map((t) => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="Payer" className="mt-0">
          <Card cols={["ID","Nama","Tipe","Status"]}
            rows={master.payers.map((p) => [p.id, p.name, p.type, <Badge key="s" variant="secondary">{p.status}</Badge>])} />
        </TabsContent>
        <TabsContent value="Vendor" className="mt-0">
          <Card cols={["ID","Nama","Tipe","Status"]}
            rows={master.vendors.map((v) => [v.id, v.name, v.type, <Badge key="s" variant="secondary">{v.status}</Badge>])} />
        </TabsContent>
        <TabsContent value="COA" className="mt-0">
          <Card cols={["Kode","Nama Akun","Tipe"]}
            rows={master.coa.map((c) => [
              <span key="c" className="font-mono text-xs">{c.code}</span>,
              c.name,
              <Badge key="t" variant="secondary">{c.type}</Badge>,
            ])} />
        </TabsContent>
        <TabsContent value="Bank Account" className="mt-0">
          <Card cols={["ID","Bank","No Rekening","Saldo"]}
            rows={master.banks.map((b) => [
              b.id, b.name, <span key="a" className="font-mono">{b.account}</span>,
              <span key="b" className="font-mono">{formatIDR(b.balance)}</span>,
            ])} alignLast />
        </TabsContent>
        <TabsContent value="Kategori Biaya" className="mt-0">
          <Card cols={["ID","Kategori","Akun"]}
            rows={master.costCategories.map((c) => [c.id, c.name, <span key="a" className="font-mono text-xs">{c.account}</span>])} />
        </TabsContent>
        <TabsContent value="Pajak" className="mt-0">
          <Card cols={["ID","Nama Pajak","Tarif"]}
            rows={master.taxes.map((t) => [t.id, t.name, `${(t.rate * 100).toFixed(0)}%`])} />
        </TabsContent>
        <TabsContent value="Target Revenue" className="mt-0">
          <Card cols={["Periode","Target"]}
            rows={master.revenueTargets.map((t) => [t.period, <span key="a" className="font-mono">{formatIDR(t.amount)}</span>])} alignLast />
        </TabsContent>
        <TabsContent value="Mapping Layanan" className="mt-0">
          <Card cols={["Layanan","Akun Pendapatan"]}
            rows={master.serviceMapping.map((m) => [m.service, <span key="a" className="font-mono text-xs">{m.account}</span>])} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ cols, rows, alignLast }: { cols: string[]; rows: React.ReactNode[][]; alignLast?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c, i) => (
              <TableHead key={c} className={alignLast && i === cols.length - 1 ? "text-right" : ""}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={cols.length} className="py-12 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((c, j) => (
                <TableCell key={j} className={alignLast && j === r.length - 1 ? "text-right" : ""}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
