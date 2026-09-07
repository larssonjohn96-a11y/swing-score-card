import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/8-bollar-grupp")({
  beforeLoad: ({ location }) => {
    // This route is the layout parent for /8-bollar-grupp/$sessionId.
    // The old component rendered its own loading screen and never rendered an
    // Outlet, so the actual multiplayer game route could never mount.
    if (location.pathname === "/8-bollar-grupp" || location.pathname === "/8-bollar-grupp/") {
      throw redirect({ to: "/8-bollar" });
    }
  },
  component: MultiplayerLayout,
});

function MultiplayerLayout() {
  return <Outlet />;
}
