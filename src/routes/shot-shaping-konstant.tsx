import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import {
  HIT_MISS,
  SHAPE_VARIANTS,
  analyzeConstantShape,
  constantShapePrompts,
} from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-konstant")({
  head: () => ({
    meta: [
      { title: "Konstant shape – Shot Shaping | SG4" },
      {
        name: "description",
        content: "Tio slag med samma bollform, draw eller fade. Träningstest utan handicap.",
      },
      { property: "og:title", content: "Konstant shape – Shot Shaping | SG4" },
      { property: "og:description", content: "Hur väl upprepar du din stock shape tio slag i rad?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConstantShapePage,
});

function ConstantShapePage() {
  return (
    <ScoredTest
      testId="shot-shaping-konstant"
      eyebrow="Shot Shaping · Träningstest"
      title="Konstant shape"
      intro="Välj draw eller fade och slå tio slag med samma form. Draw och fade sparas separat så du kan jämföra din stock shape mot motsatt form."
      backTo="/shot-shaping"
      selfTo="/shot-shaping-konstant"
      historyTo="/shot-shaping-konstant-historik"
      variants={SHAPE_VARIANTS}
      variantLabel="Välj form"
      promptsFor={constantShapePrompts}
      options={HIT_MISS}
      runningLabel="Godkända slag"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Slag", value: "10" },
            { label: "Form", value: "Draw eller fade" },
            { label: "Max", value: "10 poäng" },
          ],
        },
      ]}
      analyze={analyzeConstantShape}
    />
  );
}
