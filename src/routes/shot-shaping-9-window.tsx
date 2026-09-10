import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { HIT_MISS, NINE_WINDOW_PROMPTS, analyzeNineWindow } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-9-window")({
  head: () => ({ meta: [{ title: "9 Window Drill – Shot Shaping | SG4" }, { name: "description", content: "Nio slag: låg, medel och hög bollflykt i draw, rak och fade. Träningstest utan HCP." }] }),
  component: NineWindowPage,
});

const CLUB_GROUPS = [
  { label: "Driver", clubs: ["Driver"] },
  { label: "Woods", clubs: ["3W", "5W", "7W", "Hybrid"] },
  { label: "Låga järn", clubs: ["3i", "4i", "5i", "6i"] },
  { label: "Höga järn", clubs: ["7i", "8i", "9i", "PW"] },
];

function NineWindowPage() {
  return (
    <ScoredTest
      testId="shot-shaping-9-window"
      eyebrow="Shot Shaping · Höjd + shape"
      title="9 Window Drill"
      intro="Träffa nio olika bollfönster: låg, medel och hög i draw, rak och fade. Välj en klubba och använd samma genom hela testet."
      backTo="/shot-shaping"
      selfTo="/shot-shaping-9-window"
      historyTo="/shot-shaping-9-window-historik"
      prompts={NINE_WINDOW_PROMPTS}
      options={HIT_MISS}
      runningLabel="Träffar"
      clubGroups={CLUB_GROUPS}
      liquidGlass
      hitMissColors
      introCards={[{ title: "Testformat", rows: [{ label: "Höjder", value: "Låg · Medel · Hög" }, { label: "Shapes", value: "Draw · Rak · Fade" }, { label: "Klubba", value: "Samma hela testet" }, { label: "Slag", value: "9" }] }]}
      analyze={analyzeNineWindow}
    />
  );
}
