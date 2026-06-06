import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/prescriptions")({
  component: PrescriptionsEntryPage
});

function PrescriptionsEntryPage() {
  return <Navigate to="/patients/prescriptions" />;
}
