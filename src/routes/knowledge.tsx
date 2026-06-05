import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export const Route = createFileRoute("/knowledge")({
  component: KnowledgePage
});

function KnowledgePage() {
  return <KnowledgeWorkspace library="knowledge" />;
}
