import { createFileRoute } from "@tanstack/react-router";
import { LagPuttLanding } from "@/components/lagputt-landing";

export const Route = createFileRoute("/lagputt-test")({
  head: () => ({
    meta: [
      { title: "Lag Putt – Golfträning" },
      {
        name: "description",
        content:
          "6 lagputtar från 8 till 18 meter i slumpad ordning. Lagputt HCP och andel godkända puttar efter testet.",
      },
      { property: "og:title", content: "Lag Putt – Golfträning" },
      {
        property: "og:description",
        content: "Mät din avståndskänsla på långa puttar – hur nära hålet lägger du dig?",
      },
    ],
  }),
  component: LagPuttLanding,
});
