export type ApproachMatchLength = 5 | 9 | 18;

export type ApproachAxisZone =
  | "far-negative"
  | "mid-negative"
  | "near-negative"
  | "center"
  | "near-positive"
  | "mid-positive"
  | "far-positive";

export type ApproachResult = {
  length: ApproachAxisZone;
  lateral: ApproachAxisZone;
};

export const APPROACH_MATCH_FORMATS: Array<{
  length: ApproachMatchLength;
  name: string;
  label: string;
  recommended?: boolean;
}> = [
  { length: 5, name: "Snabb", label: "5 hål" },
  { length: 9, name: "Standard", label: "9 hål", recommended: true },
  { length: 18, name: "Full match", label: "18 hål" },
];

export const APPROACH_LENGTH_ZONES: Array<{ id: ApproachAxisZone; label: string }> = [
  { id: "far-negative", label: "10+ m kort" },
  { id: "mid-negative", label: "5–10 m kort" },
  { id: "near-negative", label: "0–5 m kort" },
  { id: "center", label: "Pin high" },
  { id: "near-positive", label: "0–5 m lång" },
  { id: "mid-positive", label: "5–10 m lång" },
  { id: "far-positive", label: "10+ m lång" },
];

export const APPROACH_LATERAL_ZONES: Array<{ id: ApproachAxisZone; label: string }> = [
  { id: "far-negative", label: "10+ m vänster" },
  { id: "mid-negative", label: "5–10 m vänster" },
  { id: "near-negative", label: "0–5 m vänster" },
  { id: "center", label: "På linjen" },
  { id: "near-positive", label: "0–5 m höger" },
  { id: "mid-positive", label: "5–10 m höger" },
  { id: "far-positive", label: "10+ m höger" },
];

const MAGNITUDE: Record<ApproachAxisZone, number> = {
  "far-negative": 12.5,
  "mid-negative": 7.5,
  "near-negative": 2.5,
  center: 0,
  "near-positive": 2.5,
  "mid-positive": 7.5,
  "far-positive": 12.5,
};

export function approachProximity(result: ApproachResult) {
  return Math.hypot(MAGNITUDE[result.length], MAGNITUDE[result.lateral]);
}

export function formatApproachResult(result: ApproachResult) {
  const length = APPROACH_LENGTH_ZONES.find((z) => z.id === result.length)?.label ?? "";
  const lateral = APPROACH_LATERAL_ZONES.find((z) => z.id === result.lateral)?.label ?? "";
  return `${length} · ${lateral}`;
}

export function generateApproachMatchDistances(length: ApproachMatchLength): number[] {
  const bands = [
    [55, 85],
    [86, 120],
    [121, 155],
    [156, 180],
  ] as const;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const band = bands[i % bands.length];
    const value = Math.floor(Math.random() * (band[1] - band[0] + 1)) + band[0];
    out.push(value);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function weightedZone(skill: number): ApproachAxisZone {
  const centerChance = Math.min(0.48, Math.max(0.08, 0.16 + skill * 0.025));
  const nearChance = Math.min(0.72, Math.max(0.28, 0.42 + skill * 0.02));
  const midChance = Math.min(0.92, Math.max(0.55, 0.72 + skill * 0.012));
  const r = Math.random();
  if (r < centerChance) return "center";
  const sign = Math.random() < 0.5 ? "negative" : "positive";
  if (r < nearChance) return sign === "negative" ? "near-negative" : "near-positive";
  if (r < midChance) return sign === "negative" ? "mid-negative" : "mid-positive";
  return sign === "negative" ? "far-negative" : "far-positive";
}

export function simulateApproachResult(hcp: number, approachSkill: number, targetDistance: number): ApproachResult {
  const adjustedSkill = Math.max(-8, Math.min(12, 10 - hcp * 0.18 + approachSkill - Math.max(0, targetDistance - 120) * 0.012));
  return {
    length: weightedZone(adjustedSkill),
    lateral: weightedZone(adjustedSkill - 0.5),
  };
}
