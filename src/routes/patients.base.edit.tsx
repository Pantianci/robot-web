import { createFileRoute } from "@tanstack/react-router";
import { PatientEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/base/edit")({
  component: EditPatientArchivePage
});

function EditPatientArchivePage() {
  return <PatientEditPage />;
}
