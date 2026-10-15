import { createFileRoute } from "@tanstack/react-router";
import { PeiFocusTest } from "@/components/pei-focus-test";
export const Route = createFileRoute("/approach-pei-wedge")({ head: () => ({ meta: [{ title: "Korta inspel 30–110 m | SG4" }] }), component: () => <PeiFocusTest kind="wedge" /> });
