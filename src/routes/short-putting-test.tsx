import { createFileRoute } from "@tanstack/react-router";
import { ShortPuttingLanding } from "@/components/shortputt-landing";

export const Route = createFileRoute("/short-putting-test")({
  head: () => ({
    meta: [
      { title: "Short Putting Test – Golfträning" },
      {
        name: "description",
        content:
          "Short Putting Score 0–100, uppskattat HCP-intervall och analys per avstånd och riktning efter 12 puttar.",
      },
      { property: "og:title", content: "Short Putting Test – Golfträning" },
      {
        property: "og:description",
        content: "12 puttar från fyra riktningar runt hålet, 1 till 3 meter.",
      },
    ],
  }),
  component: ShortPuttingLanding,
});
