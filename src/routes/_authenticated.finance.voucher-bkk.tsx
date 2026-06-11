import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/voucher-bkk")({
  component: () => <Navigate to="/finance/pengeluaran" replace />,
});
