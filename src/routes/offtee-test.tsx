import { createFileRoute } from "@tanstack/react-router";
import { OffTeeLanding } from "@/components/offtee-landing";

export const Route = createFileRoute("/offtee-test")({
  head: () => ({
    meta: [
      { title: "Off the Tee Test – Golfträning" },
      {
        name: "description",
        content:
          "Off the Tee Score 0–100, uppskattad handicap, spridningskarta och klubbstatistik efter 12 tee-slag.",
      },
      { property: "og:title", content: "Off the Tee Test – Golfträning" },
      {
        property: "og:description",
        content:
          "Mät din fullständiga prestation från tee – längd, träffsäkerhet och riskhantering.",
      },
    ],
  }),
  component: OffTeeLanding,
});
