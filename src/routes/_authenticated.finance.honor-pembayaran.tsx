import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/honor-pembayaran")({
  component: () => <Navigate to="/finance/honor-rekap" replace />,
});
