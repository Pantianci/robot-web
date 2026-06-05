import { createFileRoute } from "@tanstack/react-router";
import { RobotManagement } from "@/components/robot-management";

export const Route = createFileRoute("/robots")({
  component: RobotsPage
});

function RobotsPage() {
  return <RobotManagement />;
}
