import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export const Route = createFileRoute("/knowledge/sequence/")({
  component: SequenceLibraryPage
});

function SequenceLibraryPage() {
  return <KnowledgeWorkspace library="sequence" />;
}
