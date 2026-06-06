import { createFileRoute } from "@tanstack/react-router";
import { PlanExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/plans/export")({
  component: PlanExportRoute
});

function PlanExportRoute() {
  return <PlanExportPage />;
}
