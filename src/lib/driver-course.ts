import { type ApproachResult } from "./approach-match";
import { offTeeResult, shotHandicap } from "./offtee";
export type CourseShot = ApproachResult;
export const COURSE_DISTANCES = [1, 2, 3, 4, 5, 6] as const;
export const ZONE_HALF_WIDTH = 20;
export const maxStars = (_index: number) => 3;
export type CourseRound = {
  id: string;
  model: 1;
  reference: number;
  startedAt: number;
  finishedAt: number;
  holes: CourseShot[][];
  status: "full" | "front" | "partial";
};
export type CourseSession = Omit<CourseRound, "finishedAt" | "status"> & {
  phase: "play" | "result" | "halfway";
};
export type CourseState = {
  version: 1;
  calibration: number[];
  history: CourseRound[];
  active: CourseSession | null;
};
export type CourseAction =
  | { type: "start"; id: string; at: number }
  | { type: "calibrate"; length: number }
  | { type: "score"; shot: CourseShot }
  | { type: "undo" }
  | { type: "next" | "finish"; at: number }
  | { type: "continue" };
export const emptyCourse = (): CourseState => ({
  version: 1,
  calibration: [],
  history: [],
  active: null,
});
export const courseStorageKey = (user: string | null) => `sg4-driver-course-v1:${user ?? "guest"}`;
/** Personal reference is frozen on every round; historical stars never change. */
export function referenceLength(
  state: Pick<CourseState, "history" | "calibration">,
): number | null {
  const recent = state.history
    .filter((r) => r.status === "full")
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id))
    .slice(0, 5)
    .flatMap((r) => r.holes.flatMap((h) => h.map((s) => s.actualDistance)))
    .filter((n) => n > 0);
  const lengths = recent.length >= 3 ? recent : state.calibration;
  if (lengths.length < 3) return null;
  const sorted = [...lengths].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return (
    Math.round(
      (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) * 10,
    ) / 10
  );
}
export function holeStars(shots: readonly CourseShot[], _index: number, reference: number) {
  if (
    !shots.length ||
    shots[0].actualDistance <= 0 ||
    shots[0].lateral > ZONE_HALF_WIDTH ||
    !(reference > 0)
  )
    return 0;
  const ratio = shots[0].actualDistance / reference;
  return ratio >= 1 ? 3 : ratio >= 0.9 ? 2.5 : ratio >= 0.8 ? 2 : 1.5;
}
export const roundStars = (r: Pick<CourseRound, "holes" | "reference">) =>
  r.holes.reduce((s, h, i) => s + holeStars(h, i, r.reference), 0);
export const shotMiss = (shot: CourseShot, _index: number) => shot.lateral;
export const averageMiss = (r: Pick<CourseRound, "holes">) => {
  const shots = r.holes.flat();
  return shots.length ? shots.reduce((s, h) => s + h.lateral, 0) / shots.length : 0;
};
export function objectiveResult(r: Pick<CourseRound, "holes">) {
  return offTeeResult(
    r.holes.flat().map((s, i) => ({
      index: i + 1,
      filled: true,
      total: s.actualDistance,
      sidled: s.lateral,
      direction: s.side === "left" ? "left" : "right",
    })),
  );
}
export const roundPoints = (r: Pick<CourseRound, "holes">) => objectiveResult(r).score;
export const playableHits = (r: Pick<CourseRound, "holes">) =>
  r.holes.flat().filter((s) => s.actualDistance > 0 && s.lateral <= ZONE_HALF_WIDTH).length;
