import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Pencil, Download, ArrowDownUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { listObat, upsertObat, stockMovement, listStockMovement } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/obat")({ component: ObatPage });

type Obat = {
  id: string; code: string; name: string; category: string | null; unit: string;
  stock: number; min_stock: number; price: number; expired_date: string | null; is_active: boolean;
};

function ObatPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listObat);
  const callUpsert = useServerFn(upsertObat);
  const callMove = useServerFn(stockMovement);
  const callMoves = useServerFn(listStockMovement);

  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const [edit, setEdit] = useState<Partial<Obat> | null>(null);
  const [moveFor, setMoveFor] = useState<Obat | null>(null);
  const [moveType, setMoveType] = useState<"in" | "out" | "adjustment">("in");
  const [moveQty, setMoveQty] = useState("");
  const [moveNote, setMoveNote] = useState("");

  const listQ = useQuery({ queryKey: ["klinik","obat",{q,low}], queryFn: () => callList({ data: { q: q || undefined, low_stock_only: low } }) });
  const movesQ = useQuery({ queryKey: ["klinik","stock-mvmt"], queryFn: () => callMoves({ data: {} }) });

  const upsertM = useMutation({ mutationFn: (d: Partial<Obat>) => callUpsert({ data: d as never }),
    onSuccess: () => { toast.success("Obat tersimpan"); qc.invalidateQueries({ queryKey: ["klinik","obat"] }); setEdit(null); },
    onError: (e: Error) => toast.error(e.message) });

  const moveM = useMutation({
    mutationFn: () => callMove({ data: { obat_id: moveFor!.id, movement_type: moveType, quantity: Number(moveQty), note: moveNote } }),
    onSuccess: () => { toast.success("Pergerakan stok tercatat"); qc.invalidateQueries({ queryKey: ["klinik"] }); setMoveFor(null); setMoveQty(""); setMoveNote(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = useMemo(() => (listQ.data ?? []) as Obat[], [listQ.data]);

  function exportCSV() {
    const headers = ["Kode","Nama","Kategori","Satuan","Stok","Min","Harga","Expired"];
    const rows = data.map((o) => [o.code,o.name,o.category,o.unit,o.stock,o.min_stock,o.price,o.expired_date]);
    const csv = [headers,...rows].map((r) => r.map((c)=>`"${(c??"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `obat-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  const lowStockCount = data.filter((o) => Number(o.stock) <= Number(o.min_stock) && o.is_active).length;
  const expSoonCount = data.filter((o) => o.expired_date && new Date(o.expired_date).getTime() < Date.now() + 60 * 864e5).length;

  return (
    <div>
      <PageHeader title="Stok Obat" desc="Master obat & farmasi klinik mata. Catat stok masuk/keluar." />
      {(lowStockCount > 0 || expSoonCount > 0) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {lowStockCount > 0 && (
            <button onClick={() => setLow(true)} className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <span><b>{lowStockCount}</b> obat di bawah stok minimum — klik untuk filter.</span>
            </button>
          )}
          {expSoonCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              <span><b>{expSoonCount}</b> obat kadaluarsa &lt; 60 hari.</span>
            </div>
          )}
        </div>
      )}
      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">Daftar Obat</TabsTrigger><TabsTrigger value="mvmt">Riwayat Stok</TabsTrigger></TabsList>
        <TabsContent value="list" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari obat…" className="pl-9" />
            </div>
            <Button variant={low ? "default" : "outline"} size="sm" onClick={() => setLow(!low)}><AlertTriangle className="mr-1 h-4 w-4" />Stok Rendah</Button>
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
            <Button size="sm" onClick={() => setEdit({ unit: "tablet", stock: 0, min_stock: 0, price: 0, is_active: true })}><Plus className="mr-1 h-4 w-4" />Tambah Obat</Button>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Kategori</TableHead>
                <TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Harga</TableHead>
                <TableHead>Expired</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.length === 0 ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">{listQ.isLoading ? "Memuat…" : "Belum ada obat."}</TableCell></TableRow>
                  : data.map((o) => {
                    const isLow = Number(o.stock) <= Number(o.min_stock);
                    const isExp = o.expired_date && new Date(o.expired_date).getTime() < Date.now() + 60*864e5;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.code}</TableCell>
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell><Badge variant="outline">{o.category ?? "-"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <span className={isLow ? "font-bold text-amber-600" : ""}>{Number(o.stock).toLocaleString("id-ID")} {o.unit}</span>
                        </TableCell>
                        <TableCell className="text-right">Rp {Number(o.price).toLocaleString("id-ID")}</TableCell>
                        <TableCell className={isExp ? "text-red-600 text-xs" : "text-xs"}>{o.expired_date ?? "-"}</TableCell>
                        <TableCell>{isLow ? <Badge variant="destructive">Rendah</Badge> : <Badge className="bg-emerald-500/15 text-emerald-600">Cukup</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => setEdit(o)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setMoveFor(o); setMoveType("in"); }}><ArrowDownUp className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="mvmt">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Obat</TableHead><TableHead>Tipe</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Catatan</TableHead></TableRow></TableHeader>
              <TableBody>
                {((movesQ.data ?? []) as Array<{ id: string; created_at: string; movement_type: string; quantity: number; note: string | null; klinik_obat?: { name: string; unit: string } }>).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{new Date(m.created_at).toLocaleString("id-ID")}</TableCell>
                    <TableCell>{m.klinik_obat?.name ?? "-"}</TableCell>
                    <TableCell><Badge variant={m.movement_type === "in" ? "default" : m.movement_type === "out" ? "destructive" : "secondary"}>{m.movement_type}</Badge></TableCell>
                    <TableCell className="text-right">{Number(m.quantity)} {m.klinik_obat?.unit}</TableCell>
                    <TableCell className="text-xs">{m.note ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit Obat" : "Obat Baru"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kode *</Label><Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></div>
              <div><Label>Nama *</Label><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><Label>Kategori</Label><Input value={edit.category ?? ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></div>
              <div><Label>Satuan</Label><Input value={edit.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></div>
              <div><Label>Stok Awal</Label><Input type="number" value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></div>
              <div><Label>Min Stok</Label><Input type="number" value={edit.min_stock ?? 0} onChange={(e) => setEdit({ ...edit, min_stock: Number(e.target.value) })} /></div>
              <div><Label>Harga</Label><Input type="number" value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
              <div><Label>Tgl Expired</Label><Input type="date" value={edit.expired_date ?? ""} onChange={(e) => setEdit({ ...edit, expired_date: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Batal</Button><Button onClick={() => edit && upsertM.mutate(edit)}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveFor} onOpenChange={(o) => !o && setMoveFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pergerakan Stok — {moveFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipe</Label>
              <Select value={moveType} onValueChange={(v) => setMoveType(v as "in"|"out"|"adjustment")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Masuk (+)</SelectItem>
                  <SelectItem value="out">Keluar (-)</SelectItem>
                  <SelectItem value="adjustment">Penyesuaian (= jumlah)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Jumlah</Label><Input type="number" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} /></div>
            <div><Label>Catatan</Label><Input value={moveNote} onChange={(e) => setMoveNote(e.target.value)} /></div>
            <div className="text-xs text-muted-foreground">Stok sekarang: {moveFor?.stock} {moveFor?.unit}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMoveFor(null)}>Batal</Button><Button disabled={!moveQty || moveM.isPending} onClick={() => moveM.mutate()}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
