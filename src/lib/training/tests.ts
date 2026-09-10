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
  secondary: "Byt form slag för slag",
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
