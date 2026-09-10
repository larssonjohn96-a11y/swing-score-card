import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { HIT_MISS, SHAPE_VARIANTS, analyzeConstantShape, constantShapePrompts } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-konstant")({
  head: () => ({ meta: [{ title: "Konstant shape – Shot Shaping | SG4" }, { name: "description", content: "Tio slag med samma bollform, draw eller fade. Träningstest utan handicap." }] }),
  component: ConstantShapePage,
});

const CLUB_GROUPS = [
  { label: "Driver", clubs: ["Driver"] },
  { label: "Woods", clubs: ["3W", "5W", "7W", "Hybrid"] },
  { label: "Låga järn", clubs: ["3i", "4i", "5i", "6i"] },
  { label: "Höga järn", clubs: ["7i", "8i", "9i", "PW"] },
];

function ConstantShapePage() {
  return (
    <ScoredTest
      testId="shot-shaping-konstant"
      eyebrow="Shot Shaping · Repeterbar kontroll"
      title="Konstant shape"
      intro="Välj draw eller fade och upprepa samma bollform tio gånger med samma klubbgrupp. Testet mäter hur repeterbar din shape faktiskt är."
      backTo="/shot-shaping"
      selfTo="/shot-shaping-konstant"
      historyTo="/shot-shaping-konstant-historik"
      variants={SHAPE_VARIANTS}
      variantLabel="Välj shape"
      promptsFor={constantShapePrompts}
      options={HIT_MISS}
      runningLabel="Träffar"
      clubGroups={CLUB_GROUPS}
      liquidGlass
      hitMissColors
      multiplayer
      introCards={[{ title: "Testformat", rows: [{ label: "Slag", value: "10" }, { label: "Shape", value: "Draw eller Fade" }, { label: "Klubbgrupp", value: "Samma hela testet" }, { label: "Poäng", value: "1 per träff" }] }]}
      analyze={analyzeConstantShape}
    />
  );
}
