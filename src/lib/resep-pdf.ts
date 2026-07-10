export type ResepData = {
  no_invoice: string;
  tanggal: string;
  pasien_nama: string;
  patient_code: string;
  items: { layanan_nama: string; qty: number; subtotal: number }[];
  catatan?: string | null;
  klinik?: string;
};

export async function generateResepPDF(d: ResepData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Watermark klinik (diagonal, tipis) — ditulis lebih dulu supaya konten menimpa ──
  const wmText = (d.klinik || "Klinik Utama Mata Prime").toUpperCase();
  const anyDoc = doc as any;
  anyDoc.saveGraphicsState?.();
  const gs = anyDoc.GState?.({ opacity: 0.08 });
  if (gs) anyDoc.setGState?.(gs);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(0, 0, 0);
  doc.text(wmText, W / 2, H / 2, { align: "center", angle: -30 });
  anyDoc.restoreGraphicsState?.();
  doc.setTextColor(0);

  let y = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(d.klinik || "Klinik Utama Mata Prime", W / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Resep Refraksi / Riwayat Pemeriksaan", W / 2, y, { align: "center" });
  y += 6;
  doc.setLineWidth(0.3);
  doc.line(10, y, W - 10, y);
  y += 6;


  doc.setFontSize(9);
  doc.text(`No. Invoice : ${d.no_invoice}`, 10, y);
  doc.text(`Tanggal : ${new Date(d.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, W - 10, y, { align: "right" });
  y += 5;
  doc.text(`Pasien      : ${d.pasien_nama}`, 10, y);
  doc.text(`Kode    : ${d.patient_code}`, W - 10, y, { align: "right" });
  y += 6;
  doc.line(10, y, W - 10, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Layanan / Item", 10, y);
  doc.text("Qty", W - 40, y, { align: "right" });
  doc.text("Subtotal", W - 10, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");
  d.items.forEach((it) => {
    const lines = doc.splitTextToSize(it.layanan_nama, W - 60);
    doc.text(lines, 10, y);
    doc.text(String(it.qty), W - 40, y, { align: "right" });
    doc.text(`Rp ${Number(it.subtotal).toLocaleString("id-ID")}`, W - 10, y, { align: "right" });
    y += 4 * lines.length + 1;
  });

  y += 2;
  doc.line(10, y, W - 10, y);
  y += 6;

  if (d.catatan) {
    doc.setFont("helvetica", "bold");
    doc.text("Catatan Dokter:", 10, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const cl = doc.splitTextToSize(d.catatan, W - 20);
    doc.text(cl, 10, y);
    y += 4 * cl.length + 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "Dokumen ini diterbitkan otomatis oleh Prime Apps. Tunjukkan ke optik atau apotek mitra untuk pemenuhan resep.",
    W / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center", maxWidth: W - 20 },
  );

  doc.save(`Resep-${d.no_invoice}.pdf`);
}
