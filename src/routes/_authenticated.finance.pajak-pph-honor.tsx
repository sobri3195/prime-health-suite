import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/pajak-pph-honor")({
  component: () => <Navigate to="/finance/honor-potongan" replace />,
});
