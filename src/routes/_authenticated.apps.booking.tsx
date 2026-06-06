import { createFileRoute } from "@tanstack/react-router";
import { BookingFlow } from "@/components/apps/booking";

export const Route = createFileRoute("/_authenticated/apps/booking")({
  component: BookingFlow,
});
