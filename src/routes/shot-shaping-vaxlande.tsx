import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { ALTERNATING_PROMPTS, HIT_MISS, analyzeAlternating } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-vaxlande")({
  head: () => ({
    meta: [
      { title: "Växlande shape – Shot Shaping | SG4" },
      {
        name: "description",
        content: "Tio slag där formen växlar mellan draw och fade. Mäter anpassningsförmåga.",
      },
      { property: "og:title", content: "Växlande shape – Shot Shaping | SG4" },
      { property: "og:description", content: "Kan du byta bollform på begäran, slag efter slag?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlternatingShapePage,
});

function AlternatingShapePage() {
  return (
    <ScoredTest
      testId="shot-shaping-vaxlande"
      eyebrow="Shot Shaping · Träningstest"
      title="Växlande shape"
      intro="Tio slag där formen växlar draw, fade, draw, fade. Samma ordning varje gång så testet går att jämföra över tid."
      backTo="/shot-shaping"
      selfTo="/shot-shaping-vaxlande"
      historyTo="/shot-shaping-vaxlande-historik"
      prompts={ALTERNATING_PROMPTS}
      options={HIT_MISS}
      runningLabel="Godkända slag"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Slag", value: "10" },
            { label: "Ordning", value: "Draw / fade varannat" },
            { label: "Max", value: "10 poäng" },
          ],
        },
      ]}
      analyze={analyzeAlternating}
    />
  );
}
