import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionCreatePage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/prescriptions/create")({
  component: CreatePrescriptionPage
});

function CreatePrescriptionPage() {
  return <PrescriptionCreatePage />;
}
