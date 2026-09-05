import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";
import { upDownHistory } from "@/lib/training/tests";

export const Route = createFileRoute("/upp-och-in-historik")({
  head: () => ({
    meta: [
      { title: "Up & Down – Progress | SG4" },
      { name: "description", content: "Din konvertering runt green över tid." },
      { property: "og:title", content: "Up & Down – Progress | SG4" },
      { property: "og:description", content: "Totala slag och andel räddade lägen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <TestHistory
      testId="upp-och-in"
      title="Up & Down Challenge"
      testTo="/upp-och-in"
      valueLabel="Totalt antal slag"
      higherIsBetter={false}
      scaleHint="lägre är bättre"
      breakdown={upDownHistory}
    />
  ),
});
