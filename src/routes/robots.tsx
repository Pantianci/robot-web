import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots")({
  component: RobotsEntryPage
});

function RobotsEntryPage() {
  return <Navigate to="/robots/list" />;
}
