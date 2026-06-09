import { createFileRoute } from "@tanstack/react-router";
import { PlanEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/edit")({
  component: PatientPlanEditPage
});

function PatientPlanEditPage() {
  const { patientId } = Route.useParams();
  return <PlanEditPage scope="patient" patientId={patientId} returnTo={`/patients/${patientId}/plans`} />;
}
