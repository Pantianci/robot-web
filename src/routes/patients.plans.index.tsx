import { createFileRoute } from "@tanstack/react-router";
import { RehabPlanManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/plans/")({
  component: RehabPlansPage
});

function RehabPlansPage() {
  return <RehabPlanManagement />;
}
