import { createFileRoute } from "@tanstack/react-router";
import { PatientManagement } from "@/components/patient-management";

export const Route = createFileRoute("/patients/base/")({
  component: PatientBasePage
});

function PatientBasePage() {
  return <PatientManagement />;
}
