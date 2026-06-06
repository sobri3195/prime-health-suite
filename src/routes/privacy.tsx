import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Kebijakan Privasi — Prime Apps" },
      { name: "description", content: "Kebijakan privasi & perlindungan data pasien sesuai UU PDP No. 27/2022." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-[#3a2a05]">
      <Link to="/" className="text-sm text-[#6b5a16] underline">← Kembali</Link>
      <h1 className="mt-4 text-3xl font-bold">Kebijakan Privasi</h1>
      <p className="mt-1 text-sm text-[#6b5a16]">Berlaku efektif 1 Januari 2026</p>

      <section className="prose mt-8 max-w-none space-y-6 text-[15px] leading-relaxed">
        <div>
          <h2 className="text-xl font-bold">1. Data yang Kami Kumpulkan</h2>
          <p>Identitas (nama, NIK, tanggal lahir, jenis kelamin), kontak (email, no HP, alamat),
          data kesehatan (riwayat pemeriksaan mata, resep, alergi), dan data transaksi.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">2. Tujuan Penggunaan</h2>
          <ul className="list-disc pl-6">
            <li>Memberikan layanan medis dan administrasi kunjungan</li>
            <li>Mengirim pengingat jadwal dan hasil pemeriksaan</li>
            <li>Memenuhi kewajiban hukum (rekam medis, pajak, BPJS)</li>
            <li>Promosi/edukasi — hanya jika Anda memberi persetujuan terpisah</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold">3. Dasar Hukum</h2>
          <p>UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, UU No. 17 Tahun 2023
          tentang Kesehatan, dan Permenkes No. 24 Tahun 2022 tentang Rekam Medis.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">4. Hak Anda</h2>
          <ul className="list-disc pl-6">
            <li>Mengakses & mengunduh seluruh data Anda</li>
            <li>Memperbaiki data yang tidak akurat</li>
            <li>Meminta penghapusan akun (data medis tetap disimpan sesuai regulasi)</li>
            <li>Menarik persetujuan promosi sewaktu-waktu</li>
            <li>Melihat log siapa saja yang mengakses data Anda</li>
          </ul>
          <p className="mt-2">Semua hak ini tersedia di menu <strong>Privasi & Keamanan</strong> pada akun Anda.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">5. Keamanan</h2>
          <p>Data disimpan terenkripsi, akses dibatasi Row-Level Security, dan setiap akses dicatat
          dalam audit log per-pasien.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">6. Retensi</h2>
          <p>Rekam medis disimpan minimal 5 tahun sejak kunjungan terakhir sesuai Permenkes,
          lalu dihapus permanen. Data non-medis dihapus dalam 30 hari sejak permintaan.</p>
        </div>
        <div>
          <h2 className="text-xl font-bold">7. Kontak DPO</h2>
          <p>Pertanyaan: <a className="underline" href="mailto:dpo@klinikmata.id">dpo@klinikmata.id</a></p>
        </div>
      </section>
    </main>
  );
}
