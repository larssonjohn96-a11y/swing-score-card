import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { ALTERNATING_PROMPTS, HIT_MISS, analyzeAlternating } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-vaxlande")({
  head: () => ({ meta: [{ title: "Växlande shape – Shot Shaping | SG4" }, { name: "description", content: "Tio slag där formen växlar mellan draw och fade. Mäter anpassningsförmåga." }] }),
  component: AlternatingShapePage,
});

const CLUB_GROUPS = [
  { label: "Driver", clubs: ["Driver"] },
  { label: "Woods", clubs: ["3W", "5W", "7W", "Hybrid"] },
  { label: "Låga järn", clubs: ["3i", "4i", "5i", "6i"] },
  { label: "Höga järn", clubs: ["7i", "8i", "9i", "PW"] },
];

function AlternatingShapePage() {
  return (
    <ScoredTest
      testId="shot-shaping-vaxlande"
      eyebrow="Shot Shaping · Växlande kontroll"
      title="Växlande shape"
      intro="Växla draw och fade slag för slag. Testet visar hur snabbt du kan byta bollform på begäran – med samma klubbgrupp genom hela testet."
      backTo="/shot-shaping"
      selfTo="/shot-shaping-vaxlande"
      historyTo="/shot-shaping-vaxlande-historik"
      prompts={ALTERNATING_PROMPTS}
      options={HIT_MISS}
      runningLabel="Träffar"
      clubGroups={CLUB_GROUPS}
      liquidGlass
      hitMissColors
      multiplayer
      introCards={[{ title: "Testformat", rows: [{ label: "Slag", value: "10" }, { label: "Ordning", value: "Draw / Fade" }, { label: "Klubbgrupp", value: "Samma hela testet" }, { label: "Poäng", value: "1 per träff" }] }]}
      analyze={analyzeAlternating}
    />
  );
}
