import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/voice/create")({
  component: CreateVoicePage
});

function CreateVoicePage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="voice" mode="create" navigate={navigate} />;
}
