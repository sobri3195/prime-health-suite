import { createFileRoute } from "@tanstack/react-router";
import { PatientArtikelDetail } from "@/components/apps/edukasi";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/apps/edukasi/$slug")({
  head: ({ params }) => pageHead({ title: `Artikel Edukasi — ${params.slug}`, description: "Artikel edukasi kesehatan untuk pasien.", path: `/apps/edukasi/${params.slug}` }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  return <PatientArtikelDetail slug={slug} />;
}
