import { createFileRoute } from "@tanstack/react-router";
import { ShortGameLanding } from "@/components/shortgame-landing";

export const Route = createFileRoute("/narspel-test")({
  head: () => ({
    meta: [
      { title: "Närspelstest – Golfträning" },
      {
        name: "description",
        content:
          "6 slag från 8 till 20 meter, fri teknik. Närspel HCP, snittavstånd och spridningsbild efter testet.",
      },
      { property: "og:title", content: "Närspelstest – Golfträning" },
      {
        property: "og:description",
        content: "Mät din faktiska prestation runt green – oavsett teknik.",
      },
    ],
  }),
  component: ShortGameLanding,
});
