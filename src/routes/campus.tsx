import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/campus")({
  component: CampusLayout
});

function CampusLayout() {
  return <Outlet />;
}
