import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/page-head";
import { MasterCrudPage } from "@/components/master-crud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generatePenyusutan, postPenyusutanPeriode } from "@/lib/finance-aset.functions";

export const Route = createFileRoute("/_authenticated/finance/aset-penyusutan")({
  head: () =>
    pageHead({
      title: "Penyusutan Aset — Finance",
      description: "Generate & posting penyusutan aset bulanan (garis lurus).",
      path: "/finance/aset-penyusutan",
    }),
  component: PenyusutanPage,
});

function PenyusutanPage() {
  const qc = useQueryClient();
  const genFn = useServerFn(generatePenyusutan);
  const postFn = useServerFn(postPenyusutanPeriode);
  const [asetId, setAsetId] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 7));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 7));
  const [periode, setPeriode] = useState(new Date().toISOString().slice(0, 7));

  const { data: asetList } = useQuery({
    queryKey: ["fin_aset_options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fin_aset").select("id,kode,nama").order("kode");
      if (error) throw error;
      return data ?? [];
    },
  });

  const genMut = useMutation({
    mutationFn: (v: { aset_id: string; from: string; to: string }) => genFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`${r.created} baris penyusutan dibuat`);
      qc.invalidateQueries({ queryKey: ["master-crud", "fin_aset_penyusutan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const postMut = useMutation({
    mutationFn: (v: { periode: string }) => postFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`${r.posted} jurnal penyusutan diposting`);
      qc.invalidateQueries({ queryKey: ["master-crud", "fin_aset_penyusutan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Generate Jadwal Penyusutan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Aset</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={asetId}
                onChange={(e) => setAsetId(e.target.value)}
                aria-label="Pilih aset"
              >
                <option value="">— pilih aset —</option>
                {asetList?.map((a) => (
                  <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Dari (YYYY-MM)</Label>
                <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01" />
              </div>
              <div>
                <Label>Sampai (YYYY-MM)</Label>
                <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-12" />
              </div>
            </div>
            <Button
              disabled={!asetId || genMut.isPending}
              onClick={() => genMut.mutate({ aset_id: asetId, from, to })}
            >
              {genMut.isPending ? "Memproses…" : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Posting Penyusutan per Periode</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Periode (YYYY-MM)</Label>
              <Input value={periode} onChange={(e) => setPeriode(e.target.value)} />
            </div>
            <Button
              variant="default"
              disabled={postMut.isPending}
              onClick={() => postMut.mutate({ periode })}
            >
              {postMut.isPending ? "Memposting…" : "Post ke Jurnal"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Membuat jurnal: D Beban Penyusutan / K Akumulasi Penyusutan untuk semua baris belum-posted pada periode ini.
            </p>
          </CardContent>
        </Card>
      </div>

      <MasterCrudPage
        title="Jadwal Penyusutan"
        desc="Straight-line: (Harga − Residu) ÷ Umur (bulan). Akumulasi & nilai buku aset otomatis ter-update."
        module="aset-penyusutan"
        table="fin_aset_penyusutan"
        fields={[
          { key: "aset_id", label: "Aset (UUID)" },
          { key: "periode", label: "Periode (YYYY-MM)" },
          { key: "tanggal", label: "Tanggal" },
          { key: "beban", label: "Beban", type: "number" },
          { key: "akumulasi", label: "Akumulasi", type: "number" },
          { key: "nilai_buku", label: "Nilai Buku", type: "number" },
          { key: "posted", label: "Posted", type: "boolean" },
        ]}
        newRow={() => ({
          aset_id: "",
          periode: new Date().toISOString().slice(0, 7),
          tanggal: new Date().toISOString().slice(0, 10),
          beban: 0,
          akumulasi: 0,
          nilai_buku: 0,
          posted: false,
        })}
      />
    </div>
  );
}
