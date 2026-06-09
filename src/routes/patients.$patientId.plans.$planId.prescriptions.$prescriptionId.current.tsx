import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/$prescriptionId/current")({
  component: PatientPrescriptionCurrentLayout
});

function PatientPrescriptionCurrentLayout() {
  return <Outlet />;
}
