import { createFileRoute, Outlet } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/finance/master")({
  head: () =>
    pageHead({
      title: "Master Data — Finance",
      description: "Referensi master keuangan: payer, vendor, COA, pajak, cost center, dan template.",
      path: "/finance/master",
    }),
  component: () => <Outlet />,
});
