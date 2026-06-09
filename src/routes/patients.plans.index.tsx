import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/plans/")({
  component: RehabPlansPage
});

function RehabPlansPage() {
  return <PrescriptionManagement view="plans" scope="all" />;
}
