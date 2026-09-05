import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import { LADDER_OPTIONS, LADDER_PROMPTS, analyzeLadder } from "@/lib/training/tests";

export const Route = createFileRoute("/wedge-stege")({
  head: () => ({
    meta: [
      { title: "Wedgestege – Avståndskontroll | SG4" },
      {
        name: "description",
        content:
          "40 till 90 meter, två bollar per avstånd. Träningstest för kalibrering av wedgeavstånd, utan handicap.",
      },
      { property: "og:title", content: "Wedgestege – Avståndskontroll | SG4" },
      { property: "og:description", content: "Hitta vilka wedgeavstånd du kontrollerar bäst." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WedgeLadderPage,
});

function WedgeLadderPage() {
  return (
    <ScoredTest
      testId="wedge-stege"
      eyebrow="Approach & wedges · Träningstest"
      title="Wedgestege"
      intro="Två bollar vardera på 40, 50, 60, 70, 80 och 90 meter. Registrera hur nära flaggan bollen stannade. Testet mäter kalibrering – inte handicap."
      backTo="/approach-pei-valj"
      selfTo="/wedge-stege"
      historyTo="/wedge-stege-historik"
      prompts={LADDER_PROMPTS}
      options={LADDER_OPTIONS}
      optionCols={3}
      runningLabel="Poäng hittills"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Avstånd", value: "40–90 m" },
            { label: "Bollar", value: "2 per avstånd" },
            { label: "Slag", value: "12" },
            { label: "Max", value: "60 poäng" },
          ],
        },
      ]}
      analyze={analyzeLadder}
    />
  );
}
