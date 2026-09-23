import { computeSpeedResult } from "./speed";
export type CourseShot = { ballSpeed: number };
export const COURSE_DISTANCES = [1, 2, 3] as const;
export const maxStars = (_index: number) => 3;
export type CourseRound = {
  id: string;
  model: 1;
  reference: number;
  startedAt: number;
  finishedAt: number;
  holes: CourseShot[][];
  status: "full" | "front" | "partial";
  baselineAverage?: number | null;
  baselinePb?: number | null;
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
  | {
      type: "start";
      id: string;
      at: number;
      baselineAverage?: number | null;
      baselinePb?: number | null;
    }
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
export const courseStorageKey = (user: string | null) => `sg4-speed-course-v1:${user ?? "guest"}`;
/** Personal reference is frozen on every round; historical stars never change. */
export function referenceSpeed(state: Pick<CourseState, "history" | "calibration">): number | null {
  const recent = state.history
    .filter((r) => r.status === "full")
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id))
    .slice(0, 5)
    .flatMap((r) => r.holes.flatMap((h) => h.map((s) => s.ballSpeed)))
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
  if (!shots.length || !(reference > 0)) return 0;
  const ratio = shots[0].ballSpeed / reference;
  return ratio >= 1
    ? 3
    : ratio >= 0.98
      ? 2.5
      : ratio >= 0.95
        ? 2
        : ratio >= 0.9
          ? 1.5
          : ratio >= 0.8
            ? 1
            : 0;
}
export const roundStars = (r: Pick<CourseRound, "holes" | "reference">) =>
  r.holes.reduce((s, h, i) => s + holeStars(h, i, r.reference), 0);
export function objectiveResult(r: Pick<CourseRound, "holes">) {
  return computeSpeedResult(
    r.holes.flat().map((s, i) => ({ index: i + 1, ballSpeed: s.ballSpeed })),
  );
}
export const roundPoints = (r: Pick<CourseRound, "holes">) => objectiveResult(r).score;
export const shotPoints = (s: CourseShot) =>
  computeSpeedResult([{ index: 1, ballSpeed: s.ballSpeed }]).score;
export const formatSpeedResult = (s: CourseShot) =>
  `${s.ballSpeed.toFixed(1).replace(".", ",")} mph bollhastighet`;
export type SpeedUnit = "mph" | "km/h";
export const toMph = (value: number, unit: SpeedUnit) =>
  unit === "km/h" ? value / 1.609344 : value;
export const fromMph = (value: number, unit: SpeedUnit) =>
  unit === "km/h" ? value * 1.609344 : value;
export function courseHandicap(r: Pick<CourseRound, "holes">) {
  return r.holes.flat().length >= 3 ? objectiveResult(r).handicap : null;
}
export function speedAverage(history: CourseRound[]) {
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

/** Comparable history is completed three-drive tests only. Each test contributes its best drive. */
export function speedHistoryBaseline(history: CourseRound[]) {
  const completed = history
    .filter((round) => round.status === "full" && round.holes.flat().length === 3)
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id));
  const bestSpeeds = completed
    .map((round) => objectiveResult(round).topBallSpeed)
    .filter((value) => Number.isFinite(value) && value > 0);
  const recent = bestSpeeds.slice(0, 5);
  return {
    count: recent.length,
    average: recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : null,
    pb: bestSpeeds.length ? Math.max(...bestSpeeds) : null,
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
      action.length > 250
    )
      return state;
    return { ...state, calibration: [...state.calibration, action.length] };
  }
  if (action.type === "start")
    return a || !action.id || state.history.some((r) => r.id === action.id)
      ? state
      : {
          ...state,
          active: {
            id: action.id,
            model: 1,
            reference: action.baselineAverage ?? action.baselinePb ?? 140,
            startedAt: action.at,
            holes: [[]],
            phase: "play",
            baselineAverage: action.baselineAverage ?? null,
            baselinePb: action.baselinePb ?? null,
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
  if (action.type === "next" && i < 2)
    return {
      ...state,
      active: { ...a, holes: [...a.holes, []], phase: "play" },
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
      status: holes.length === 3 ? "full" : "partial",
      baselineAverage: a.baselineAverage ?? null,
      baselinePb: a.baselinePb ?? null,
    };
    return { ...state, active: null, history: [...state.history, round] };
  }
  return state;
}
const validHoles = (v: unknown, complete: boolean): v is CourseShot[][] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 3 &&
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
          .filter((n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 250)
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
        r.reference > 250 ||
        !Number.isFinite(r.startedAt) ||
        !Number.isFinite(r.finishedAt) ||
        !validHoles(r.holes, true)
      )
        continue;
      ids.add(r.id);
      s.history.push({
        ...r,
        status: r.holes.length === 3 ? "full" : "partial",
        baselineAverage:
          r.baselineAverage === null ||
          (Number.isFinite(r.baselineAverage) && r.baselineAverage > 0)
            ? r.baselineAverage
            : undefined,
        baselinePb:
          r.baselinePb === null || (Number.isFinite(r.baselinePb) && r.baselinePb > 0)
            ? r.baselinePb
            : undefined,
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
      a.reference <= 250 &&
      Number.isFinite(a.startedAt) &&
      validHoles(a.holes, false)
    )
      s.active = {
        id: a.id,
        model: a.model,
        reference: a.reference,
        startedAt: a.startedAt,
        holes: a.holes,
        phase: a.holes.at(-1).length ? "result" : "play",
        baselineAverage:
          a.baselineAverage === null ||
          (Number.isFinite(a.baselineAverage) && a.baselineAverage > 0)
            ? a.baselineAverage
            : undefined,
        baselinePb:
          a.baselinePb === null || (Number.isFinite(a.baselinePb) && a.baselinePb > 0)
            ? a.baselinePb
            : undefined,
      };
    return s;
  } catch {
    return emptyCourse();
  }
}

export function validShot(v: unknown): v is CourseShot {
  if (!v || typeof v !== "object") return false;
  const s = v as CourseShot;
  return Number.isFinite(s.ballSpeed) && s.ballSpeed > 0 && s.ballSpeed <= 250;
}
export const STAR_STEPS = [1.5, 3, 4.5, 6, 7.5, 9] as const;
export const starLevel = (stars: number) => STAR_STEPS.filter((n) => stars >= n).length;
export function speedBests(history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  return {
    stars: full.length ? Math.max(...full.map(roundStars)) : null,
    points: full.length ? Math.max(...full.map(roundPoints)) : null,
    top: full.length ? Math.max(...full.map((r) => objectiveResult(r).topBallSpeed)) : null,
  };
}
export function speedGoal(active: CourseSession, history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  if (!full.length) return null;
  const done = active.holes.filter((h) => h.length).length,
    left = 3 - done;
  if (!left) return null;
  const best = speedBests(full).stars!,
    total = roundStars(active),
    need = best + 0.5 - total;
  if (need <= 0) return "Över ditt stjärnrekord – fortsätt samla!";
  if (need <= Math.min(5, left * 2)) return `${need} stjärnor till ditt stjärnrekord.`;
  const avg = speedAverage(full);
  const toAverage = Math.floor(avg.stars * 2) / 2 + 0.5 - total;
  return done >= 4 && toAverage > 0 && toAverage <= left * 2
    ? `${toAverage} stjärnor till över ditt snitt.`
    : null;
}
