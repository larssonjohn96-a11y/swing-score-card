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
  { value: 1, label: "Träff", hint: "Rätt fönster" },
  { value: 0, label: "Miss", hint: "Fel bollflykt" },
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
  for (const s of shots) {
    run = s === 1 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function constantShapeHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const rows = SHAPE_VARIANTS.map((v) => {
    const list = sessions.filter((s) => (s.variant ?? "draw") === v.id);
    const avg = list.length ? list.reduce((sum, s) => sum + s.total, 0) / list.length : 0;
    return {
      label: v.label,
      value: list.length ? `${avg.toFixed(1)} / 10` : "–",
      ratio: avg / 10,
    };
  });
  return [
    {
      title: "Stock shape vs motsatt form",
      rows,
      note: "Snittresultat per form över alla tester.",
    },
  ];
}

/* ------------------------------ Växlande shape ------------------------------ */

export const ALTERNATING_PROMPTS: Prompt[] = Array.from({ length: 10 }, (_, i) => ({
  tag: `Slag ${i + 1} av 10`,
  primary: i % 2 === 0 ? "Draw" : "Fade",
  secondary: "Växla form varje slag",
}));

export function analyzeAlternating(shots: number[]): Analysis {
  const hits = shots.filter((s) => s === 1).length;
  const draw = shots.filter((s, i) => i % 2 === 0 && s === 1).length;
  const fade = shots.filter((s, i) => i % 2 === 1 && s === 1).length;
  return {
    headline: { label: "Träffar", value: `${hits} / 10`, hint: "Växlande draw och fade" },
    metrics: [
      { label: "Draw", value: `${draw} / 5` },
      { label: "Fade", value: `${fade} / 5` },
    ],
    sections: [
      {
        title: "Anpassningsförmåga",
        rows: [
          { label: "Draw", value: `${draw}/5`, ratio: draw / 5 },
          { label: "Fade", value: `${fade}/5`, ratio: fade / 5 },
        ],
        note:
          Math.abs(draw - fade) >= 3
            ? "Stor skillnad mellan formerna – träna den svagare sidan."
            : "Jämn förmåga att växla mellan formerna.",
      },
      {
        title: "Slag för slag",
        rows: shots.map((v, i) => ({
          label: `${i + 1}. ${i % 2 === 0 ? "Draw" : "Fade"}`,
          value: v ? "Träff" : "Miss",
        })),
      },
    ],
  };
}

/* -------------------------------- Green reading ------------------------------- */

export const GREEN_READING_PROMPTS: Prompt[] = Array.from({ length: 10 }, (_, i) => ({
  tag: `Putt ${i + 1} av 10`,
  primary: `${[3, 4, 5, 6, 8][i % 5]} m`,
  secondary: "Läs brytet, sikta, bedöm startlinjen",
}));

export const GREEN_READING_OPTIONS: ScoreOption[] = [
  { value: 2, label: "2", hint: "Rätt läsning + startlinje" },
  { value: 1, label: "1", hint: "Rätt läsning, fel start" },
  { value: 0, label: "0", hint: "Fel läsning" },
];

export function analyzeGreenReading(shots: number[]): Analysis {
  const total = shots.reduce((a, b) => a + b, 0);
  const reads = shots.filter((s) => s >= 1).length;
  const lines = shots.filter((s) => s === 2).length;
  return {
    headline: { label: "Läsningspoäng", value: `${total} / 20`, hint: "10 puttar, max 2 poäng" },
    metrics: [
      { label: "Rätt läsning", value: pct(reads, shots.length) },
      { label: "Rätt startlinje", value: pct(lines, shots.length) },
    ],
    sections: [
      {
        title: "Var tappar du?",
        rows: [
          { label: "Läsning av bryt", value: `${reads}/10`, ratio: reads / 10 },
          { label: "Startlinje", value: `${lines}/10`, ratio: lines / 10 },
        ],
        note:
          reads - lines >= 3
            ? "Du läser brytet men missar startlinjen – träna sikte och putterblad."
            : "Läsning och startlinje följs åt.",
      },
    ],
  };
}

/* -------------------------------- Up & Down ------------------------------- */

export const UP_DOWN_SITUATIONS = [
  "Chip från kortklippt, 8 m",
  "Pitch över kant, 18 m",
  "Bunker, 12 m",
  "Chip från ruff, 10 m",
  "Lobb över hinder, 15 m",
  "Pitch uppför, 25 m",
  "Chip nedför, 12 m",
  "Bunker, långt hål, 20 m",
  "Pitch från semiruff, 30 m",
  "Chip, tight flagga, 6 m",
];

