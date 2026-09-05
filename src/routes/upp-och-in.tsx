import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { UP_DOWN_OPTIONS, UP_DOWN_PROMPTS, analyzeUpDown } from "@/lib/training/tests";

export const Route = createFileRoute("/upp-och-in")({
  head: () => ({
    meta: [
      { title: "Up & Down Challenge | SG4" },
      {
        name: "description",
        content:
          "Tio närspelssituationer där du spelar slaget och puttar ut. Räknar upp och in, totala slag och konvertering.",
      },
      { property: "og:title", content: "Up & Down Challenge | SG4" },
      { property: "og:description", content: "Hur många av tio situationer räddar du på två slag?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpDownPage,
});

function UpDownPage() {
  return (
    <ScoredTest
      testId="upp-och-in"
      eyebrow="Around the green · Träningstest"
      title="Up & Down Challenge"
      intro="Tio olika lägen runt green. Spela slaget och putta ut, registrera antal slag. Två slag = up and down, ett slag = inhålat."
      backTo="/traning"
      selfTo="/upp-och-in"
      historyTo="/upp-och-in-historik"
      prompts={UP_DOWN_PROMPTS}
      options={UP_DOWN_OPTIONS}
      optionCols={3}
      runningLabel="Slag hittills"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Situationer", value: "10" },
            { label: "Mål", value: "Två slag eller färre" },
            { label: "Resultat", value: "Up & downs, slag, %" },
          ],
          note: "Lägre totalt antal slag är bättre.",
        },
      ]}
      analyze={analyzeUpDown}
    />
  );
}
