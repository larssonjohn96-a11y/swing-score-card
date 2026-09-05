import { createFileRoute } from "@tanstack/react-router";
import { TestHistory } from "@/components/training/test-history";
import { SHAPE_VARIANTS, constantShapeHistory } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-konstant-historik")({
  head: () => ({
    meta: [
      { title: "Konstant shape – Progress | SG4" },
      { name: "description", content: "Jämför din draw och fade över tid." },
      { property: "og:title", content: "Konstant shape – Progress | SG4" },
      { property: "og:description", content: "Se hur konsekvent du upprepar din bollform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <TestHistory
      testId="shot-shaping-konstant"
      title="Konstant shape"
      testTo="/shot-shaping-konstant"
      valueLabel="Godkända slag"
      valueSuffix="p"
      higherIsBetter
      scaleHint="max 10"
      variants={SHAPE_VARIANTS}
      breakdown={constantShapeHistory}
    />
  ),
});
