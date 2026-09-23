import { createFileRoute, redirect } from "@tanstack/react-router";

// Existing links continue into the shared Match entry point.
export const Route = createFileRoute("/korthalsbana")({
  beforeLoad: () => {
    throw redirect({ to: "/spela" });
  },
});
