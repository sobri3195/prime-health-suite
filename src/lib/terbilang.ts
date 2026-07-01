// Konversi angka ke kata dalam Bahasa Indonesia (Rupiah).
// Kompatibel hingga 999.999.999.999 (999 miliar).

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];

function bilang(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 10) return SATUAN[n];
  if (n < 20) {
    if (n === 10) return "sepuluh";
    if (n === 11) return "sebelas";
    return `${SATUAN[n - 10]} belas`;
  }
  if (n < 100) {
    const p = Math.floor(n / 10);
    const s = n % 10;
    return `${SATUAN[p]} puluh${s ? ` ${SATUAN[s]}` : ""}`;
  }
  if (n < 200) return `seratus${n - 100 ? ` ${bilang(n - 100)}` : ""}`;
  if (n < 1000) {
    const p = Math.floor(n / 100);
    const s = n % 100;
    return `${SATUAN[p]} ratus${s ? ` ${bilang(s)}` : ""}`;
  }
  if (n < 2000) return `seribu${n - 1000 ? ` ${bilang(n - 1000)}` : ""}`;
  if (n < 1_000_000) {
    const p = Math.floor(n / 1000);
    const s = n % 1000;
    return `${bilang(p)} ribu${s ? ` ${bilang(s)}` : ""}`;
  }
  if (n < 1_000_000_000) {
    const p = Math.floor(n / 1_000_000);
    const s = n % 1_000_000;
    return `${bilang(p)} juta${s ? ` ${bilang(s)}` : ""}`;
  }
  const p = Math.floor(n / 1_000_000_000);
  const s = n % 1_000_000_000;
  return `${bilang(p)} miliar${s ? ` ${bilang(s)}` : ""}`;
}

export function terbilangRupiah(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "nol rupiah";
  const words = bilang(n).trim().replace(/\s+/g, " ");
  return `${words} rupiah`.replace(/^./, (c) => c.toUpperCase());
}
