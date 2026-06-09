import { createFileRoute } from "@tanstack/react-router";
import { CurrentActionCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/$prescriptionId/current/create")({
  component: PatientPrescriptionCurrentCreatePage
});

function PatientPrescriptionCurrentCreatePage() {
  const { patientId, planId, prescriptionId } = Route.useParams();
  const returnTo = `/patients/${patientId}/plans/${planId}/prescriptions/${prescriptionId}/current`;
  return (
    <CurrentActionCreatePage
      patientId={patientId}
      planId={planId}
      prescriptionId={prescriptionId}
      returnTo={returnTo}
    />
  );
}
