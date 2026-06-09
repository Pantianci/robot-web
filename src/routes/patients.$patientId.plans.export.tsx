import { createFileRoute } from "@tanstack/react-router";
import { PlanExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/$patientId/plans/export")({
  component: PatientPlanExportPage
});

function PatientPlanExportPage() {
  const { patientId } = Route.useParams();
  return <PlanExportPage scope="patient" patientId={patientId} returnTo={`/patients/${patientId}/plans`} />;
}
