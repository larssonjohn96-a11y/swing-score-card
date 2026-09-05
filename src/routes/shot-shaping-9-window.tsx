import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { HIT_MISS, NINE_WINDOW_PROMPTS, analyzeNineWindow } from "@/lib/training/tests";

export const Route = createFileRoute("/shot-shaping-9-window")({
  head: () => ({
    meta: [
      { title: "9 Window Drill – Shot Shaping | SG4" },
      {
        name: "description",
        content: "Nio slag: låg, medel och hög bollflykt i draw, rak och fade. Träningstest utan HCP.",
      },
      { property: "og:title", content: "9 Window Drill – Shot Shaping | SG4" },
      { property: "og:description", content: "Träffa alla nio fönster och se vilka som är svagast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NineWindowPage,
});

function NineWindowPage() {
  return (
    <ScoredTest
      testId="shot-shaping-9-window"
      eyebrow="Shot Shaping · Träningstest"
      title="9 Window Drill"
      intro="Nio slag – ett för varje kombination av bollhöjd och form. Godkänt slag = rätt fönster. Högre poäng är bättre."
      backTo="/shot-shaping"
      selfTo="/shot-shaping-9-window"
      historyTo="/shot-shaping-9-window-historik"
      prompts={NINE_WINDOW_PROMPTS}
      options={HIT_MISS}
      runningLabel="Träffar hittills"
      introCards={[
        {
          title: "Fönster",
          rows: [
            { label: "Höjder", value: "Låg · Medel · Hög" },
            { label: "Former", value: "Draw · Rak · Fade" },
            { label: "Slag", value: "9" },
            { label: "Max", value: "9 poäng" },
          ],
        },
      ]}
      analyze={analyzeNineWindow}
    />
  );
}
