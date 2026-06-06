import { createFileRoute } from "@tanstack/react-router";
import { ReportExportPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/reports/export")({
  component: ExportReportPage
});

function ExportReportPage() {
  return <ReportExportPage />;
}
