import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/library/create")({
  component: CreateKnowledgePage
});

function CreateKnowledgePage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="knowledge" mode="create" navigate={navigate} />;
}
