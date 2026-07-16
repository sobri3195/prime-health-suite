import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/finance/$section")({
  head: () => ({ meta: [{ title: "Halaman tidak ditemukan — Finance" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params }) => {
    throw notFound({ data: { section: params.section } });
  },
  component: () => null,
});
