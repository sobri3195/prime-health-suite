import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/aging-piutang")({
  component: () => <Navigate to="/finance/piutang" replace />,
});
