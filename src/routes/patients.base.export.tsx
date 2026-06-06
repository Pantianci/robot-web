import { createFileRoute } from "@tanstack/react-router";
import { PatientExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/base/export")({
  component: ExportPatientArchivePage
});

function ExportPatientArchivePage() {
  return <PatientExportPage />;
}
