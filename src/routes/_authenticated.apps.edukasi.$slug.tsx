import { createFileRoute } from "@tanstack/react-router";
import { PatientArtikelDetail } from "@/components/apps/edukasi";

export const Route = createFileRoute("/_authenticated/apps/edukasi/$slug")({
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  return <PatientArtikelDetail slug={slug} />;
}
