import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/master-profil-klinik")({
  component: ProfilKlinik,
});

function ProfilKlinik() {
  const [data, setData] = useState({
    nama: "Klinik Mata Prime",
    npwp: "01.234.567.8-901.000",
    alamat: "Jl. Sehat No. 88, Jakarta",
    telp: "021-555-0188",
    email: "finance@klinik-prime.id",
    direktur: "dr. Hadi, Sp.M(K)",
  });
  return (
    <div>
      <PageHeader title="Profil Klinik" desc="Identitas legal untuk dokumen pajak, invoice, dan laporan." />
      <div className="max-w-2xl rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4">
          {(Object.keys(data) as (keyof typeof data)[]).map((k) =>
            k === "alamat" ? (
              <div key={k} className="grid gap-1.5">
                <Label className="text-xs capitalize">{k}</Label>
                <Textarea value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} rows={2} />
              </div>
            ) : (
              <div key={k} className="grid gap-1.5">
                <Label className="text-xs capitalize">{k}</Label>
                <Input value={data[k]} onChange={(e) => setData({ ...data, [k]: e.target.value })} />
              </div>
            ),
          )}
          <div className="flex justify-end">
            <Button onClick={() => toast.success("Profil klinik tersimpan")}>Simpan</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
