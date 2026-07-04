import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublicDiklat } from "@/lib/diklat.functions";
import { Badge } from "@/components/ui/badge";
import { Calendar, PlayCircle, GraduationCap } from "lucide-react";

const SITE = "https://prime-health-suite.lovable.app";

const diklatListQuery = queryOptions({
  queryKey: ["diklat", "public", "list"],
  queryFn: () => listPublicDiklat(),
});

export const Route = createFileRoute("/diklat")({
  loader: ({ context }) => context.queryClient.ensureQueryData(diklatListQuery),
  head: () => ({
    meta: [
      { title: "Diklat & Edukasi Mata — Prime Health Suite" },
      {
        name: "description",
        content:
          "Dokumentasi diklat klinik mata: video pelatihan, materi edukasi penyakit mata, dan promosi dokter spesialis. Tonton di YouTube dan booking konsultasi.",
      },
      { property: "og:title", content: "Diklat & Edukasi Mata — Prime Health Suite" },
      {
        property: "og:description",
        content: "Dokumentasi pelatihan, video edukasi penyakit mata, dan profil dokter spesialis.",
      },
      { property: "og:url", content: `${SITE}/diklat` },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `${SITE}/diklat` }],
  }),
  component: DiklatIndex,
  errorComponent: ({ error, reset }) => (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">Gagal memuat diklat</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button className="text-sm underline" onClick={() => reset()}>Coba lagi</button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Belum ada diklat</h1>
    </div>
  ),
});

function youtubeThumb(url?: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function DiklatIndex() {
  const { data } = useSuspenseQuery(diklatListQuery);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-br from-primary/10 to-background">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" /> Edukasi & Pelatihan
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Diklat Klinik Mata</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Dokumentasi pelatihan, video edukasi penyakit mata, dan profil dokter spesialis kami. Tonton, pelajari,
            dan jadwalkan konsultasi langsung dengan dokter pemateri.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {data.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-10 text-center text-muted-foreground">
            Belum ada diklat dipublikasikan.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((d) => {
              const thumb = d.cover_image_url || youtubeThumb(d.youtube_url);
              return (
                <Link
                  key={d.id}
                  to="/diklat/$slug"
                  params={{ slug: d.slug }}
                  className="group overflow-hidden rounded-lg border bg-card transition hover:border-primary hover:shadow-lg"
                >
                  <div className="relative aspect-video w-full bg-muted">
                    {thumb ? (
                      <img src={thumb} alt={d.judul} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <GraduationCap className="h-12 w-12" />
                      </div>
                    )}
                    {d.youtube_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                        <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(d.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <h2 className="mt-2 line-clamp-2 font-semibold leading-snug group-hover:text-primary">
                      {d.judul}
                    </h2>
                    {d.ringkasan && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.ringkasan}</p>
                    )}
                    {d.dokter && (
                      <p className="mt-2 text-xs font-medium text-primary">
                        dr. {d.dokter.name}
                        {d.dokter.spesialisasi ? `, ${d.dokter.spesialisasi}` : ""}
                      </p>
                    )}
                    {d.tags && d.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {d.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
