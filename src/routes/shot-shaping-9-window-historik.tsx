import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";
import { nineWindowHistory } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-9-window-historik")({
  head: () => ({
    meta: [
      { title: "9 Window Drill – Progress | SG4" },
      { name: "description", content: "Din utveckling i 9 Window Drill över tid." },
      { property: "og:title", content: "9 Window Drill – Progress | SG4" },
      { property: "og:description", content: "Se vilka fönster du träffar bäst och sämst." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <TestHistory
      testId="shot-shaping-9-window"
      title="9 Window Drill"
      testTo="/shot-shaping-9-window"
      valueLabel="Träffade fönster"
      valueSuffix="p"
      higherIsBetter
      scaleHint="max 9"
      rollingWindow={5}
      breakdown={nineWindowHistory}
    />
  ),
});
