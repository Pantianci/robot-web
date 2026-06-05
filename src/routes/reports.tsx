import { createFileRoute } from "@tanstack/react-router";
import { ReportManagement } from "@/components/report-management";

export const Route = createFileRoute("/reports")({
  component: ReportsPage
});

function ReportsPage() {
  return <ReportManagement />;
}
