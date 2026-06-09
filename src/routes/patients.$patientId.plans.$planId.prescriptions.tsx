import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions")({
  component: PatientPlanPrescriptionsLayout
});

function PatientPlanPrescriptionsLayout() {
  return <Outlet />;
}
