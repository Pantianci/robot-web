import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge/")({
  component: KnowledgeIndexPage
});

function KnowledgeIndexPage() {
  return <Navigate to="/knowledge/library" />;
}
