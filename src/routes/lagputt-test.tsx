import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lagputt-test")({
  beforeLoad: () => {
    throw redirect({ to: "/lagputt" });
  },
});
