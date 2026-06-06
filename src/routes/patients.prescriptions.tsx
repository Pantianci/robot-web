import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/prescriptions")({
  component: PrescriptionListLayout
});

function PrescriptionListLayout() {
  return <Outlet />;
}
