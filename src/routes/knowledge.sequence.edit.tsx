import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/sequence/edit")({
  component: EditSequencePage
});

function EditSequencePage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="sequence" mode="edit" navigate={navigate} />;
}
