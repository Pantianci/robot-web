import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/campus/")({
  beforeLoad: () => {
    throw redirect({ to: "/campus/maps" });
  }
});
