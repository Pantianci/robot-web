import { createFileRoute } from "@tanstack/react-router";
import { CampusBedsPage } from "@/components/campus-management";

export const Route = createFileRoute("/campus/beds")({
  component: CampusBedsRoute
});

function CampusBedsRoute() {
  return <CampusBedsPage />;
}
