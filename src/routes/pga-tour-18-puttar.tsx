import { createFileRoute } from "@tanstack/react-router";
import { ScoredTest } from "@/components/training/scored-test";
import type { Analysis, Prompt, ScoreOption } from "@/lib/training/core";

export const Route = createFileRoute("/pga-tour-18-puttar")({
  head: () => ({
    meta: [
      { title: "PGA Tour Putting | SG4" },
      { name: "description", content: "Ett komplett puttingtest med PGA Tour-avstånd. Välj 9 eller 18 hål och få en mix av korta, mellanlånga och långa puttar." },
    ],
  }),
  component: PgaTourPuttingPage,
});

const DISTANCES = [1.5, 12, 0.6, 4, 1.2, 16, 8, 3, 6, 9, 0.9, 7, 2.1, 3.5, 10, 1.8, 5, 2.4];

const SHORT = DISTANCES.filter((distance) => distance <= 2.4);
const MEDIUM = DISTANCES.filter((distance) => distance > 2.4 && distance <= 6);
const LONG = DISTANCES.filter((distance) => distance > 6);

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function balancedOrder(length: 9 | 18) {
  const groups = [shuffle(SHORT), shuffle(MEDIUM), shuffle(LONG)];
  if (length === 9) {
    return shuffle([
      ...groups[0].slice(0, 3),
      ...groups[1].slice(0, 3),
      ...groups[2].slice(0, 3),
    ]);
  }

  const result: number[] = [];
  const queues = groups.map((group) => [...group]);
  while (result.length < DISTANCES.length) {
    for (const groupIndex of shuffle([0, 1, 2])) {
      const value = queues[groupIndex].shift();
      if (value !== undefined) result.push(value);
    }
  }
  return result;
}

// Slumpas en gång när testsidan laddas, så ordningen ligger fast under hela rundan.
const RUNS: Record<string, number[]> = {
  "9": balancedOrder(9),
  "18": balancedOrder(18),
};

function promptsFor(variantId: string): Prompt[] {
  const distances = RUNS[variantId] ?? RUNS[18];
  return distances.map((distance, index) => ({
    tag: `Hål ${index + 1} av ${distances.length}`,
    primary: `${String(distance).replace(".", ",")} m`,
    secondary: "Håla bollen · räkna alla puttar",
  }));
}

const OPTIONS: ScoreOption[] = [
  { value: 1, label: "1 putt", hint: "Sänkt direkt" },
  { value: 2, label: "2 puttar", hint: "Tvåputt" },
  { value: 3, label: "3 puttar", hint: "Treputt" },
  { value: 4, label: "4 puttar", hint: "Fyra eller fler" },
];

function promptDistance(prompt: Prompt) {
  return Number(prompt.primary.replace(" m", "").replace(",", "."));
}

function analyze(shots: number[], prompts: Prompt[], variant?: string): Analysis {
  const total = shots.reduce((sum, value) => sum + value, 0);
  const holes = shots.length;
  const onePutts = shots.filter((value) => value === 1).length;
  const threePlus = shots.filter((value) => value >= 3).length;
  const projected18 = holes === 9 ? total * 2 : total;
  const tourAvg = 29.2;
  const diff = projected18 - tourAvg;
  const comparison = diff === 0 ? "På PGA-snitt" : diff < 0 ? `${Math.abs(diff).toFixed(1).replace(".", ",")} bättre` : `${diff.toFixed(1).replace(".", ",")} sämre`;
  const distances = prompts.map(promptDistance);
  const short = shots.filter((_, i) => distances[i] <= 2.4);
  const medium = shots.filter((_, i) => distances[i] > 2.4 && distances[i] <= 6);
  const long = shots.filter((_, i) => distances[i] > 6);
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const isHalf = variant === "9";

  return {
    headline: { label: "Totalt antal puttar", value: String(total), hint: `${holes} hål · lägre är bättre` },
    metrics: [
      { label: isHalf ? "Projicerat mot PGA" : "Mot PGA-snitt", value: comparison, hint: isHalf ? `Projicerat 18-hålsresultat: ${projected18}` : "PGA Tour snitt 29,2" },
      { label: "1-puttar", value: String(onePutts), hint: `Av ${holes} hål` },
      { label: "3+ puttar", value: String(threePlus), hint: "Undvik stora tapp" },
      { label: "Snitt per hål", value: (total / holes).toFixed(2).replace(".", ",") },
    ],
    sections: [
      {
        title: isHalf ? "PGA Tour-referens · projicerat" : "PGA Tour-referens",
        rows: [
          { label: "Bäst PGA Tour", value: "28,5" },
          { label: "Snitt PGA Tour", value: "29,2" },
          { label: "Sämst PGA Tour", value: "30,2" },
          { label: isHalf ? "Ditt resultat · 18-hålsprojektion" : "Ditt resultat", value: String(projected18) },
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

function PgaTourPuttingPage() {
  return (
    <ScoredTest
      testId="pga-tour-18-puttar"
      eyebrow="Putting · Hela spelet"
      title="PGA Tour Putting"
      intro="Ett komplett puttingtest från riktigt korta till riktigt långa puttar. Avstånden kommer från PGA Tour 18-puttstestet och blandas inför varje ny laddning så att rundan känns varierad."
      backTo="/traning"
      selfTo="/pga-tour-18-puttar"
      historyTo="/pga-tour-18-puttar-historik"
      variants={[
        { id: "9", label: "9 hål", description: "Halv match · snabbare komplett test" },
        { id: "18", label: "18 hål", description: "Full match · hela PGA Tour-testet" },
      ]}
      variantLabel="Välj längd"
      promptsFor={promptsFor}
      options={OPTIONS}
      optionCols={2}
      runningLabel="Puttar hittills"
      introCards={[
        {
          title: "Upplägg",
          rows: [
            { label: "Längd", value: "9 eller 18 hål" },
            { label: "Avstånd", value: "0,6–16 m" },
            { label: "Mix", value: "Kort · mellan · lång" },
            { label: "Score", value: "Totala puttar" },
          ],
          note: "9 hål innehåller alltid en balanserad mix av korta, mellanlånga och långa puttar. 18 hål använder samtliga originalavstånd. Variera brytning samt uppför/nedför och använd full tävlingsrutin.",
        },
        {
          title: "PGA Tour-referens",
          rows: [
            { label: "Bäst", value: "28,5" },
            { label: "Snitt", value: "29,2" },
            { label: "Sämst", value: "30,2" },
          ],
          note: "Referensen gäller 18 hål. Vid 9 hål visas även ett projicerat 18-hålsresultat.",
        },
      ]}
      analyze={analyze}
    />
  );
}
