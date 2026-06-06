import { createFileRoute } from "@tanstack/react-router";
import { CurrentActionExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/current/export")({
  component: CurrentActionExportRoute
});

function CurrentActionExportRoute() {
  return <CurrentActionExportPage />;
}
