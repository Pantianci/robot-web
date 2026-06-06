import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge/library")({
  component: KnowledgeLibraryLayout
});

function KnowledgeLibraryLayout() {
  return <Outlet />;
}
