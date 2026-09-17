import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tester")({
  component: LegacyTesterRedirect,
});

function LegacyTesterRedirect() {
  return <Navigate to="/hcp-tests" replace />;
}
