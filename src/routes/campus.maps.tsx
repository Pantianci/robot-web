import { createFileRoute } from "@tanstack/react-router";
import { CampusMapsPage } from "@/components/campus-management";

export const Route = createFileRoute("/campus/maps")({
  component: CampusMapsRoute
});

function CampusMapsRoute() {
  return <CampusMapsPage />;
}
