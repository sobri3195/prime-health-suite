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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { listTplVoucher, upsertTplVoucher, deleteTplVoucher } from "@/lib/finance-template.functions";
import { useFinanceAccess } from "@/lib/finance-access";

export const Route = createFileRoute("/_authenticated/finance/master-template-voucher")({
  component: TplVoucherPage,
});

type Tpl = { id: string; nama: string; coa_code: string | null; cost_center_code: string | null; metode: string; pajak_pct: number; keterangan: string | null; is_active: boolean };
type Item = { id?: string; template_id?: string; deskripsi: string; coa_code: string | null; qty: number; harga: number };

function TplVoucherPage() {
  const { canEdit, user } = useFinanceAccess();
  const qc = useQueryClient();
  const list = useServerFn(listTplVoucher);
  const save = useServerFn(upsertTplVoucher);
  const del = useServerFn(deleteTplVoucher);
  const { data } = useQuery({ queryKey: ["tpl-voucher"], queryFn: () => list() });
  const rows: Tpl[] = (data?.rows ?? []) as Tpl[];
  const allItems: Item[] = (data?.items ?? []) as Item[];
  const itemsByTpl = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of allItems) { const k = it.template_id!; if (!m.has(k)) m.set(k, []); m.get(k)!.push(it); }
    return m;
  }, [allItems]);

  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<Partial<Tpl>>({});
  const [items, setItems] = useState<Item[]>([]);

  const openNew = () => { setTpl({ nama: "", metode: "transfer", pajak_pct: 0, is_active: true }); setItems([{ deskripsi: "", coa_code: "", qty: 1, harga: 0 }]); setOpen(true); };
  const openEdit = (r: Tpl) => { setTpl(r); setItems(itemsByTpl.get(r.id) ?? []); setOpen(true); };

  const saveM = useMutation({
    mutationFn: () => save({ data: { ...(tpl as any), items, actor: user?.email } }),
    onSuccess: () => { toast.success("Template tersimpan"); qc.invalidateQueries({ queryKey: ["tpl-voucher"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({ mutationFn: (id: string) => del({ data: { id, actor: user?.email } }), onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tpl-voucher"] }); } });

  return (
    <div>
      <PageHeader title="Template Voucher" desc="Template pengeluaran berulang (sewa, utilitas, dst.) — termasuk COA biaya default." />
      <div className="mb-3 flex justify-end"><Button disabled={!canEdit} onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Template Baru</Button></div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>COA</TableHead><TableHead>Metode</TableHead><TableHead className="text-right"># Item</TableHead><TableHead className="text-right">Pajak</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Belum ada template.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{r.coa_code || "—"}</TableCell>
                  <TableCell className="uppercase text-xs">{r.metode}</TableCell>
                  <TableCell className="text-right">{itemsByTpl.get(r.id)?.length ?? 0}</TableCell>
                  <TableCell className="text-right">{Number(r.pajak_pct)}%</TableCell>
                  <TableCell>{r.is_active ? <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => confirm("Hapus?") && delM.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{tpl.id ? "Edit" : "Tambah"} Template Voucher</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Nama</Label><Input value={tpl.nama ?? ""} onChange={(e) => setTpl({ ...tpl, nama: e.target.value })} /></div>
              <div><Label>COA Biaya Default</Label><Input value={tpl.coa_code ?? ""} onChange={(e) => setTpl({ ...tpl, coa_code: e.target.value })} placeholder="5000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Metode</Label>
                <Select value={tpl.metode} onValueChange={(v) => setTpl({ ...tpl, metode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["cash", "transfer", "debit", "credit", "qris"].map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>PPN %</Label><Input type="number" value={tpl.pajak_pct ?? 0} onChange={(e) => setTpl({ ...tpl, pajak_pct: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Keterangan</Label><Textarea rows={2} value={tpl.keterangan ?? ""} onChange={(e) => setTpl({ ...tpl, keterangan: e.target.value })} /></div>
            <div>
              <div className="mb-1 flex items-center justify-between"><Label>Item Default</Label><Button size="sm" variant="outline" onClick={() => setItems([...items, { deskripsi: "", coa_code: "", qty: 1, harga: 0 }])}><Plus className="mr-1 h-3 w-3" /> Baris</Button></div>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_80px_120px_40px] gap-2">
                    <Input placeholder="Deskripsi" value={it.deskripsi} onChange={(e) => { const a = [...items]; a[i] = { ...it, deskripsi: e.target.value }; setItems(a); }} />
                    <Input placeholder="COA" value={it.coa_code ?? ""} onChange={(e) => { const a = [...items]; a[i] = { ...it, coa_code: e.target.value }; setItems(a); }} />
                    <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => { const a = [...items]; a[i] = { ...it, qty: Number(e.target.value) }; setItems(a); }} />
                    <Input type="number" placeholder="Harga" value={it.harga} onChange={(e) => { const a = [...items]; a[i] = { ...it, harga: Number(e.target.value) }; setItems(a); }} />
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
