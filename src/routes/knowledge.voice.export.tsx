import { createFileRoute } from "@tanstack/react-router";
import { MultiModalExportPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/voice/export")({
  component: ExportVoicePage
});

function ExportVoicePage() {
  const navigate = Route.useNavigate();
  return <MultiModalExportPage library="voice" navigate={navigate} />;
}
