import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/voucher-kas-kecil")({
  component: () => <Navigate to="/finance/kas-kecil" replace />,
});
