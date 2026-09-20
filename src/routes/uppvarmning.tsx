import { createFileRoute } from "@tanstack/react-router";
import { WarmUpPage } from "@/components/warm-up";
export const Route = createFileRoute("/uppvarmning")({
  head: () => ({ meta: [{ title: "Redo för första tee | SG4" }] }),
  component: WarmUpPage,
});
