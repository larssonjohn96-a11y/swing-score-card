import { handicapFromProximity } from "./shortgame";
import { isChipPoints, type ChipLie, type ChipPoints } from "./chip-stations";
export const COURSE_DISTANCES = [8, 12, 16, 10, 14, 18] as const;
const LEGACY_DISTANCES = [8, 10, 12, 14, 16, 20] as const;
export const courseDistances = (model = 2) => (model === 1 ? LEGACY_DISTANCES : COURSE_DISTANCES);
export type BonusChip = { leave: number; holed: boolean };
export type Segment = "full" | "front" | "back";
export type CourseRound = {
  id: string;
  model: 1 | 2;
  bonus?: BonusChip;
  lie: ChipLie;
  startedAt: number;
  finishedAt: number;
  holes: ChipPoints[][];
  status: "full" | "front" | "partial";
};
export type CourseSession = {
  id: string;
  model: 1 | 2;
  lie: ChipLie;
  startedAt: number;
  holes: ChipPoints[][];
  phase: "play" | "result" | "halfway" | "bonus";
};
export type CourseState = {
  version: 1;
  lie: ChipLie;
  history: CourseRound[];
  active: CourseSession | null;
};
export type CourseAction =
  | { type: "lie"; lie: ChipLie }
  | { type: "start"; id: string; at: number }
  | { type: "score"; points: ChipPoints }
  | { type: "undo" }
  | { type: "next"; at: number }
  | { type: "continue" }
  | { type: "finish"; at: number }
  | { type: "save"; at: number; bonus?: BonusChip };
export const emptyCourse = (): CourseState => ({
  version: 1,
  lie: "Fairway",
  history: [],
  active: null,
});
export const courseStorageKey = (user: string | null) => `sg4-chip-course-v1:${user ?? "guest"}`;
export const holePoints = (shots: readonly ChipPoints[]) =>
  shots.reduce<number>((a, b) => a + b, 0);
/** Provisional course goals, versioned with saved rounds. No locks or ability rating. */
export function holeTargets(index: number, lie: ChipLie, model = 2): readonly number[] {
  if (model === 2) return index >= 0 && index < 6 ? [3, 6, 9] : [];
  const first = [8, 8, 7, 7, 6, 5][index];
  if (first === undefined) return [];
  return [first, first + 2, first + 4].map((n) =>
    Math.max(2, Math.min(12, n - (lie === "Ruff" ? 1 : 0))),
  );
}
export const holeStars = (shots: readonly ChipPoints[], index: number, lie: ChipLie, model = 2) =>
  shots.length === 3
    ? holeTargets(index, lie, model).filter((n) => holePoints(shots) >= n).length
    : 0;
export function liveStars(points: number, targets: readonly number[] = [3, 6, 9]) {
  return targets.map((target, i) =>
    Math.max(0, Math.min(1, (points - (targets[i - 1] ?? 0)) / (target - (targets[i - 1] ?? 0)))),
  );
}
type ScoredRound = Pick<CourseRound, "holes" | "lie"> & { model?: 1 | 2 };
/** Reuses SG4 proximity model. Coarse zones use representative distances; bonus excluded.
 * This practice estimate must never be written into official or pooled handicap history.
 */
export function courseHandicap(round: ScoredRound): number | null {
  const shots = round.holes.filter((h) => h.length === 3).flat();
  if (!shots.length) return null;
  const metres = [7, 2.5, 1.5, 0.5, 0];
  return (
    Math.round(
      handicapFromProximity(shots.reduce<number>((s, p) => s + metres[p], 0) / shots.length) * 10,
    ) / 10
  );
}
export const roundStars = (round: ScoredRound) =>
  round.holes.reduce((sum, h, i) => sum + holeStars(h, i, round.lie, round.model), 0);
export function segmentScore(round: ScoredRound, segment: Segment) {
  const start = segment === "back" ? 3 : 0;
  const end = segment === "front" ? 3 : 6;
  const holes = round.holes.slice(start, end);
  if (holes.length !== end - start || holes.some((h) => h.length !== 3)) return null;
  return {
    stars: holes.reduce((s, h, i) => s + holeStars(h, start + i, round.lie, round.model), 0),
    points: holes.reduce((s, h) => s + holePoints(h), 0),
  };
}
export type SegmentScore = NonNullable<ReturnType<typeof segmentScore>>;
export const beatsScore = (score: SegmentScore, best: SegmentScore | null) =>
  !best || score.stars > best.stars || (score.stars === best.stars && score.points > best.points);
