import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/library/edit")({
  component: EditKnowledgePage
});

function EditKnowledgePage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="knowledge" mode="edit" navigate={navigate} />;
}
