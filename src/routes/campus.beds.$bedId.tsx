import { createFileRoute } from "@tanstack/react-router";
import { CampusBedDetailPage } from "@/components/campus-management";

export const Route = createFileRoute("/campus/beds/$bedId")({
  component: CampusBedDetailRoute
});

function CampusBedDetailRoute() {
  const { bedId } = Route.useParams();
  return <CampusBedDetailPage bedId={bedId} />;
}
