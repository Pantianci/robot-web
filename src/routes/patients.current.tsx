import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/current")({
  component: CurrentPrescriptionLayout
});

function CurrentPrescriptionLayout() {
  return <Outlet />;
}
