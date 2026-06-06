import { createFileRoute } from "@tanstack/react-router";
import { MultiModalEditorPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/sequence/create")({
  component: CreateSequencePage
});

function CreateSequencePage() {
  const navigate = Route.useNavigate();
  return <MultiModalEditorPage library="sequence" mode="create" navigate={navigate} />;
}
