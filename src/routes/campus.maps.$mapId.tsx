import { createFileRoute } from "@tanstack/react-router";
import { CampusMapDetailPage } from "@/components/campus-management";

export const Route = createFileRoute("/campus/maps/$mapId")({
  component: CampusMapDetailRoute
});

function CampusMapDetailRoute() {
  const { mapId } = Route.useParams();
  return <CampusMapDetailPage mapId={mapId} />;
}
