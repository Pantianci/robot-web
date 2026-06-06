import { createFileRoute } from "@tanstack/react-router";
import { MultiModalExportPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/library/export")({
  component: ExportKnowledgePage
});

function ExportKnowledgePage() {
  const navigate = Route.useNavigate();
  return <MultiModalExportPage library="knowledge" navigate={navigate} />;
}
