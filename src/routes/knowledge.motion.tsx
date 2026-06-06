import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge/motion")({
  component: MotionLibraryLayout
});

function MotionLibraryLayout() {
  return <Outlet />;
}
