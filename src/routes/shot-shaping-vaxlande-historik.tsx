import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";

export const Route = createFileRoute("/shot-shaping-vaxlande-historik")({
  head: () => ({
    meta: [
      { title: "Växlande shape – Progress | SG4" },
      { name: "description", content: "Din utveckling när formen växlar mellan draw och fade." },
      { property: "og:title", content: "Växlande shape – Progress | SG4" },
      { property: "og:description", content: "Följ din anpassningsförmåga slag för slag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <TestHistory
      testId="shot-shaping-vaxlande"
      title="Växlande shape"
      testTo="/shot-shaping-vaxlande"
      valueLabel="Godkända slag"
      valueSuffix="p"
      higherIsBetter
      scaleHint="max 10"
      rollingWindow={5}
    />
  ),
});
