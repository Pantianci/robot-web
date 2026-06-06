import { createFileRoute } from "@tanstack/react-router";
import { MultiModalExportPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/sequence/export")({
  component: ExportSequencePage
});

function ExportSequencePage() {
  const navigate = Route.useNavigate();
  return <MultiModalExportPage library="sequence" navigate={navigate} />;
}
