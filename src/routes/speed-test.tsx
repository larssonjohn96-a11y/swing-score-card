import { createFileRoute } from "@tanstack/react-router";
import { SpeedLanding } from "@/components/speed-landing";

export const Route = createFileRoute("/speed-test")({
  head: () => ({
    meta: [
      { title: "Speed Test – Golfträning" },
      {
        name: "description",
        content:
          "Speed HCP, snitt- och toppfart samt smash factor efter 6 drives, mätt i simulator eller på range.",
      },
      { property: "og:title", content: "Speed Test – Golfträning" },
      {
        property: "og:description",
        content: "Mät din bollhastighet och se var du ligger jämfört med andra handicapnivåer.",
      },
    ],
  }),
  component: SpeedLanding,
});
