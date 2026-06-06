import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/reports")({
  component: ReportsLayout
});

function ReportsLayout() {
  return <Outlet />;
}
