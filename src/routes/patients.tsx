import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients")({
  component: PatientsLayout
});

function PatientsLayout() {
  return <Outlet />;
}
