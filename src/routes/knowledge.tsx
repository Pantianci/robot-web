import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge")({
  component: KnowledgeLayout
});

function KnowledgeLayout() {
  return <Outlet />;
}
