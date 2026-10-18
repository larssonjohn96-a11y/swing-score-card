import { IRON_TARGETS, WEDGE_TARGETS, type FocusKind } from "./pei-ranking";
import { APPROACH_HCP_LEVELS, APPROACH_MODEL_VERSION, type ApproachHcp } from "./approach-hcp-model";
export const starTargets = (kind: FocusKind) => kind === "wedge" ? WEDGE_TARGETS : IRON_TARGETS;
export type ApproachStarRound = { id: string; date: string; kind: FocusKind; hcp: ApproachHcp; model: string; hits: boolean[] };
export const starCount = (hits: boolean[]) => hits.filter(Boolean).length;
export const starStatus = (hits: boolean[]) => hits.length !== 9 ? "playing" : starCount(hits) === 9 ? "perfect" : starCount(hits) >= 7 ? "passed" : "retry";
export function bestStars(rounds: ApproachStarRound[], kind: FocusKind, hcp: ApproachHcp) {
  const eligible = rounds.filter(r => r.kind === kind && r.hcp === hcp && r.model === APPROACH_MODEL_VERSION && r.hits.length === 9);
  return eligible.length ? Math.max(...eligible.map(r => starCount(r.hits))) : null;
}
const KEY = "sg4-approach-star-game-v1";
export function loadStarRounds(): ApproachStarRound[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(r => r && typeof r.id === "string" && typeof r.date === "string" && ["wedge","iron"].includes(r.kind) && APPROACH_HCP_LEVELS.includes(r.hcp) && r.model === APPROACH_MODEL_VERSION && Array.isArray(r.hits) && r.hits.length === 9 && r.hits.every((v: unknown)=>typeof v === "boolean")) : [];
  } catch { return []; }
}
// Games remain separate from HCP-test history. Undo removes the completed round.
export function storeStarRound(round: ApproachStarRound) {
  const history = loadStarRounds().filter(r => r.id !== round.id);
  if (round.hits.length === 9) history.push(round);
  localStorage.setItem(KEY, JSON.stringify(history));
  return history;
}
