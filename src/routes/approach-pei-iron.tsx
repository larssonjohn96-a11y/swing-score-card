import { createFileRoute } from "@tanstack/react-router";
import { PeiFocusTest } from "@/components/pei-focus-test";
export const Route = createFileRoute("/approach-pei-iron")({ head: () => ({ meta: [{ title: "Iron PEI – Approach | SG4" }] }), component: () => <PeiFocusTest kind="iron" /> });
