import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app-shell";
import { findNav } from "@/lib/nav-config";

export const Route = createFileRoute("/_authenticated/finance/$section")({
  component: Section,
});

function Section() {
  const { section } = Route.useParams();
  const meta = findNav("finance", section);
  return <PlaceholderPage title={meta?.label ?? section} />;
}
