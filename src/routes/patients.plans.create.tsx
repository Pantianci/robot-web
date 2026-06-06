import { createFileRoute } from "@tanstack/react-router";
import { PlanCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/plans/create")({
  component: CreatePlanPage
});

function CreatePlanPage() {
  return <PlanCreatePage />;
}
