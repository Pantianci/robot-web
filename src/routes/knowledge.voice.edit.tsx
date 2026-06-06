import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/voice/edit")({
  component: EditVoicePage
});

function EditVoicePage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="voice" mode="edit" navigate={navigate} />;
}
