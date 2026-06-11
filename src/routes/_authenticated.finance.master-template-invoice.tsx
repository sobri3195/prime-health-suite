import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { listTplInvoice, upsertTplInvoice, deleteTplInvoice } from "@/lib/finance-template.functions";
import { useFinanceAccess } from "@/lib/finance-access";

export const Route = createFileRoute("/_authenticated/finance/master-template-invoice")({
  component: TplInvoicePage,
});

type Tpl = { id: string; nama: string; kategori: string | null; pajak_pct: number; diskon: number; catatan: string | null; is_active: boolean };
type Item = { id?: string; template_id?: string; layanan_nama: string; tarif: number; qty: number };

function TplInvoicePage() {
  const { canEdit, user } = useFinanceAccess();
  const qc = useQueryClient();
  const list = useServerFn(listTplInvoice);
  const save = useServerFn(upsertTplInvoice);
  const del = useServerFn(deleteTplInvoice);
  const { data } = useQuery({ queryKey: ["tpl-invoice"], queryFn: () => list() });
  const rows: Tpl[] = (data?.rows ?? []) as Tpl[];
  const allItems: Item[] = (data?.items ?? []) as Item[];
  const itemsByTpl = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of allItems) {
      const k = it.template_id!;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [allItems]);

  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<Partial<Tpl>>({});
  const [items, setItems] = useState<Item[]>([]);

  const openNew = () => { setTpl({ nama: "", pajak_pct: 0, diskon: 0, is_active: true }); setItems([{ layanan_nama: "", tarif: 0, qty: 1 }]); setOpen(true); };
  const openEdit = (r: Tpl) => { setTpl(r); setItems(itemsByTpl.get(r.id) ?? []); setOpen(true); };

  const saveM = useMutation({
    mutationFn: () => save({ data: { ...(tpl as any), items, actor: user?.email } }),
    onSuccess: () => { toast.success("Template tersimpan"); qc.invalidateQueries({ queryKey: ["tpl-invoice"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id, actor: user?.email } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tpl-invoice"] }); },
  });

  return (
    <div>
      <PageHeader title="Template Invoice" desc="Definisikan kombinasi layanan + tarif yang sering dipakai supaya kasir tinggal pilih." />
      <div className="mb-3 flex justify-end"><Button onClick={openNew} disabled={!canEdit}><Plus className="mr-1 h-4 w-4" /> Template Baru</Button></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Kategori</TableHead><TableHead className="text-right"># Item</TableHead><TableHead className="text-right">Pajak</TableHead><TableHead className="text-right">Diskon</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Belum ada template.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell>{r.kategori || "—"}</TableCell>
                  <TableCell className="text-right">{itemsByTpl.get(r.id)?.length ?? 0}</TableCell>
                  <TableCell className="text-right">{Number(r.pajak_pct)}%</TableCell>
                  <TableCell className="text-right">{Number(r.diskon).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{r.is_active ? <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => confirm("Hapus template?") && delM.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{tpl.id ? "Edit" : "Tambah"} Template Invoice</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Nama Template</Label><Input value={tpl.nama ?? ""} onChange={(e) => setTpl({ ...tpl, nama: e.target.value })} /></div>
              <div><Label>Kategori</Label><Input value={tpl.kategori ?? ""} onChange={(e) => setTpl({ ...tpl, kategori: e.target.value })} placeholder="Konsultasi, Operasi…" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Pajak %</Label><Input type="number" value={tpl.pajak_pct ?? 0} onChange={(e) => setTpl({ ...tpl, pajak_pct: Number(e.target.value) })} /></div>
              <div><Label>Diskon (Rp)</Label><Input type="number" value={tpl.diskon ?? 0} onChange={(e) => setTpl({ ...tpl, diskon: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Catatan</Label><Textarea rows={2} value={tpl.catatan ?? ""} onChange={(e) => setTpl({ ...tpl, catatan: e.target.value })} /></div>
            <div>
              <div className="mb-1 flex items-center justify-between"><Label>Item Default</Label><Button size="sm" variant="outline" onClick={() => setItems([...items, { layanan_nama: "", tarif: 0, qty: 1 }])}><Plus className="mr-1 h-3 w-3" /> Baris</Button></div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_80px_40px] gap-2">
                    <Input placeholder="Nama layanan" value={it.layanan_nama} onChange={(e) => { const a = [...items]; a[i] = { ...it, layanan_nama: e.target.value }; setItems(a); }} />
                    <Input type="number" placeholder="Tarif" value={it.tarif} onChange={(e) => { const a = [...items]; a[i] = { ...it, tarif: Number(e.target.value) }; setItems(a); }} />
                    <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => { const a = [...items]; a[i] = { ...it, qty: Number(e.target.value) }; setItems(a); }} />
                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
