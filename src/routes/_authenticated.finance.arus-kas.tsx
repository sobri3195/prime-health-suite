import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/arus-kas")({
  component: () => <Navigate to="/finance/laporan" replace />,
});