export const UP_DOWN_PROMPTS: Prompt[] = UP_DOWN_SITUATIONS.map((s, i) => ({
  tag: `Situation ${i + 1} av 10`,
  primary: s.split(",")[0],
  secondary: s,
}));

export const UP_DOWN_OPTIONS: ScoreOption[] = [
  { value: 1, label: "1", hint: "I hål direkt" },
  { value: 2, label: "2", hint: "Up & down" },
  { value: 3, label: "3", hint: "Tre slag" },
  { value: 4, label: "4", hint: "Fyra slag" },
  { value: 5, label: "5+", hint: "Fem eller fler" },
];

export function analyzeUpDown(shots: number[]): Analysis {
  const total = shots.reduce((a, b) => a + b, 0);
  const ups = shots.filter((s) => s <= 2).length;
  const holeOuts = shots.filter((s) => s === 1).length;
  return {
    headline: { label: "Up & downs", value: `${ups} / 10`, hint: `Konvertering ${pct(ups, 10)}` },
    metrics: [
      { label: "Totala slag", value: String(total), hint: "Lägre är bättre" },
      { label: "Hole-outs", value: String(holeOuts), hint: "I hål på ett slag" },
      { label: "Snitt per situation", value: (total / 10).toFixed(1) },
      { label: "Konvertering", value: pct(ups, 10) },
    ],
    sections: [
      {
        title: "Situation för situation",
        rows: shots.map((v, i) => ({
          label: `${i + 1}. ${UP_DOWN_SITUATIONS[i]}`,
          value: v === 1 ? "Hole-out" : v === 2 ? "Up & down" : `${v} slag`,
        })),
      },
    ],
  };
}

export function upDownHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const rows = UP_DOWN_SITUATIONS.map((label, i) => {
    const ups = sessions.filter((s) => (s.shots[i] ?? 9) <= 2).length;
    return { label, value: pct(ups, sessions.length), ratio: ups / sessions.length };
  });
  return [{ title: "Konvertering per situation", rows }];
}

/* ------------------------------- Wedge-stege ------------------------------ */

export const LADDER_DISTANCES = [40, 50, 60, 70, 80, 90];

export const LADDER_PROMPTS: Prompt[] = LADDER_DISTANCES.flatMap((d) =>
  [1, 2].map((ball) => ({
    tag: `Boll ${ball} av 2`,
    primary: `${d} m`,
    secondary: "Full kalibrering – hur nära flaggan?",
  })),
);

export const LADDER_OPTIONS: ScoreOption[] = [
  { value: 5, label: "5", hint: "≤ 2 m" },
  { value: 3, label: "3", hint: "2–5 m" },
  { value: 2, label: "2", hint: "5–10 m" },
  { value: 1, label: "1", hint: "10–15 m" },
  { value: 0, label: "0", hint: "> 15 m" },
];

const LADDER_MAX = LADDER_PROMPTS.length * 5;

function ladderByDistance(shots: number[]) {
  return LADDER_DISTANCES.map((d, i) => {
    const pair = [shots[i * 2] ?? 0, shots[i * 2 + 1] ?? 0];
    return { distance: d, points: pair[0] + pair[1] };
  });
}

export function analyzeLadder(shots: number[]): Analysis {
  const total = shots.reduce((a, b) => a + b, 0);
  const groups = ladderByDistance(shots);
  const best = [...groups].sort((a, b) => b.points - a.points)[0];
  const worst = [...groups].sort((a, b) => a.points - b.points)[0];
  const close = shots.filter((s) => s === 5).length;
  return {
    headline: {
      label: "Kalibreringspoäng",
      value: `${total} / ${LADDER_MAX}`,
      hint: "12 slag, 40–90 m",
    },
    metrics: [
      { label: "Inom 2 m", value: `${close} / ${shots.length}` },
      { label: "Bästa avstånd", value: best ? `${best.distance} m` : "–" },
      { label: "Fokus", value: worst ? `${worst.distance} m` : "–" },
      { label: "Snitt per slag", value: (total / shots.length).toFixed(1) },
    ],
    sections: [
      {
        title: "Poäng per avstånd",
        rows: groups.map((g) => ({
          label: `${g.distance} m`,
          value: `${g.points}/10`,
          ratio: g.points / 10,
        })),
      },
    ],
  };
}

export function ladderHistory(sessions: TrainingSession[]): AnalysisSection[] {
  if (!sessions.length) return [];
  const rows = LADDER_DISTANCES.map((d, i) => {
    const values = sessions.map((s) => (s.shots[i * 2] ?? 0) + (s.shots[i * 2 + 1] ?? 0));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { label: `${d} m`, value: `${avg.toFixed(1)}/10`, ratio: avg / 10 };
  });
  return [{ title: "Snittpoäng per avstånd", rows }];
}
