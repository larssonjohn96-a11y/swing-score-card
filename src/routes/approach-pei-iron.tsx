import { createFileRoute } from "@tanstack/react-router";
import { PeiFocusTest } from "@/components/pei-focus-test";
export const Route = createFileRoute("/approach-pei-iron")({ head: () => ({ meta: [{ title: "Inspel järn 120–175 m | SG4" }] }), component: () => <PeiFocusTest kind="iron" /> });
