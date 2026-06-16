import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/campus/maps")({
  component: CampusMapsRoute
});

function CampusMapsRoute() {
  return <Outlet />;
}
