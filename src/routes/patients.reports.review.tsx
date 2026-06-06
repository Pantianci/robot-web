import { createFileRoute } from "@tanstack/react-router";
import { ReportReviewPage } from "@/components/patient-subpages";

export const Route = createFileRoute("/patients/reports/review")({
  component: ReviewReportPage
});

function ReviewReportPage() {
  return <ReportReviewPage />;
}
