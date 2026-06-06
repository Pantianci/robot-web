import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge")({
  component: KnowledgeEntryPage
});

function KnowledgeEntryPage() {
  return <Navigate to="/knowledge/library" />;
}
