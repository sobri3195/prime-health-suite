import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/finance/$section")({
  loader: ({ params }) => {
    throw notFound({ data: { section: params.section } });
  },
  component: () => null,
});
