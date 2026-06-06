import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { masterData, masterCategories } from "@/data/clinicData";

export const Route = createFileRoute("/_authenticated/sim-klinik/master")({
  component: MasterPage,
});

function MasterPage() {
  const [tab, setTab] = useState(masterCategories[0]);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = masterData[tab] ?? [];
    return q ? all.filter((r) => `${r.name} ${r.meta ?? ""}`.toLowerCase().includes(q.toLowerCase())) : all;
  }, [tab, q]);

  return (
    <div>
      <PageHeader title="Master Data Klinik" desc="Pengelolaan data master: dokter, poli, tindakan, tarif, payer, obat, ruangan." />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setQ(""); }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-wrap">
            {masterCategories.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
          </TabsList>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari di ${tab}…`} className="pl-9" />
          </div>
        </div>

        {masterCategories.map((c) => (
          <TabsContent key={c} value={c} className="mt-0">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">ID</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.meta ?? "-"}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">{r.extra ?? "—"}</Badge></TableCell>
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
