import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/")({
  component: PatientsIndexPage
});

function PatientsIndexPage() {
  return <Navigate to="/patients/base" />;
}
