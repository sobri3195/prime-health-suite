import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, ArrowLeft, Search, Share2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { listArtikel, getArtikel, rateArtikel } from "@/lib/apps-cms.functions";
import { useI18n } from "@/lib/i18n";
import { SkeletonList, EmptyState } from "@/components/apps/ui";
import { toast } from "sonner";

const PAGE_SIZE = 10;

function Stars({ value, onRate, size = 14 }: { value: number; onRate?: (n: number) => void; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onRate}
          onClick={() => onRate?.(n)}
          className={onRate ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} bintang`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
          />
        </button>
      ))}
    </div>
  );
}

async function share(title: string, url: string) {
  try {
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator) : null;
    if (nav && "share" in nav && typeof nav.share === "function") {
      await nav.share({ title, url });
      return;
    }
    if (nav?.clipboard) {
      await nav.clipboard.writeText(url);
      toast.success("Tautan disalin");
    }
  } catch {
    /* user cancelled */
  }
}

export function PatientEdukasi() {
  const { t } = useI18n();
  const call = useServerFn(listArtikel);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["apps", "artikel", { search, page }],
    queryFn: () => call({ data: { page, pageSize: PAGE_SIZE, q: search || undefined } }),
  });
  const items = query.data?.artikel ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-[#e9dfb8] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">{t("edu.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("edu.subtitle")}</p>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul, ringkasan, kategori…"
              className="w-full rounded-xl border border-[#e9dfb8] bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-[#c9b26b]"
              aria-label="Cari artikel"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[#6b5a16] px-3 py-2 text-sm font-semibold text-white">
            Cari
          </button>
        </form>
      </div>

      {query.isLoading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title={t("edu.empty.title")} hint={t("edu.empty.hint")} />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="rounded-2xl border border-[#e9dfb8] bg-white p-4 transition hover:bg-[#fdf8e8]">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#fdf2c4] p-2"><BookOpen className="h-5 w-5 text-[#6b5a16]" /></div>
                  <Link to="/apps/edukasi/$slug" params={{ slug: a.slug }} className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-[#6b5a16]">{a.kategori}</div>
                    <div className="text-sm font-bold">{a.judul}</div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.ringkasan}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Stars value={a.rating_avg} />
                      <span>{a.rating_count > 0 ? `${a.rating_avg.toFixed(1)} (${a.rating_count})` : "Belum ada rating"}</span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label="Bagikan"
                    className="rounded-lg p-2 text-muted-foreground hover:bg-[#fdf2c4]"
                    onClick={() => share(a.judul, `${window.location.origin}/apps/edukasi/${a.slug}`)}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[#e9dfb8] bg-white p-3 text-sm">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages} • {total} artikel</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e9dfb8] px-2 py-1 disabled:opacity-40"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e9dfb8] px-2 py-1 disabled:opacity-40"
                aria-label="Halaman berikutnya"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PatientArtikelDetail({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const call = useServerFn(getArtikel);
  const rate = useServerFn(rateArtikel);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["apps", "artikel", slug], queryFn: () => call({ data: { slug } }) });
  const rateM = useMutation({
    mutationFn: (rating: number) => rate({ data: { artikel_id: q.data!.artikel.id, rating } }),
    onSuccess: () => {
      toast.success("Terima kasih atas penilaian Anda");
      qc.invalidateQueries({ queryKey: ["apps", "artikel", slug] });
      qc.invalidateQueries({ queryKey: ["apps", "artikel"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <SkeletonList rows={5} />;
  if (q.error || !q.data) return <EmptyState title={t("edu.not_found")} />;
  const a = q.data.artikel;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/apps/$section" params={{ section: "edukasi" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("edu.back")}
      </Link>
      <article className="rounded-2xl border border-[#e9dfb8] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[#6b5a16]">{a.kategori}</div>
            <h1 className="mt-1 text-2xl font-bold">{a.judul}</h1>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(a.published_at).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <button
            type="button"
            aria-label="Bagikan"
            className="rounded-lg border border-[#e9dfb8] p-2 text-muted-foreground hover:bg-[#fdf2c4]"
            onClick={() => share(a.judul, window.location.href)}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#fdf8e8] px-3 py-2 text-sm">
          <span className="text-muted-foreground">Rating:</span>
          <Stars value={q.data.rating_avg} size={16} />
          <span className="text-muted-foreground">
            {q.data.rating_count > 0 ? `${q.data.rating_avg.toFixed(1)} (${q.data.rating_count})` : "Belum ada"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#e9dfb8] px-3 py-2 text-sm">
          <span className="text-muted-foreground">Beri nilai:</span>
          <Stars value={q.data.my_rating} size={20} onRate={(n) => rateM.mutate(n)} />
          {q.data.my_rating > 0 && <span className="text-xs text-muted-foreground">(nilai Anda: {q.data.my_rating})</span>}
        </div>

        <div className="prose prose-sm mt-4 max-w-none whitespace-pre-wrap text-[#1f1d19]">{a.konten}</div>
      </article>
    </div>
  );
}
