import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/finance/bank")({
  component: () => <Navigate to="/finance/rekonsiliasi" replace />,
});
