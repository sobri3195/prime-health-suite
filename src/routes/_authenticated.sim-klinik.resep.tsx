import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { listPrescription, dispensePrescription } from "@/lib/klinik.functions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export const Route = createFileRoute("/_authenticated/sim-klinik/resep")({
  head: () => pageHead({ title: 'Resep Elektronik — SIM Klinik', description: 'Peresepan obat, cek stok, dan interaksi obat.', path: '/sim-klinik/resep' }),
  component: ResepPage,
});

const STATUS_LABEL: Record<string, string> = { draft: "Draft", sent_to_pharmacy: "Menunggu Farmasi", dispensed: "Sudah Diberikan", cancelled: "Batal" };

function ResepPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listPrescription);
  const callDispense = useServerFn(dispensePrescription);
  const [status, setStatus] = useState("sent_to_pharmacy");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: ["klinik","prescriptions",status], queryFn: () => callList({ data: { status } }), refetchInterval: 10000 });
  const dispM = useMutation({
    mutationFn: (id: string) => callDispense({ data: { id } }),
    onSuccess: () => { toast.success("Resep diberikan, stok berkurang"); qc.invalidateQueries({ queryKey: ["klinik"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  type Item = { id: string; obat_name: string; dosage: string | null; frequency: string | null; duration: string | null; quantity: number };
  type Pres = { id: string; status: string; created_at: string; notes: string | null; apps_pasien?: { no_rm: string; nama: string }; fin_dokter?: { name: string }; klinik_prescription_item: Item[] };
  const rows = (listQ.data ?? []) as Pres[];

  return (
    <div>
      <PageHeader title="Farmasi & Resep" desc="Daftar resep dari dokter — verifikasi dan beri obat ke pasien." />
      <div className="mb-4 flex items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{rows.length} resep</div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">Tidak ada resep.</Card>
          : rows.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{p.apps_pasien?.nama ?? "-"} <span className="text-xs text-muted-foreground">({p.apps_pasien?.no_rm})</span></div>
                  <div className="text-xs text-muted-foreground">{p.fin_dokter?.name} • {new Date(p.created_at).toLocaleString("id-ID")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "dispensed" ? "default" : "secondary"}>{STATUS_LABEL[p.status]}</Badge>
                  {p.status === "sent_to_pharmacy" && (
                    <Button size="sm" onClick={() => setConfirmId(p.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />Dispense
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-2 space-y-1 border-t pt-2">
                {p.klinik_prescription_item.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-sm">
                    <Pill className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{it.obat_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {it.dosage} • {it.frequency} • {it.duration} • Qty {it.quantity}
                    </span>
                  </div>
                ))}
              </div>
              {p.notes && <div className="mt-2 text-xs italic text-muted-foreground">Catatan: {p.notes}</div>}
            </Card>
          ))}
      </div>
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Dispense Resep"
        description="Beri obat ini ke pasien? Stok akan berkurang otomatis."
        confirmLabel="Ya, Beri Obat"
        onConfirm={() => { if (confirmId) dispM.mutate(confirmId); setConfirmId(null); }}
      />
    </div>
  );
}
