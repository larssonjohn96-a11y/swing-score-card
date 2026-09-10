import type {
  Analysis,
  AnalysisSection,
  Prompt,
  ScoreOption,
  TrainingSession,
} from "@/lib/training/core";
import { pct } from "@/lib/training/core";

/* ---------------------------------- 9 Window ---------------------------------- */

export const WINDOW_HEIGHTS = ["Låg", "Medel", "Hög"] as const;
export const WINDOW_SHAPES = ["Draw", "Rak", "Fade"] as const;

export const NINE_WINDOW_PROMPTS: Prompt[] = WINDOW_HEIGHTS.flatMap((height, hi) =>
  WINDOW_SHAPES.map((shape, si) => ({
    tag: `Fönster ${hi * 3 + si + 1}`,
    primary: `${height} ${shape.toLowerCase()}`,
    secondary: `${height} bollflykt · ${shape}`,
  })),
);

export const HIT_MISS: ScoreOption[] = [
  { value: 1, label: "Träff", hint: "Rätt bollflykt · bra kontakt" },
  { value: 0, label: "Miss", hint: "Fel bollflykt eller dålig kontakt" },
];

const windowLabel = (i: number) =>
  `${WINDOW_HEIGHTS[Math.floor(i / 3)]} ${WINDOW_SHAPES[i % 3].toLowerCase()}`;

export function analyzeNineWindow(shots: number[]): Analysis {
  const hits = shots.filter((s) => s === 1).length;
  const byHeight = WINDOW_HEIGHTS.map((h, hi) => ({
    label: h,
    hits: shots.slice(hi * 3, hi * 3 + 3).filter((s) => s === 1).length,
  }));
  const byShape = WINDOW_SHAPES.map((s, si) => ({
    label: s,
    hits: [0, 1, 2].filter((r) => shots[r * 3 + si] === 1).length,
  }));
  const best = [...byShape].sort((a, b) => b.hits - a.hits)[0];
  const worst = [...byShape].sort((a, b) => a.hits - b.hits)[0];
  return {
    headline: { label: "Träffade fönster", value: `${hits} / 9`, hint: "Ett slag per fönster" },
    metrics: [
      { label: "Starkast form", value: best ? best.label : "–", hint: best ? `${best.hits}/3` : "" },
      { label: "Fokus", value: worst ? worst.label : "–", hint: worst ? `${worst.hits}/3` : "" },
    ],
    sections: [
      {
        title: "Höjd",
        rows: byHeight.map((r) => ({ label: r.label, value: `${r.hits}/3`, ratio: r.hits / 3 })),
      },
      {
        title: "Form",
        rows: byShape.map((r) => ({ label: r.label, value: `${r.hits}/3`, ratio: r.hits / 3 })),
      },
      {
        title: "Fönster för fönster",
        rows: shots.map((v, i) => ({ label: windowLabel(i), value: v ? "Träff" : "Miss" })),
      },
    ],
  };
}

export function nineWindowHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const rows = Array.from({ length: 9 }, (_, i) => {
    const hits = sessions.filter((s) => s.shots[i] === 1).length;
    return { label: windowLabel(i), value: pct(hits, sessions.length), ratio: hits / sessions.length };
  });
  return [{ title: "Träffprocent per fönster", rows, note: "Baserat på alla sparade tester." }];
}

/* ------------------------------ Konstant shape ------------------------------ */

export const SHAPE_VARIANTS = [
  { id: "draw", label: "Draw", description: "10 slag med samma draw" },
  { id: "fade", label: "Fade", description: "10 slag med samma fade" },
];

export function constantShapePrompts(variant: string): Prompt[] {
  const label = variant === "fade" ? "Fade" : "Draw";
  return Array.from({ length: 10 }, (_, i) => ({
    tag: `Slag ${i + 1} av 10`,
    primary: label,
    secondary: "Samma form varje slag",
  }));
}

export function analyzeConstantShape(shots: number[], _p: Prompt[], variant?: string): Analysis {
  const hits = shots.filter((s) => s === 1).length;
  const first = shots.slice(0, 5).filter((s) => s === 1).length;
  const last = shots.slice(5).filter((s) => s === 1).length;
  return {
    headline: {
      label: variant === "fade" ? "Fade – träffar" : "Draw – träffar",
      value: `${hits} / 10`,
      hint: "Samma form på alla slag",
    },
    metrics: [
      { label: "Träffprocent", value: pct(hits, 10) },
      { label: "Längsta svit", value: `${longestStreak(shots)} slag` },
    ],
    sections: [
      {
        title: "Uthållighet",
        rows: [
          { label: "Slag 1–5", value: `${first}/5`, ratio: first / 5 },
          { label: "Slag 6–10", value: `${last}/5`, ratio: last / 5 },
        ],
        note: last < first ? "Träffbilden faller mot slutet – jobba på rutinen." : undefined,
      },
    ],
  };
}

