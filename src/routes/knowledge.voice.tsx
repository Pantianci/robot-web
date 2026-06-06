import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge/voice")({
  component: VoiceLibraryLayout
});

function VoiceLibraryLayout() {
  return <Outlet />;
}
