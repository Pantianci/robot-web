import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/plans")({
  component: RehabPlansLayout
});

function RehabPlansLayout() {
  return <Outlet />;
}
