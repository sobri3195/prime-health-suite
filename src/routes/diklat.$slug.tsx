import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getDiklatBySlug } from "@/lib/diklat.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ArrowLeft, CalendarCheck } from "lucide-react";

const SITE = "https://prime-health-suite.lovable.app";

function diklatQuery(slug: string) {
  return queryOptions({
    queryKey: ["diklat", "public", "detail", slug],
    queryFn: () => getDiklatBySlug({ data: { slug } }),
  });
}

function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

export const Route = createFileRoute("/diklat/$slug")({
  loader: async ({ params, context }) => {
    const d = await context.queryClient.ensureQueryData(diklatQuery(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    const d = loaderData;
    const title = d ? `${d.judul} — Diklat Klinik Mata` : "Diklat — Prime Health Suite";
    const desc = d?.ringkasan || d?.deskripsi?.slice(0, 160) || "Dokumentasi pelatihan & edukasi klinik mata.";
    const yid = youtubeId(d?.youtube_url);
    const image = d?.cover_image_url || (yid ? `https://i.ytimg.com/vi/${yid}/maxresdefault.jpg` : null);
    const url = `${SITE}/diklat/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: DiklatDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="text-2xl font-bold">Diklat tidak ditemukan</h1>
      <p className="mt-2 text-muted-foreground">Materi mungkin sudah dihapus atau belum dipublikasikan.</p>
      <Link to="/diklat" className="mt-4 inline-block text-primary underline">
        Kembali ke daftar diklat
      </Link>
    </div>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="text-2xl font-bold">Terjadi kesalahan</h1>
      <Button className="mt-4" onClick={() => reset()}>Coba lagi</Button>
    </div>
  ),
});

function DiklatDetail() {
  const params = Route.useParams();
  const { data: d } = useSuspenseQuery(diklatQuery(params.slug));
  if (!d) return null;
  const yid = youtubeId(d.youtube_url);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link to="/diklat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Semua Diklat
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date(d.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{d.judul}</h1>
        {d.ringkasan && <p className="mt-3 text-lg text-muted-foreground">{d.ringkasan}</p>}

        {d.tags && d.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {d.tags.map((t: string) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        )}

        {yid && (
          <div className="mt-6 aspect-video w-full overflow-hidden rounded-lg border bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${yid}`}
              title={d.judul}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        )}

        {!yid && d.cover_image_url && (
          <img src={d.cover_image_url} alt={d.judul} className="mt-6 w-full rounded-lg border" />
        )}

        {d.dokter && (
          <div className="mt-6 rounded-lg border bg-gradient-to-br from-primary/5 to-background p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dokter Pemateri</p>
            <h3 className="mt-1 text-xl font-bold">dr. {d.dokter.name}</h3>
            {d.dokter.spesialisasi && <p className="text-sm text-muted-foreground">{d.dokter.spesialisasi}</p>}
            <Button asChild className="mt-4">
              <Link to="/apps/booking">
                <CalendarCheck className="mr-2 h-4 w-4" />
                Booking dengan dr. {d.dokter.name.split(" ")[0]}
              </Link>
            </Button>
          </div>
        )}

        {d.deskripsi && (
          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none whitespace-pre-wrap">
            {d.deskripsi}
          </div>
        )}

        {d.pdf_url && (
          <a
            href={d.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm hover:bg-accent"
          >
            <FileText className="h-4 w-4" /> Unduh Materi PDF
          </a>
        )}

        {d.galeri && Array.isArray(d.galeri) && d.galeri.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold">Galeri</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {(d.galeri as string[]).map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border">
                  <img src={u} alt={`Galeri ${i + 1}`} className="aspect-square w-full object-cover transition hover:scale-105" loading="lazy" />
                </a>
              ))}
            </div>
          </section>
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: d.judul,
              datePublished: d.tanggal,
              description: d.ringkasan ?? undefined,
              image: d.cover_image_url || (yid ? `https://i.ytimg.com/vi/${yid}/maxresdefault.jpg` : undefined),
              author: d.dokter ? { "@type": "Person", name: `dr. ${d.dokter.name}` } : undefined,
              keywords: (d.tags ?? []).join(", "),
            }),
          }}
        />
      </article>
    </div>
  );
}
