import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export const Route = createFileRoute("/knowledge/library/")({
  component: KnowledgeLibraryPage
});

function KnowledgeLibraryPage() {
  return <KnowledgeWorkspace library="knowledge" />;
}
