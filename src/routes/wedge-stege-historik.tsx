import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";
import { ladderHistory } from "@/lib/training/tests";

export const Route = createFileRoute("/wedge-stege-historik")({
  head: () => ({
    meta: [
      { title: "Wedgestege – Progress | SG4" },
      { name: "description", content: "Din avståndskontroll mellan 40 och 90 meter över tid." },
      { property: "og:title", content: "Wedgestege – Progress | SG4" },
      { property: "og:description", content: "Se vilka wedgeavstånd som är starkast och svagast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <TestHistory
      testId="wedge-stege"
      title="Wedgestege"
      testTo="/wedge-stege"
      valueLabel="Poäng"
      valueSuffix="p"
      higherIsBetter
      scaleHint="max 60"
      breakdown={ladderHistory}
    />
  ),
});
