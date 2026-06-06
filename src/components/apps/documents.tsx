// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useState } from "react";
import { documents } from "@/data/appsData";
import type { DocumentCategory, DocumentStatus } from "@/types/apps";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const CATS: { value: DocumentCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua kategori" },
  { value: "SOP Klinik", label: "SOP Klinik" },
  { value: "SOP Finance", label: "SOP Finance" },
  { value: "Panduan Aplikasi", label: "Panduan Aplikasi" },
  { value: "Formulir", label: "Formulir" },
  { value: "Kebijakan", label: "Kebijakan" },
];
const STS: { value: DocumentStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];
const tone: Record<DocumentStatus, "info" | "ok" | "muted"> = {
  draft: "info", active: "ok", archived: "muted",
};

export function DocumentsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<DocumentCategory | "all">("all");
  const [st, setSt] = useState<DocumentStatus | "all">("all");

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return documents.filter(
      (d) =>
        (cat === "all" || d.category === cat) &&
        (st === "all" || d.status === st) &&
        (!qq || d.title.toLowerCase().includes(qq) || d.owner.toLowerCase().includes(qq)),
    );
  }, [q, cat, st]);

  return (
    <PageContainer>
      <PageHeader title="SOP & Documents" desc="Pustaka dokumen internal Klinik Utama Mata." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari dokumen…" />
        <Select value={cat} onChange={setCat} options={CATS} />
        <Select value={st} onChange={setSt} options={STS} />
        <button
          onClick={() => toast.info("Mock upload — integrasi storage akan ditambahkan.")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-sm font-medium text-navy-foreground hover:opacity-95"
        >
          <Upload className="h-4 w-4" /> Upload dokumen
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Tidak ada dokumen" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Judul</th><th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Versi</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th><th className="px-4 py-3">Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">{d.title}</td>
                  <td className="px-4 py-2"><StatusBadge tone="muted">{d.category}</StatusBadge></td>
                  <td className="px-4 py-2 font-mono text-xs">{d.version}</td>
                  <td className="px-4 py-2"><StatusBadge tone={tone[d.status]}>{d.status}</StatusBadge></td>
                  <td className="px-4 py-2">{d.owner}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(d.updatedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
