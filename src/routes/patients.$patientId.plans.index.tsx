import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/$patientId/plans/")({
  component: PatientPlansPage
});

function PatientPlansPage() {
  const { patientId } = Route.useParams();
  return <PrescriptionManagement view="plans" scope="patient" patientId={patientId} />;
}
