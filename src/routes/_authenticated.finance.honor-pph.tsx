import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/finance/honor-pph")({
  component: () => <Navigate to="/finance/pajak-pph-honor" replace />,
});
