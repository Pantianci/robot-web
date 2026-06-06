import { createFileRoute } from "@tanstack/react-router";
import { RobotManagement } from "@/components/robot-management";

export const Route = createFileRoute("/robots/list")({
  component: RobotListPage
});

function RobotListPage() {
  return <RobotManagement />;
}
