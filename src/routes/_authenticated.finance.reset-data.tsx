import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useFinanceAccess } from "@/lib/finance-access";
import { resetFinanceTransactional } from "@/lib/finance-reset.functions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const CONFIRM_PHRASE = "RESET DATA FINANCE";

const TRANSACTIONAL = [
  "Jurnal & buku besar",
  "Invoice & item invoice",
  "Pembayaran piutang",
  "Pengeluaran (expense) & item",
  "Mutasi persediaan",
  "Penyusutan aset",
  "Bukti setor bank",
  "Surat penagihan asuransi",
  "Kas kecil",
  "Bank statement & rekonsiliasi",
  "RAB",
];

const PRESERVED = [
  "Master (COA, Cost Center, Dokter, Karyawan, Vendor, Payer, Layanan, Tarif Pajak, Profil Klinik, Persediaan, Aset, MDR, Template)",
  "Audit log",
  "Pengaturan klinik & user roles",
];

export const Route = createFileRoute("/_authenticated/finance/reset-data")({
  component: Page,
});

function Page() {
  const { user, canEdit } = useFinanceAccess();
  const isSuper = user?.role === "super_admin";
  const reset = useServerFn(resetFinanceTransactional);

  const [typed, setTyped] = useState("");
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ table: string; deleted: number | null; error: string | null }[] | null>(null);

  const phraseOk = typed === CONFIRM_PHRASE;
  const canSubmit = isSuper && phraseOk && ack1 && ack2 && !busy;

  async function onReset() {
    if (!canSubmit) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await reset({ data: { confirm: typed, scope: "transactional" } });
      setResult(res.results);
      const failed = res.results.filter((r) => r.error).length;
      if (failed === 0) toast.success("Reset selesai. Data transaksional telah dihapus.");
      else toast.warning(`Reset selesai dengan ${failed} tabel gagal. Lihat detail.`);
      setTyped("");
      setAck1(false);
      setAck2(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reset Data" desc="Operasi destruktif: hapus seluruh data transaksional finance. Master data dipertahankan." />

      {!isSuper && (
        <Card className="p-6 border-amber-500/40 bg-amber-500/5">
          <div className="flex gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-700">Akses Ditolak</div>
              <p className="text-sm text-muted-foreground mt-1">
                Hanya pengguna dengan peran <code className="rounded bg-amber-100 px-1">super_admin</code> yang dapat
                mengakses fitur reset data. Peran Anda saat ini: <strong>{user?.role ?? "—"}</strong>.
                {!canEdit && " Anda juga berstatus viewer."}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 border-rose-500/30 bg-rose-500/5 space-y-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <div className="font-semibold text-rose-700">Peringatan — Tindakan Tidak Dapat Diurungkan</div>
            <p className="text-sm text-muted-foreground">
              Operasi ini akan menghapus permanen seluruh data transaksional finance dari database.
              Tidak ada mekanisme undo. Pastikan Anda telah mengambil backup database sebelum melanjutkan.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-white/60 p-3">
            <div className="text-xs font-semibold uppercase text-rose-700 mb-2">Akan dihapus</div>
            <ul className="space-y-1 text-sm text-slate-700">
              {TRANSACTIONAL.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white/60 p-3">
            <div className="text-xs font-semibold uppercase text-emerald-700 mb-2">Tetap aman</div>
            <ul className="space-y-1 text-sm text-slate-700">
              {PRESERVED.map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-rose-300 bg-white/80 p-4">
          <div className="space-y-2">
            <Label className="flex items-start gap-2 text-sm font-normal">
              <Checkbox checked={ack1} onCheckedChange={(v) => setAck1(v === true)} disabled={!isSuper || busy} />
              <span>Saya telah mengambil backup database terbaru dan dapat memulihkan data jika diperlukan.</span>
            </Label>
            <Label className="flex items-start gap-2 text-sm font-normal">
              <Checkbox checked={ack2} onCheckedChange={(v) => setAck2(v === true)} disabled={!isSuper || busy} />
              <span>Saya memahami bahwa seluruh data transaksional akan dihapus permanen dan tidak dapat dikembalikan dari UI.</span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-sm">
              Ketik persis <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs text-white">{CONFIRM_PHRASE}</code> untuk mengaktifkan tombol reset.
            </Label>
            <Input
              id="confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              disabled={!isSuper || busy}
              autoComplete="off"
              spellCheck={false}
              className={phraseOk ? "border-emerald-500" : ""}
              maxLength={40}
            />
          </div>

          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
            className="w-full"
          >
            {busy ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses reset…</>
            ) : (
              <>Reset Data Transaksional</>
            )}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            destructive
            title="Konfirmasi Akhir: Reset Data Transaksional?"
            description="Klik lanjut untuk menghapus permanen seluruh data transaksional finance. Tindakan ini tidak dapat diurungkan dari UI."
            confirmLabel="Ya, hapus permanen"
            cancelLabel="Batal"
            onConfirm={onReset}
          />
        </div>
      </Card>

      {result && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Hasil Reset</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1 pr-3">Tabel</th>
                  <th className="py-1 pr-3 text-right">Baris dihapus</th>
                  <th className="py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.map((r) => (
                  <tr key={r.table} className="border-t">
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.table}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{r.deleted ?? "—"}</td>
                    <td className="py-1.5">
                      {r.error ? (
                        <span className="text-rose-600">{r.error}</span>
                      ) : (
                        <span className="text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
