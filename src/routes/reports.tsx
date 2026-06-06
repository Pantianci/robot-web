import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  component: ReportsEntryPage
});

function ReportsEntryPage() {
  return <Navigate to="/patients/reports" />;
}
