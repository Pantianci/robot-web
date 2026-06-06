import { createFileRoute } from "@tanstack/react-router";
import { CurrentActionCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/current/create")({
  component: CurrentActionCreateRoute
});

function CurrentActionCreateRoute() {
  return <CurrentActionCreatePage />;
}
