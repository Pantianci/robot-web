import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/prescriptions")({
  component: PrescriptionListPage
});

function PrescriptionListPage() {
  return <PrescriptionManagement initialTab="prescriptions" />;
}
