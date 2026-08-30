import { createFileRoute } from "@tanstack/react-router";
import { PeiFocusHistory } from "@/components/pei-focus-history";
export const Route = createFileRoute("/approach-pei-iron-historik")({ component: () => <PeiFocusHistory kind="iron" /> });
