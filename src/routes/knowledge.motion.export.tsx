import { createFileRoute } from "@tanstack/react-router";
import { MultiModalExportPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/motion/export")({
  component: ExportMotionPage
});

function ExportMotionPage() {
  const navigate = Route.useNavigate();
  return <MultiModalExportPage library="motion" navigate={navigate} />;
}
