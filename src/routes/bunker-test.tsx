import { createFileRoute } from "@tanstack/react-router";
import { BunkerLanding } from "@/components/bunker-landing";

export const Route = createFileRoute("/bunker-test")({
  head: () => ({
    meta: [
      { title: "Bunkerslag – Golfträning" },
      {
        name: "description",
        content:
          "6 bunkerslag från de vanligaste lägena. Bunker HCP, snittavstånd från hål och svagaste läge efter testet.",
      },
      { property: "og:title", content: "Bunkerslag – Golfträning" },
      {
        property: "og:description",
        content: "Mät hur nära hålet du får bollen ur bunkern – och hur ofta du kommer upp.",
      },
    ],
  }),
  component: BunkerLanding,
});
