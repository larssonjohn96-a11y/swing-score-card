import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BunkerHcpTest } from "@/components/bunker-hcp-test";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/bunkerrundan")({
  head: () => ({ meta: [{ title: "Bunkertest – HCP-test | SG4" }] }),
  component: BunkerTestPage,
});
function BunkerTestPage() {
  const navigate = useNavigate();
  useHideBottomNav(true);
  return <BunkerHcpTest onExit={() => void navigate({ to: "/spela-runda" })} />;
}
