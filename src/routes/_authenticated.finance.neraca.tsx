import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/neraca")({
  component: () => <Navigate to="/finance/laporan" replace />,
});
