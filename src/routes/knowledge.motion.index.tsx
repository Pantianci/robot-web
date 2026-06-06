import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeWorkspace } from "@/components/knowledge-workspace";

export const Route = createFileRoute("/knowledge/motion/")({
  component: MotionLibraryPage
});

function MotionLibraryPage() {
  return <KnowledgeWorkspace library="motion" />;
}
