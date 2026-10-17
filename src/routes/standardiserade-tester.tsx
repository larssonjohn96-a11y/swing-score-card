import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve old bookmarks while keeping one test catalogue.
export const Route = createFileRoute("/standardiserade-tester")({
  beforeLoad: () => { throw redirect({ to: "/spela-runda", replace: true }); },
});
