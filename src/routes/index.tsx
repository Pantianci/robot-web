import { createFileRoute } from "@tanstack/react-router";
import { DashboardOverview } from "@/components/dashboard-overview";

export const Route = createFileRoute("/")({
  component: DashboardPage
});

function DashboardPage() {
  return <DashboardOverview />;
}
