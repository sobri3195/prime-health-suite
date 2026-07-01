import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Receipt, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listVisits, getVisitDetail, listLayanan, generateInvoiceFromVisit, listInvoiceForBilling, addInvoicePayment } from "@/lib/klinik.functions";
import { getSettings } from "@/lib/clinic.functions";
import { terbilangRupiah } from "@/lib/terbilang";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export const Route = createFileRoute("/_authenticated/sim-klinik/billing")({ component: BillingPage });

function BillingPage() {
  const qc = useQueryClient();
  const callVisits = useServerFn(listVisits);
  const callDetail = useServerFn(getVisitDetail);
  const callLayanan = useServerFn(listLayanan);
  const callGen = useServerFn(generateInvoiceFromVisit);
  const callInv = useServerFn(listInvoiceForBilling);

  const today = new Date().toISOString().slice(0, 10);
  const [billVisit, setBillVisit] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<{ id: string; no: string; total: number; dibayar: number; name: string | null } | null>(null);

  // Visits ready for billing
  const visitsQ = useQuery({ queryKey: ["klinik","visits-billing"], queryFn: () => callVisits({ data: { status: "billing" } }) });
  const invoicesQ = useQuery({ queryKey: ["klinik","invoices",today], queryFn: () => callInv({ data: {} }) });
  useRealtimeSubscription(
    ["klinik_visit", "fin_invoice", "fin_pembayaran"],
    [["klinik", "visits-billing"], ["klinik", "invoices", today]],
  );

  type Visit = { id: string; visit_date: string; chief_complaint: string | null; apps_pasien?: { no_rm: string; nama: string; patient_type: string }; fin_dokter?: { name: string } };
  const visits = (visitsQ.data ?? []) as Visit[];

  return (
    <div>
      <PageHeader title="Kasir & Billing" desc="Generate invoice dari kunjungan dan catat pembayaran." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold">Pasien Siap Bayar ({visits.length})</h3>
          <div className="space-y-2">
            {visits.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada pasien menunggu billing.</p>
              : visits.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded border p-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{v.apps_pasien?.nama}</div>
                    <div className="text-xs text-muted-foreground">{v.apps_pasien?.no_rm} • {v.fin_dokter?.name} • <Badge variant="outline" className="text-[10px]">{v.apps_pasien?.patient_type}</Badge></div>
                  </div>
                  <Button asChild size="sm" variant="ghost" title="Lihat detail kunjungan">
                    <Link to="/sim-klinik/$section" params={{ section: v.id }}>Detail</Link>
                  </Button>
                  <Button size="sm" onClick={() => setBillVisit(v.id)}><Receipt className="mr-1 h-3 w-3" />Buat Invoice</Button>
                </div>
              ))}
          </div>
        </Card>
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold">Invoice Terbaru</h3>
          <Table>
            <TableHeader><TableRow><TableHead>No</TableHead><TableHead>Pasien</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {((invoicesQ.data ?? []) as Array<{ id: string; no_invoice: string; patient_name: string | null; status: string; total: number; dibayar: number | null }>).slice(0, 12).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.no_invoice}</TableCell>
                  <TableCell className="text-sm">{i.patient_name}</TableCell>
                  <TableCell><Badge variant={i.status === "paid" ? "default" : i.status === "partial" ? "secondary" : "destructive"}>{i.status}</Badge></TableCell>
                  <TableCell className="text-right">Rp {Number(i.total).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    {i.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => setPayInvoice({ id: i.id, no: i.no_invoice, total: Number(i.total), dibayar: Number(i.dibayar ?? 0), name: i.patient_name })}>
                        Tambah Bayar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>


      {billVisit && <BillingDialog visit_id={billVisit} onClose={() => setBillVisit(null)}
        callDetail={callDetail} callLayanan={callLayanan} callGen={callGen}
        onCreated={() => { qc.invalidateQueries({ queryKey: ["klinik"] }); setBillVisit(null); }} />}
      {payInvoice && <AddPaymentDialog invoice={payInvoice} onClose={() => setPayInvoice(null)}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["klinik"] }); setPayInvoice(null); }} />}
    </div>
  );
}

