import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/$prescriptionId/current/")({
  component: PatientPrescriptionCurrentPage
});

function PatientPrescriptionCurrentPage() {
  const { patientId, planId, prescriptionId } = Route.useParams();
  return (
    <PrescriptionManagement
      view="current"
      scope="patient"
      patientId={patientId}
      planId={planId}
      prescriptionId={prescriptionId}
    />
  );
}
