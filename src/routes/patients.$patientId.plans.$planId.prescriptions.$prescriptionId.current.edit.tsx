import { createFileRoute } from "@tanstack/react-router";
import { CurrentActionEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/$prescriptionId/current/edit")({
  component: PatientPrescriptionCurrentEditPage
});

function PatientPrescriptionCurrentEditPage() {
  const { patientId, planId, prescriptionId } = Route.useParams();
  const returnTo = `/patients/${patientId}/plans/${planId}/prescriptions/${prescriptionId}/current`;
  return (
    <CurrentActionEditPage
      patientId={patientId}
      planId={planId}
      prescriptionId={prescriptionId}
      returnTo={returnTo}
    />
  );
}
