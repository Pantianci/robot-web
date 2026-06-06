import { createFileRoute } from "@tanstack/react-router";
import { PatientCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/base/create")({
  component: CreatePatientArchivePage
});

function CreatePatientArchivePage() {
  return <PatientCreatePage />;
}
