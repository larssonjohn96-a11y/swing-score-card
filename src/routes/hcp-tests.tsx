import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hcp-tests")({
  component: () => <Navigate to="/standardiserade-tester" replace />,
});
