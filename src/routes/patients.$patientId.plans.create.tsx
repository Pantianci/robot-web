import { createFileRoute } from "@tanstack/react-router";
import { PlanCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/create")({
  component: PatientPlanCreatePage
});

function PatientPlanCreatePage() {
  const { patientId } = Route.useParams();
  return <PlanCreatePage scope="patient" patientId={patientId} returnTo={`/patients/${patientId}/plans`} />;
}