function longestStreak(shots: number[]) {
  let best = 0;
  let run = 0;
  shots.forEach((shot) => {
    if (shot === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  });
  return best;
}

export function constantShapeHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const draws = sessions.filter((s) => s.variant === "draw");
  const fades = sessions.filter((s) => s.variant === "fade");
  const ratio = (items: TrainingSession[]) => items.length ? items.reduce((sum, s) => sum + s.total, 0) / (items.length * 10) : 0;
  return [{
    title: "Träffprocent per shape",
    rows: [
      { label: "Draw", value: draws.length ? `${Math.round(ratio(draws) * 100)} %` : "–", ratio: ratio(draws) },
      { label: "Fade", value: fades.length ? `${Math.round(ratio(fades) * 100)} %` : "–", ratio: ratio(fades) },
    ],
  }];
}

/* ---------------------------- Växlande draw / fade ---------------------------- */

export const ALTERNATING_PROMPTS: Prompt[] = Array.from({ length: 10 }, (_, i) => ({
  tag: `Slag ${i + 1} av 10`,
  primary: i % 2 === 0 ? "Draw" : "Fade",
}));

export function analyzeAlternating(shots: number[]): Analysis {
  const hits = shots.filter((s) => s === 1).length;
  const drawShots = shots.filter((_, i) => i % 2 === 0);
  const fadeShots = shots.filter((_, i) => i % 2 === 1);
  const drawHits = drawShots.filter((s) => s === 1).length;
  const fadeHits = fadeShots.filter((s) => s === 1).length;
  return {
    headline: { label: "Växlande shape", value: `${hits} / 10`, hint: "Draw och fade varannat slag" },
    metrics: [
      { label: "Draw", value: `${drawHits}/5` },
      { label: "Fade", value: `${fadeHits}/5` },
    ],
    sections: [{
      title: "Shape",
      rows: [
        { label: "Draw", value: `${drawHits}/5`, ratio: drawHits / 5 },
        { label: "Fade", value: `${fadeHits}/5`, ratio: fadeHits / 5 },
      ],
    }],
  };
}

export function alternatingHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const totalShots = sessions.length * 10;
  const totalHits = sessions.reduce((sum, s) => sum + s.total, 0);
  return [{ title: "Över tid", rows: [{ label: "Total träffprocent", value: pct(totalHits, totalShots), ratio: totalHits / totalShots }] }];
}

/* -------------------------------- Green reading -------------------------------- */

const GREEN_READING_SITUATIONS = [
  "Höger-vänster · 3 m",
  "Vänster-höger · 3 m",
  "Uppför · 4 m",
  "Nedför · 4 m",
  "Höger-vänster · 5 m",
  "Vänster-höger · 5 m",
  "Dubbelbrytning · 6 m",
  "Uppför med bryt · 6 m",
  "Nedför med bryt · 7 m",
  "Fritt vald putt · 8 m",
];

export const GREEN_READING_PROMPTS: Prompt[] = GREEN_READING_SITUATIONS.map((primary, i) => ({
  tag: `Putt ${i + 1} av 10`,
  primary,
  secondary: "Läs brytningen, sikta och bedöm läsning + startlinje",
}));

export const GREEN_READING_OPTIONS: ScoreOption[] = [
  { value: 2, label: "2 p", hint: "Rätt läsning och startlinje" },
  { value: 1, label: "1 p", hint: "Delvis rätt" },
  { value: 0, label: "0 p", hint: "Fel läsning" },
];

export function analyzeGreenReading(shots: number[]): Analysis {
  const total = shots.reduce((a, b) => a + b, 0);
  const perfect = shots.filter((s) => s === 2).length;
  const missed = shots.filter((s) => s === 0).length;
  return {
    headline: { label: "Läsningspoäng", value: `${total} / 20`, hint: "0–2 poäng per putt" },
    metrics: [
      { label: "Helt rätt", value: `${perfect}/10` },
      { label: "Felläsningar", value: `${missed}/10` },
    ],
    sections: [
      {
        title: "Putt för putt",
        rows: shots.map((v, i) => ({
          label: GREEN_READING_SITUATIONS[i] ?? `Putt ${i + 1}`,
          value: `${v} p`,
          ratio: v / 2,
        })),
      },
    ],
  };
}

/* ---------------------------------- Up & down ---------------------------------- */

const UP_DOWN_SITUATIONS = [
  "Chip från fairway · 8 m",
  "Pitch från ruff · 15 m",
  "Bunkerslag · 12 m",
  "Chip nedför · 10 m",
  "Pitch över hinder · 20 m",
  "Chip från tight läge · 6 m",
  "Lob över kant · 12 m",
  "Pitch uppför · 18 m",
  "Chip från semiruff · 9 m",
  "Fritt valt läge · 15 m",
];

