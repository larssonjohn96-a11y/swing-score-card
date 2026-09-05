import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";

export const Route = createFileRoute("/green-reading-historik")({
  head: () => ({
    meta: [
      { title: "Green Reading – Progress | SG4" },
      { name: "description", content: "Följ hur din greenläsning utvecklas över tid." },
      { property: "og:title", content: "Green Reading – Progress | SG4" },
      { property: "og:description", content: "Läsning och startlinje, test för test." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <TestHistory
      testId="green-reading"
      title="Green Reading"
      testTo="/green-reading"
      valueLabel="Läsningspoäng"
      valueSuffix="p"
      higherIsBetter
      scaleHint="max 20"
    />
  ),
});
