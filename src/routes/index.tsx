import { createFileRoute, Navigate } from "@tanstack/react-router";
import { brandHead } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => brandHead("apps"),
  component: () => <Navigate to="/apps/login" replace />,
});