export const UP_DOWN_PROMPTS: Prompt[] = UP_DOWN_SITUATIONS.map((primary, i) => ({
  tag: `Läge ${i + 1} av 10`,
  primary,
  secondary: "Spela slaget och putta ut – registrera antal slag",
}));

export const UP_DOWN_OPTIONS: ScoreOption[] = [
  { value: 1, label: "1 slag", hint: "Inhålat direkt" },
  { value: 2, label: "2 slag", hint: "Up and down" },
  { value: 3, label: "3 slag", hint: "Missat" },
  { value: 4, label: "4 slag", hint: "Missat" },
];

export function analyzeUpDown(shots: number[]): Analysis {
  const total = shots.reduce((a, b) => a + b, 0);
  const saves = shots.filter((s) => s <= 2).length;
  const holed = shots.filter((s) => s === 1).length;
  return {
    headline: { label: "Totalt antal slag", value: `${total}`, hint: "Lägre är bättre" },
    metrics: [
      { label: "Up & downs", value: `${saves}/10`, hint: pct(saves, 10) },
      { label: "Inhålade", value: `${holed}/10` },
    ],
    sections: [
      {
        title: "Läge för läge",
        rows: shots.map((v, i) => ({
          label: UP_DOWN_SITUATIONS[i] ?? `Läge ${i + 1}`,
          value: `${v} slag`,
          ratio: v <= 2 ? 1 : 0,
        })),
      },
    ],
  };
}

export function upDownHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const rows = UP_DOWN_SITUATIONS.map((label, i) => {
    const saves = sessions.filter((s) => (s.shots[i] ?? 9) <= 2).length;
    return { label, value: pct(saves, sessions.length), ratio: saves / sessions.length };
  });
  return [{ title: "Andel räddade lägen", rows, note: "Baserat på alla sparade tester." }];
}

/* --------------------------------- Wedgestege --------------------------------- */

const LADDER_DISTANCES = [40, 50, 60, 70, 80, 90];
const ladderLabel = (i: number) => `${LADDER_DISTANCES[Math.floor(i / 2)]} m · boll ${(i % 2) + 1}`;

export const LADDER_PROMPTS: Prompt[] = Array.from({ length: 12 }, (_, i) => ({
  tag: `Slag ${i + 1} av 12`,
  primary: `${LADDER_DISTANCES[Math.floor(i / 2)]} meter`,
  secondary: `Boll ${(i % 2) + 1} av 2 – hur nära flaggan stannade den?`,
}));

export const LADDER_OPTIONS: ScoreOption[] = [
  { value: 5, label: "5 p", hint: "Inom 2 m" },
  { value: 4, label: "4 p", hint: "2–4 m" },
  { value: 3, label: "3 p", hint: "4–6 m" },
  { value: 2, label: "2 p", hint: "6–9 m" },
  { value: 1, label: "1 p", hint: "9–12 m" },
  { value: 0, label: "0 p", hint: "Längre än 12 m" },
];

export function analyzeLadder(shots: number[]): Analysis {
  const total = shots.reduce((a, b) => a + b, 0);
  const byDistance = LADDER_DISTANCES.map((d, di) => ({
    label: `${d} m`,
    points: (shots[di * 2] ?? 0) + (shots[di * 2 + 1] ?? 0),
  }));
  const best = [...byDistance].sort((a, b) => b.points - a.points)[0];
  const worst = [...byDistance].sort((a, b) => a.points - b.points)[0];
  return {
    headline: { label: "Poäng", value: `${total} / 60`, hint: "0–5 poäng per boll" },
    metrics: [
      { label: "Starkast avstånd", value: best ? best.label : "–", hint: best ? `${best.points}/10` : "" },
      { label: "Fokus", value: worst ? worst.label : "–", hint: worst ? `${worst.points}/10` : "" },
    ],
    sections: [
      {
        title: "Per avstånd",
        rows: byDistance.map((r) => ({ label: r.label, value: `${r.points}/10`, ratio: r.points / 10 })),
      },
      {
        title: "Slag för slag",
        rows: shots.map((v, i) => ({ label: ladderLabel(i), value: `${v} p`, ratio: v / 5 })),
      },
    ],
  };
}

export function ladderHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const rows = LADDER_DISTANCES.map((d, di) => {
    const points = sessions.reduce((sum, s) => sum + (s.shots[di * 2] ?? 0) + (s.shots[di * 2 + 1] ?? 0), 0);
    const max = sessions.length * 10;
    return { label: `${d} m`, value: `${Math.round((points / max) * 100)} %`, ratio: points / max };
  });
  return [{ title: "Avståndskontroll", rows, note: "Andel av maxpoäng per avstånd." }];
}
