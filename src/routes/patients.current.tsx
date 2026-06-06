import { createFileRoute } from "@tanstack/react-router";
import { PrescriptionManagement } from "@/components/prescription-management";

export const Route = createFileRoute("/patients/current")({
  component: CurrentPrescriptionPage
});

function CurrentPrescriptionPage() {
  return <PrescriptionManagement initialTab="current" />;
}
