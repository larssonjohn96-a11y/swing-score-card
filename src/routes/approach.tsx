import { createFileRoute } from "@tanstack/react-router";
import { ApproachLanding } from "@/components/approach-landing";

export const Route = createFileRoute("/approach")({
  head: () => ({
    meta: [
      { title: "Approach Test – Golfträning" },
      {
        name: "description",
        content:
          "Approach Score 0–100, uppskattad handicapnivå, spridningskarta och personlig analys efter 18 inspel.",
      },
      { property: "og:title", content: "Approach Test – Golfträning" },
      {
        property: "og:description",
        content: "Se exakt hur nära flaggan du landar och upptäck mönstren bakom dina inspel.",
      },
    ],
  }),
  component: ApproachLanding,
});
