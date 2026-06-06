import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots/")({
  component: RobotsIndexPage
});

function RobotsIndexPage() {
  return <Navigate to="/robots/list" />;
}
