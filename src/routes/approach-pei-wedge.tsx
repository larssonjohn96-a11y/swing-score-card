import { createFileRoute } from "@tanstack/react-router";
import { PeiFocusTest } from "@/components/pei-focus-test";
export const Route = createFileRoute("/approach-pei-wedge")({ head: () => ({ meta: [{ title: "Wedge PEI – Approach | SG4" }] }), component: () => <PeiFocusTest kind="wedge" /> });
