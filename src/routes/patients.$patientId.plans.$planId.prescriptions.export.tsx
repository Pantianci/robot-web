import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/export")({
  component: PatientPlanPrescriptionExportPage
});

function PatientPlanPrescriptionExportPage() {
  const { patientId, planId } = Route.useParams();
  return (
    <PrescriptionExportPage
      patientId={patientId}
      planId={planId}
      returnTo={`/patients/${patientId}/plans/${planId}/prescriptions`}
    />
  );
}
