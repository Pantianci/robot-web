import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/edit")({
  component: PatientPlanPrescriptionEditPage
});

function PatientPlanPrescriptionEditPage() {
  const { patientId, planId } = Route.useParams();
  return (
    <PrescriptionEditPage
      patientId={patientId}
      planId={planId}
      returnTo={`/patients/${patientId}/plans/${planId}/prescriptions`}
    />
  );
}
