import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/prescriptions")({
  component: PrescriptionsPage
});

function PrescriptionsPage() {
  return <PrescriptionManagement />;
}
