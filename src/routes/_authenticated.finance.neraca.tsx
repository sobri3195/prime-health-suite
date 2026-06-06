import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { invoices, expenseMTD, bankBalance } from "@/data/financeData";
import { formatIDR, sumOutstanding } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/neraca")({
  component: Neraca,
});

function Neraca() {
  const d = useMemo(() => {
    const piutang = sumOutstanding(invoices);
    const kas = bankBalance;
    const inventaris = 350_000_000;
    const peralatan = 1_250_000_000;
    const akumDepresiasi = -380_000_000;
    const aktivaLancar = kas + piutang + inventaris;
    const aktivaTetap = peralatan + akumDepresiasi;
    const totalAktiva = aktivaLancar + aktivaTetap;

    const hutangUsaha = 37_800_000;
    const hutangPajak = Math.round(expenseMTD * 0.05);
    const hutangBank = 250_000_000;
    const totalHutang = hutangUsaha + hutangPajak + hutangBank;

    const modal = 1_500_000_000;
    const labaDitahan = totalAktiva - totalHutang - modal;
    const totalEkuitas = modal + labaDitahan;

    return { kas, piutang, inventaris, peralatan, akumDepresiasi, aktivaLancar, aktivaTetap, totalAktiva,
      hutangUsaha, hutangPajak, hutangBank, totalHutang, modal, labaDitahan, totalEkuitas };
  }, []);

  const Row = ({ label, value, bold, indent }: { label: string; value: number; bold?: boolean; indent?: boolean }) => (
    <tr className={bold ? "border-t font-semibold" : ""}>
      <td className={`py-1.5 ${indent ? "pl-6" : ""}`}>{label}</td>
      <td className={`py-1.5 text-right font-mono ${value < 0 ? "text-rose-600" : ""}`}>{formatIDR(value)}</td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Laporan Keuangan</div>
        <h1 className="text-2xl font-semibold">Neraca Saldo</h1>
        <p className="text-sm text-muted-foreground">Posisi aktiva, kewajiban, dan ekuitas per akhir periode.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Aktiva</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1.5 font-semibold">Aktiva Lancar</td><td/></tr>
              <Row label="Kas & Setara Kas" value={d.kas} indent />
              <Row label="Piutang Usaha" value={d.piutang} indent />
              <Row label="Persediaan" value={d.inventaris} indent />
              <Row label="Total Aktiva Lancar" value={d.aktivaLancar} bold />
              <tr><td className="pt-4 font-semibold">Aktiva Tetap</td><td/></tr>
              <Row label="Peralatan Medis" value={d.peralatan} indent />
              <Row label="Akumulasi Depresiasi" value={d.akumDepresiasi} indent />
              <Row label="Total Aktiva Tetap" value={d.aktivaTetap} bold />
              <tr className="border-t-2 border-foreground/20"><td className="py-2 font-bold">TOTAL AKTIVA</td><td className="py-2 text-right font-mono font-bold">{formatIDR(d.totalAktiva)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold">Kewajiban & Ekuitas</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1.5 font-semibold">Kewajiban</td><td/></tr>
              <Row label="Hutang Usaha" value={d.hutangUsaha} indent />
              <Row label="Hutang Pajak" value={d.hutangPajak} indent />
              <Row label="Hutang Bank" value={d.hutangBank} indent />
              <Row label="Total Kewajiban" value={d.totalHutang} bold />
              <tr><td className="pt-4 font-semibold">Ekuitas</td><td/></tr>
              <Row label="Modal Disetor" value={d.modal} indent />
              <Row label="Laba Ditahan" value={d.labaDitahan} indent />
              <Row label="Total Ekuitas" value={d.totalEkuitas} bold />
              <tr className="border-t-2 border-foreground/20"><td className="py-2 font-bold">TOTAL PASIVA</td><td className="py-2 text-right font-mono font-bold">{formatIDR(d.totalHutang + d.totalEkuitas)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700">
        ✓ Neraca seimbang: Aktiva = Kewajiban + Ekuitas
      </div>
    </div>
  );
}
