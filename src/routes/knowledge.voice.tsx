import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export const Route = createFileRoute("/knowledge/voice")({
  component: VoiceLibraryPage
});

function VoiceLibraryPage() {
  return <KnowledgeWorkspace library="voice" />;
}
