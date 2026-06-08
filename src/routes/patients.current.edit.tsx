import { createFileRoute } from "@tanstack/react-router";
import { CurrentActionEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/current/edit")({
  component: EditCurrentActionPage
});

function EditCurrentActionPage() {
  return <CurrentActionEditPage />;
}
