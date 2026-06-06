import { createFileRoute } from "@tanstack/react-router";
import { PlanEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/plans/edit")({
  component: EditPlanPage
});

function EditPlanPage() {
  return <PlanEditPage />;
}