function AddPaymentDialog({ invoice, onClose, onSaved }: {
  invoice: { id: string; no: string; total: number; dibayar: number; name: string | null };
  onClose: () => void; onSaved: () => void;
}) {
  const sisa = Math.max(0, invoice.total - invoice.dibayar);
  const [amount, setAmount] = useState<number>(sisa);
  const [method, setMethod] = useState<"cash"|"transfer"|"qris"|"debit"|"credit"|"insurance">("cash");
  const call = useServerFn(addInvoicePayment);
  const m = useMutation({
    mutationFn: () => call({ data: { invoice_id: invoice.id, amount, method } }),
    onSuccess: () => { toast.success("Pembayaran tercatat"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Bayar — {invoice.no}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 text-sm">
          <div>Pasien: <b>{invoice.name ?? "—"}</b></div>
          <div className="grid grid-cols-3 gap-2 rounded border p-2 text-xs">
            <div>Total<br /><b>Rp {invoice.total.toLocaleString("id-ID")}</b></div>
            <div>Dibayar<br /><b>Rp {invoice.dibayar.toLocaleString("id-ID")}</b></div>
            <div>Sisa<br /><b>Rp {sisa.toLocaleString("id-ID")}</b></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="pay-amt">Jumlah Bayar</Label>
            <Input id="pay-amt" type="number" min={1} max={sisa} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Metode</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai</SelectItem><SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem><SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="credit">Kredit</SelectItem><SelectItem value="insurance">Asuransi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={m.isPending || amount <= 0 || amount > sisa} onClick={() => m.mutate()}>
            {m.isPending ? "Menyimpan…" : "Simpan Pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function BillingDialog({ visit_id, onClose, callDetail, callLayanan, callGen, onCreated }: {
  visit_id: string; onClose: () => void;
  callDetail: (a: { data: { id: string } }) => Promise<unknown>;
  callLayanan: () => Promise<unknown>;
  callGen: (a: { data: unknown }) => Promise<unknown>;
  onCreated: () => void;
}) {
  const detailQ = useQuery({ queryKey: ["klinik","visit-bill",visit_id], queryFn: () => callDetail({ data: { id: visit_id } }) });
  const layananQ = useQuery({ queryKey: ["klinik","layanan"], queryFn: () => callLayanan() });
  const callSettings = useServerFn(getSettings);
  const settingsQ = useQuery({ queryKey: ["clinic","settings"], queryFn: () => callSettings(), staleTime: 60_000 });

  type Item = { description: string; quantity: number; unit_price: number; layanan_id: string | null };
  const [items, setItems] = useState<Item[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState<"cash"|"transfer"|"qris"|"debit"|"credit"|"insurance">("cash");

  type Detail = { visit: { id: string; apps_pasien?: { nama: string; no_rm: string; patient_type: string }; fin_dokter?: { name: string } }; prescriptions: Array<{ klinik_prescription_item: Array<{ obat_name: string; quantity: number; unit_price: number }> }> };
  const detail = detailQ.data as Detail | undefined;

  // Pre-fill prescription items as line items on first load
  useEffect(() => {
    if (!detail) return;
    const pres: Item[] = [];
    detail.prescriptions.forEach((p) => p.klinik_prescription_item.forEach((it) => pres.push({
      description: `Obat: ${it.obat_name}`, quantity: it.quantity, unit_price: it.unit_price, layanan_id: null,
    })));
    setItems(pres);
  }, [detail]);

  const layanan = (layananQ.data ?? []) as Array<{ id: string; name: string; tarif: number }>;
  const subtotal = items.reduce((a, b) => a + b.quantity * b.unit_price, 0);
  const total = Math.max(0, subtotal - discount);

  const genM = useMutation({
    mutationFn: () => callGen({ data: { visit_id, items, payment_method: method, paid_amount: paid, discount } }),
    onSuccess: (i) => { toast.success("Invoice dibuat"); onCreated(); printInvoice(i as Inv); },
    onError: (e: Error) => toast.error(e.message),
  });

  type Inv = { no_invoice: string; patient_name: string | null; total: number; tanggal: string };
  function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string)); }
  function printInvoice(inv: Inv) {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    const profile = (settingsQ.data?.profile ?? {}) as Record<string, string | number | boolean>;
    const clinicName = String(profile.clinicName ?? "Klinik");
    const address = String(profile.address ?? "");
    const phone = String(profile.phone ?? "");
    const email = String(profile.email ?? "");
    const taxId = String(profile.taxId ?? "");
    w.document.write(`<html><head><title>${escapeHtml(inv.no_invoice)}</title><style>body{font-family:sans-serif;padding:20px;font-size:12px}h2{margin:0}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:2px 0}.r{text-align:right}.b{border-top:1px solid #333;margin-top:8px;padding-top:8px}.muted{color:#666;font-size:11px}</style></head><body>
      <h2>${escapeHtml(clinicName)}</h2>
      ${address ? `<div class="muted">${escapeHtml(address)}</div>` : ""}
      ${(phone || email) ? `<div class="muted">${escapeHtml([phone, email].filter(Boolean).join(" • "))}</div>` : ""}
      ${taxId ? `<div class="muted">NPWP: ${escapeHtml(taxId)}</div>` : ""}
      <div class="b">Invoice: <b>${escapeHtml(inv.no_invoice)}</b><br>Tanggal: ${escapeHtml(inv.tanggal)}<br>Pasien: ${escapeHtml(inv.patient_name ?? "-")}</div>
      <table>${items.map((it) => `<tr><td>${escapeHtml(it.description)}</td><td class="r">${it.quantity} x ${it.unit_price.toLocaleString("id-ID")}</td><td class="r">${(it.quantity*it.unit_price).toLocaleString("id-ID")}</td></tr>`).join("")}</table>
      <div class="b"><table><tr><td>Subtotal</td><td class="r">${subtotal.toLocaleString("id-ID")}</td></tr>
      <tr><td>Diskon</td><td class="r">${discount.toLocaleString("id-ID")}</td></tr>
      <tr><td><b>TOTAL</b></td><td class="r"><b>${total.toLocaleString("id-ID")}</b></td></tr>
      <tr><td>Dibayar (${escapeHtml(method)})</td><td class="r">${paid.toLocaleString("id-ID")}</td></tr></table></div>
      <div class="b" style="text-align:center">Terima kasih</div>
      <script>window.print()</script></body></html>`);
  }

  const addLayanan = (l: { id: string; name: string; tarif: number }) => setItems([...items, { description: l.name, quantity: 1, unit_price: Number(l.tarif), layanan_id: l.id }]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Generate Invoice — {detail?.visit?.apps_pasien?.nama}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-[1fr_280px] gap-4">
          <div>
            <Label className="text-xs">Pilih Tindakan/Layanan</Label>
            <div className="mb-3 max-h-32 overflow-y-auto rounded border p-1">
              {layanan.map((l) => <button key={l.id} onClick={() => addLayanan(l)} className="block w-full px-2 py-1 text-left text-xs hover:bg-muted/40">{l.name} <span className="float-right">Rp {Number(l.tarif).toLocaleString("id-ID")}</span></button>)}
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Deskripsi</TableHead><TableHead className="w-16">Qty</TableHead><TableHead>Harga</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Input value={it.description} onChange={(e) => { const c=[...items]; c[idx].description=e.target.value; setItems(c); }} /></TableCell>
                    <TableCell><Input type="number" value={it.quantity} onChange={(e) => { const c=[...items]; c[idx].quantity=Number(e.target.value); setItems(c); }} /></TableCell>
                    <TableCell><Input type="number" value={it.unit_price} onChange={(e) => { const c=[...items]; c[idx].unit_price=Number(e.target.value); setItems(c); }} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_,i)=>i!==idx))}><Trash2 className="h-3 w-3"/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, layanan_id: null }])}><Plus className="mr-1 h-3 w-3" />Item manual</Button>
          </div>
          <div className="space-y-2">
            <div className="rounded border p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>Rp {subtotal.toLocaleString("id-ID")}</span></div>
              <div className="mt-2"><Label>Diskon</Label><Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
              <div className="mt-2 flex justify-between font-bold"><span>TOTAL</span><span>Rp {total.toLocaleString("id-ID")}</span></div>
              <div className="mt-2"><Label>Metode Bayar</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Tunai</SelectItem><SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem><SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Kredit</SelectItem><SelectItem value="insurance">Asuransi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2"><Label>Dibayar</Label><Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} /></div>
              <div className="mt-1 text-xs text-muted-foreground">
                {paid >= total ? "Lunas" : paid > 0 ? `Sisa Rp ${(total-paid).toLocaleString("id-ID")}` : "Belum bayar"}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={items.length === 0 || genM.isPending} onClick={() => genM.mutate()}><Printer className="mr-1 h-4 w-4" />Buat & Cetak Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
