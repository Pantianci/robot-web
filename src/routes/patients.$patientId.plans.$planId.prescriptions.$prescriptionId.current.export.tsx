import { createFileRoute } from "@tanstack/react-router";
import { CurrentActionExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/$prescriptionId/current/export")({
  component: PatientPrescriptionCurrentExportPage
});

function PatientPrescriptionCurrentExportPage() {
  const { patientId, planId, prescriptionId } = Route.useParams();
  const returnTo = `/patients/${patientId}/plans/${planId}/prescriptions/${prescriptionId}/current`;
  return (
    <CurrentActionExportPage
      patientId={patientId}
      planId={planId}
      prescriptionId={prescriptionId}
      returnTo={returnTo}
    />
  );
}
