import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/finance/voucher")({
  component: () => <Navigate to="/finance/pengeluaran" replace />,
});
