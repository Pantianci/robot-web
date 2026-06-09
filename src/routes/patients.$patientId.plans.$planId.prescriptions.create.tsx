import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/create")({
  component: PatientPlanPrescriptionCreatePage
});

function PatientPlanPrescriptionCreatePage() {
  const { patientId, planId } = Route.useParams();
  return (
    <PrescriptionCreatePage
      patientId={patientId}
      planId={planId}
      returnTo={`/patients/${patientId}/plans/${planId}/prescriptions`}
    />
  );
}
