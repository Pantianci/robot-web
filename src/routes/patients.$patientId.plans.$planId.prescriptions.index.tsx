import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/$patientId/plans/$planId/prescriptions/")({
  component: PatientPlanPrescriptionsPage
});

function PatientPlanPrescriptionsPage() {
  const { patientId, planId } = Route.useParams();
  return <PrescriptionManagement view="prescriptions" scope="patient" patientId={patientId} planId={planId} />;
}
