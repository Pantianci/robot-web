import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionEditPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/prescriptions/edit")({
  component: EditPrescriptionPage
});

function EditPrescriptionPage() {
  return <PrescriptionEditPage />;
}
