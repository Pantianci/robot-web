import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots")({
  component: RobotsLayout
});

function RobotsLayout() {
  return <Outlet />;
}
