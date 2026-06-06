import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/base")({
  component: PatientBaseLayout
});

function PatientBaseLayout() {
  return <Outlet />;
}