export function shotPoints(s: CourseShot) {
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 - ((shotHandicap({ total: s.actualDistance, sidled: s.lateral }) + 8) * 100) / 48,
      ),
    ),
  );
}
export function courseHandicap(r: Pick<CourseRound, "holes">) {
  return r.holes.flat().length >= 3 ? objectiveResult(r).handicap : null;
}
export function driverAverage(history: CourseRound[]) {
  const rounds = history
    .filter((r) => r.status === "full")
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id))
    .slice(0, 5);
  const count = rounds.length;
  return {
    count,
    stars: count ? rounds.reduce((s, r) => s + roundStars(r), 0) / count : 0,
    points: count ? rounds.reduce((s, r) => s + roundPoints(r), 0) / count : 0,
  };
}
export function reduceCourse(state: CourseState, action: CourseAction): CourseState {
  const a = state.active;
  if (action.type === "calibrate") {
    if (
      a ||
      state.calibration.length >= 3 ||
      !Number.isFinite(action.length) ||
      action.length <= 0 ||
      action.length > 400
    )
      return state;
    return { ...state, calibration: [...state.calibration, action.length] };
  }
  const reference = referenceLength(state);
  if (action.type === "start")
    return a || reference === null || !action.id || state.history.some((r) => r.id === action.id)
      ? state
      : {
          ...state,
          active: {
            id: action.id,
            model: 1,
            reference: reference!,
            startedAt: action.at,
            holes: [[]],
            phase: "play",
          },
        };
  if (!a) return state;
  const i = a.holes.length - 1;
  if (action.type === "score")
    return a.phase !== "play" || !validShot(action.shot)
      ? state
      : {
          ...state,
          active: { ...a, holes: [...a.holes.slice(0, -1), [{ ...action.shot }]], phase: "result" },
        };
  if (action.type === "undo")
    return a.phase !== "result"
      ? state
      : { ...state, active: { ...a, holes: [...a.holes.slice(0, -1), []], phase: "play" } };
  if (action.type === "continue")
    return a.phase !== "halfway"
      ? state
      : { ...state, active: { ...a, holes: [...a.holes, []], phase: "play" } };
  if (action.type === "next" && a.phase !== "result") return state;
  if (action.type === "next" && i < 5)
    return {
      ...state,
      active:
        i === 2 ? { ...a, phase: "halfway" } : { ...a, holes: [...a.holes, []], phase: "play" },
    };
  if (action.type === "finish" || action.type === "next") {
    const holes = a.holes.filter((h) => h.length === 1);
    if (!holes.length) return { ...state, active: null };
    const round: CourseRound = {
      id: a.id,
      model: a.model,
      reference: a.reference,
      startedAt: a.startedAt,
      finishedAt: action.at,
      holes,
      status: holes.length === 6 ? "full" : holes.length === 3 ? "front" : "partial",
    };
    return { ...state, active: null, history: [...state.history, round] };
  }
  return state;
}
const validHoles = (v: unknown, complete: boolean): v is CourseShot[][] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 6 &&
  v.every(
    (h, i) =>
      Array.isArray(h) &&
      (complete || i < v.length - 1 ? h.length === 1 : h.length <= 1) &&
      h.every(validShot),
  );
export function parseCourse(raw: string | null): CourseState {
  try {
    const d = JSON.parse(raw ?? "null");
    const s = emptyCourse();
    if (d?.version !== 1 || !Array.isArray(d.history)) return s;
    s.calibration = Array.isArray(d.calibration)
      ? d.calibration
          .filter((n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 400)
          .slice(0, 3)
      : [];
    const ids = new Set<string>();
    for (const r of d.history) {
      if (
        !r ||
        typeof r.id !== "string" ||
        !r.id ||
        ids.has(r.id) ||
        r.model !== 1 ||
        !Number.isFinite(r.reference) ||
        r.reference <= 0 ||
        r.reference > 400 ||
        !Number.isFinite(r.startedAt) ||
        !Number.isFinite(r.finishedAt) ||
        !validHoles(r.holes, true)
      )
        continue;
      ids.add(r.id);
      s.history.push({
        ...r,
        status: r.holes.length === 6 ? "full" : r.holes.length === 3 ? "front" : "partial",
      });
    }
    const a = d.active;
    if (
      a &&
      typeof a.id === "string" &&
      a.id &&
      !ids.has(a.id) &&
      a.model === 1 &&
      Number.isFinite(a.reference) &&
      a.reference > 0 &&
      a.reference <= 400 &&
      Number.isFinite(a.startedAt) &&
      validHoles(a.holes, false)
    )
      s.active = {
        id: a.id,
        model: a.model,
        reference: a.reference,
        startedAt: a.startedAt,
        holes: a.holes,
        phase: a.holes.at(-1).length
          ? a.phase === "halfway" && a.holes.length === 3
            ? "halfway"
            : "result"
          : "play",
      };
    return s;
  } catch {
    return emptyCourse();
  }
}

export function validShot(v: unknown): v is CourseShot {
  if (!v || typeof v !== "object") return false;
  const s = v as CourseShot;
  return (
    Number.isFinite(s.actualDistance) &&
    s.actualDistance >= 0 &&
    s.actualDistance <= 400 &&
    Number.isFinite(s.lateral) &&
    s.lateral >= 0 &&
    s.lateral <= 200 &&
    (s.lateral === 0 ? s.side === "center" : s.side === "left" || s.side === "right")
  );
}
export const STAR_STEPS = [3, 6, 9, 12, 15, 18] as const;
export const starLevel = (stars: number) => STAR_STEPS.filter((n) => stars >= n).length;
export function driverBests(history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  return {
    stars: full.length ? Math.max(...full.map(roundStars)) : null,
    points: full.length ? Math.max(...full.map(roundPoints)) : null,
  };
}
export function driverGoal(active: CourseSession, history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  if (!full.length) return null;
  const done = active.holes.filter((h) => h.length).length,
    left = 6 - done;
  if (!left) return null;
  const best = driverBests(full).stars!,
    total = roundStars(active),
    need = best + 0.5 - total;
  if (need <= 0) return "Över ditt stjärnrekord – fortsätt samla!";
  if (need <= Math.min(5, left * 2)) return `${need} stjärnor till ditt stjärnrekord.`;
  const avg = driverAverage(full);
  const toAverage = Math.floor(avg.stars * 2) / 2 + 0.5 - total;
  return done >= 4 && toAverage > 0 && toAverage <= left * 2
    ? `${toAverage} stjärnor till över ditt snitt.`
    : null;
}
