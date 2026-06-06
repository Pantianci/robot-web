import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients")({
  component: PatientsEntryPage
});

function PatientsEntryPage() {
  return <Navigate to="/patients/base" />;
}
