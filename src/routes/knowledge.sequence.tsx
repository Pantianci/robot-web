import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge/sequence")({
  component: SequenceLibraryLayout
});

function SequenceLibraryLayout() {
  return <Outlet />;
}
