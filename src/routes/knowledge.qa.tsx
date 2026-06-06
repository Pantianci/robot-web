import { createFileRoute } from "@tanstack/react-router";
import { MultiModalQaPage } from "@/components/multimodal-pages";

export const Route = createFileRoute("/knowledge/qa")({
  component: KnowledgeQaPage
});

function KnowledgeQaPage() {
  const navigate = Route.useNavigate();
  return <MultiModalQaPage navigate={navigate} />;
}
