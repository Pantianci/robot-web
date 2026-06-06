import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/prescriptions/export")({
  component: ExportPrescriptionPage
});

function ExportPrescriptionPage() {
  return <PrescriptionExportPage />;
}
