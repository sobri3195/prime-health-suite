import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, ArrowLeft } from "lucide-react";
import { listArtikel, getArtikel } from "@/lib/apps-cms.functions";

export function PatientEdukasi() {
  const call = useServerFn(listArtikel);
  const q = useQuery({ queryKey: ["apps", "artikel"], queryFn: () => call() });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-[#e9dfb8] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Edukasi Mata</h1>
        <p className="mt-1 text-sm text-muted-foreground">Artikel kesehatan mata dari tim klinis Prime.</p>
      </div>
      {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <div className="space-y-2">
          {(q.data?.artikel ?? []).map((a) => (
            <Link key={a.id} to="/apps/edukasi/$slug" params={{ slug: a.slug }}
              className="block rounded-2xl border border-[#e9dfb8] bg-white p-4 transition hover:bg-[#fdf8e8]">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#fdf2c4] p-2"><BookOpen className="h-5 w-5 text-[#6b5a16]" /></div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-[#6b5a16]">{a.kategori}</div>
                  <div className="text-sm font-bold">{a.judul}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.ringkasan}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientArtikelDetail({ slug }: { slug: string }) {
  const call = useServerFn(getArtikel);
  const q = useQuery({ queryKey: ["apps", "artikel", slug], queryFn: () => call({ data: { slug } }) });
  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (q.error || !q.data) return <div className="text-sm text-rose-600">Artikel tidak ditemukan.</div>;
  const a = q.data.artikel;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/apps/edukasi" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
      </Link>
      <article className="rounded-2xl border border-[#e9dfb8] bg-white p-6 shadow-sm">
        <div className="text-[10px] uppercase tracking-wider text-[#6b5a16]">{a.kategori}</div>
        <h1 className="mt-1 text-2xl font-bold">{a.judul}</h1>
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(a.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-[#1f1d19]">{a.konten}</div>
      </article>
    </div>
  );
}
