import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/campus/beds")({
  component: CampusBedsRoute
});

function CampusBedsRoute() {
  return <Outlet />;
}