export function courseRecord(
  history: CourseRound[],
  lie: ChipLie,
  segment: Segment,
  model = 2,
): (SegmentScore & { id: string }) | null {
  let best: (SegmentScore & { id: string }) | null = null;
  for (const round of history) {
    if (round.lie !== lie || round.model !== model) continue;
    const score = segmentScore(round, segment);
    if (score && beatsScore(score, best)) best = { ...score, id: round.id };
  }
  return best;
}
function finishRound(state: CourseState, at: number, bonus?: BonusChip): CourseState {
  const active = state.active;
  if (!active) return state;
  const holes = active.holes.filter((h) => h.length === 3);
  if (!holes.length) return { ...state, active: null };
  if (state.history.some((r) => r.id === active.id)) return { ...state, active: null };
  const round: CourseRound = {
    id: active.id,
    model: active.model,
    ...(bonus ? { bonus } : {}),
    lie: active.lie,
    startedAt: active.startedAt,
    finishedAt: at,
    holes,
    status: holes.length === 6 ? "full" : holes.length === 3 ? "front" : "partial",
  };
  return { ...state, active: null, history: [...state.history, round] };
}
export function reduceCourse(state: CourseState, action: CourseAction): CourseState {
  const active = state.active;
  if (action.type === "lie")
    return active || !["Fairway", "Ruff"].includes(action.lie)
      ? state
      : { ...state, lie: action.lie };
  if (action.type === "start") {
    if (active || !action.id || state.history.some((r) => r.id === action.id)) return state;
    return {
      ...state,
      active: {
        id: action.id,
        model: 2,
        lie: state.lie,
        startedAt: action.at,
        holes: [[]],
        phase: "play",
      },
    };
  }
  if (!active) return state;
  const index = active.holes.length - 1;
  const shots = active.holes[index];
  if (action.type === "score") {
    if (active.phase !== "play" || !isChipPoints(action.points) || shots.length >= 3) return state;
    const next = [...shots, action.points];
    return {
      ...state,
      active: {
        ...active,
        holes: [...active.holes.slice(0, -1), next],
        phase: next.length === 3 ? "result" : "play",
      },
    };
  }
  if (action.type === "undo") {
    if (!shots.length || !["play", "result"].includes(active.phase)) return state;
    return {
      ...state,
      active: {
        ...active,
        holes: [...active.holes.slice(0, -1), shots.slice(0, -1)],
        phase: "play",
      },
    };
  }
  if (action.type === "next") {
    if (active.phase !== "result") return state;
    if (index === 5) return { ...state, active: { ...active, phase: "bonus" } };
    if (index === 2) return { ...state, active: { ...active, phase: "halfway" } };
    return { ...state, active: { ...active, holes: [...active.holes, []], phase: "play" } };
  }
  if (action.type === "continue") {
    if (active.phase !== "halfway" || active.holes.length !== 3) return state;
    return { ...state, active: { ...active, holes: [...active.holes, []], phase: "play" } };
  }
  if (action.type === "finish") {
    if (!active.holes.some((h) => h.length === 3)) return { ...state, active: null };
    return { ...state, active: { ...active, phase: "bonus" } };
  }
  if (action.type === "save") {
    if (active.phase !== "bonus" || (action.bonus !== undefined && !validBonus(action.bonus)))
      return state;
    return finishRound(state, action.at, action.bonus);
  }
  return state;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
function validBonus(value: unknown): value is BonusChip {
  return (
    object(value) &&
    typeof value.holed === "boolean" &&
    typeof value.leave === "number" &&
    Number.isFinite(value.leave) &&
    value.leave >= 0 &&
    (value.holed ? value.leave === 0 : value.leave > 0)
  );
}
const validLie = (v: unknown): v is ChipLie => v === "Fairway" || v === "Ruff";
function validHoles(value: unknown, complete: boolean): value is ChipPoints[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 6 &&
    value.every(
      (h, i) =>
        Array.isArray(h) &&
        h.every(isChipPoints) &&
        (complete || i < value.length - 1 ? h.length === 3 : h.length <= 3),
    )
  );
}
/** Bad/legacy station data cannot silently become a course record. */
export function parseCourse(raw: string | null): CourseState {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (!object(data) || data.version !== 1 || !Array.isArray(data.history)) return emptyCourse();
    const state = emptyCourse();
    state.lie = validLie(data.lie) ? data.lie : "Fairway";
    const ids = new Set<string>();
    for (const item of data.history) {
      if (
        !object(item) ||
        typeof item.id !== "string" ||
        !item.id ||
        ids.has(item.id) ||
        (item.model !== 1 && item.model !== 2) ||
        !validLie(item.lie) ||
        !Number.isFinite(item.startedAt) ||
        !Number.isFinite(item.finishedAt) ||
        !validHoles(item.holes, true)
      )
        continue;
      const status =
        item.holes.length === 6 ? "full" : item.holes.length === 3 ? "front" : "partial";
      const { bonus, ...rest } = item;
      state.history.push({
        ...rest,
        status,
        ...(validBonus(bonus) ? { bonus } : {}),
      } as CourseRound);
      ids.add(item.id);
    }
    const a = data.active;
    if (
      object(a) &&
      typeof a.id === "string" &&
      a.id &&
      !ids.has(a.id) &&
      validLie(a.lie) &&
      Number.isFinite(a.startedAt) &&
      validHoles(a.holes, false)
    ) {
      const complete = a.holes.at(-1)!.length === 3;
      state.active = {
        id: a.id,
        model: a.model === 2 ? 2 : 1,
        lie: a.lie,
        startedAt: a.startedAt as number,
        holes: a.holes,
        phase:
          a.phase === "bonus" && a.holes.some((h) => h.length === 3)
            ? "bonus"
            : complete
              ? a.phase === "halfway" && a.holes.length === 3
                ? "halfway"
                : "result"
              : "play",
      };
      state.lie = a.lie;
    }
    return state;
  } catch {
    return emptyCourse();
  }
}
