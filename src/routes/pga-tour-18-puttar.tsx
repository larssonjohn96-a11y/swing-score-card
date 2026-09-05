import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import type { Analysis, Prompt, ScoreOption } from "@/lib/training/core";

export const Route = createFileRoute("/pga-tour-18-puttar")({
  head: () => ({
    meta: [
      { title: "PGA Tour – 18 Puttar | SG4" },
      { name: "description", content: "18 puttar på PGA Tour-liknande avstånd. Håla varje boll och jämför totalen mot PGA Tour-referenser." },
    ],
  }),
  component: PgaTour18PuttsPage,
});

const DISTANCES = [1.5, 12, 0.6, 4, 1.2, 16, 8, 3, 6, 9, 0.9, 7, 2.1, 3.5, 10, 1.8, 5, 2.4];

const PROMPTS: Prompt[] = DISTANCES.map((distance, index) => ({
  tag: `Hål ${index + 1} av 18`,
  primary: `${String(distance).replace(".", ",")} m`,
  secondary: "Håla bollen · räkna alla puttar",
}));

const OPTIONS: ScoreOption[] = [
  { value: 1, label: "1 putt", hint: "Sänkt direkt" },
  { value: 2, label: "2 puttar", hint: "Tvåputt" },
  { value: 3, label: "3 puttar", hint: "Treputt" },
  { value: 4, label: "4 puttar", hint: "Fyra eller fler" },
];

function analyze(shots: number[]): Analysis {
  const total = shots.reduce((sum, value) => sum + value, 0);
  const onePutts = shots.filter((value) => value === 1).length;
  const threePlus = shots.filter((value) => value >= 3).length;
  const tourAvg = 29.2;
  const diff = total - tourAvg;
  const comparison = diff === 0 ? "På PGA-snitt" : diff < 0 ? `${Math.abs(diff).toFixed(1).replace(".", ",")} bättre` : `${diff.toFixed(1).replace(".", ",")} sämre`;

  const short = shots.filter((_, i) => DISTANCES[i] <= 2.4);
  const medium = shots.filter((_, i) => DISTANCES[i] > 2.4 && DISTANCES[i] <= 6);
  const long = shots.filter((_, i) => DISTANCES[i] > 6);
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

  return {
    headline: { label: "Totalt antal puttar", value: String(total), hint: "Lägre är bättre" },
    metrics: [
      { label: "Mot PGA-snitt", value: comparison, hint: "PGA Tour snitt 29,2" },
      { label: "1-puttar", value: String(onePutts), hint: "Av 18 hål" },
      { label: "3+ puttar", value: String(threePlus), hint: "Undvik stora tapp" },
      { label: "Snitt per hål", value: (total / 18).toFixed(2).replace(".", ",") },
    ],
    sections: [
      {
        title: "PGA Tour-referens",
        rows: [
          { label: "Bäst PGA Tour", value: "28,5" },
          { label: "Snitt PGA Tour", value: "29,2" },
          { label: "Sämst PGA Tour", value: "30,2" },
          { label: "Ditt resultat", value: String(total) },
        ],
      },
      {
        title: "Avståndsgrupper",
        rows: [
          { label: "Kort · ≤ 2,4 m", value: `${sum(short)} puttar` },
          { label: "Mellan · 3–6 m", value: `${sum(medium)} puttar` },
          { label: "Lång · 7–16 m", value: `${sum(long)} puttar` },
        ],
      },
    ],
  };
}

function PgaTour18PuttsPage() {
  return (
    <ScoredTest
      testId="pga-tour-18-puttar"
      eyebrow="Putting · Träningstest"
      title="PGA Tour – 18 Puttar"
      intro="Slå en putt i taget från de 18 fasta PGA Tour-avstånden och spela varje boll tills den är hålad. Variera brytning, uppför och nedför och kör full tävlingsrutin på varje putt."
      backTo="/traning"
      selfTo="/pga-tour-18-puttar"
      historyTo="/pga-tour-18-puttar-historik"
      prompts={PROMPTS}
      options={OPTIONS}
      optionCols={2}
      runningLabel="Puttar hittills"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Hål", value: "18" },
            { label: "Avstånd", value: "0,6–16 m" },
            { label: "Mål", value: "Håla alla" },
            { label: "Score", value: "Totala puttar" },
          ],
          note: "Variera åt vilket håll putten bryter samt uppför/nedför. Läs linjen och gör din normala rutin som på tävling.",
        },
        {
          title: "PGA Tour-referens",
          rows: [
            { label: "Bäst", value: "28,5" },
            { label: "Snitt", value: "29,2" },
            { label: "Sämst", value: "30,2" },
          ],
          note: "Lägre total är bättre.",
        },
      ]}
      analyze={analyze}
    />
  );
}
