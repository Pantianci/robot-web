import { createFileRoute } from "@tanstack/react-router";
import { PatientManagement } from "@/components/patient-management";

export const Route = createFileRoute("/patients")({
  component: PatientsPage
});

function PatientsPage() {
  return <PatientManagement />;
}
