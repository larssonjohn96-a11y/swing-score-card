import { approachProximity, type ApproachResult } from "./approach-match";
import { handicapFromPct } from "./precision";
export type CourseShot = ApproachResult;
export const COURSE_DISTANCES = [125, 90, 140, 115, 155, 135] as const;
export const maxStars = (_index: number) => 3;
export type CourseRound = {
  id: string;
  model: 1;
  startedAt: number;
  finishedAt: number;
  holes: CourseShot[][];
  status: "full" | "front" | "partial";
};
export type CourseSession = Omit<CourseRound, "finishedAt" | "status"> & {
  phase: "play" | "result" | "halfway";
};
export type CourseState = { version: 1; history: CourseRound[]; active: CourseSession | null };
export type CourseAction =
  | { type: "start"; id: string; at: number }
  | { type: "score"; shot: CourseShot }
  | { type: "undo" }
  | { type: "next" | "finish"; at: number }
  | { type: "continue" };
export const emptyCourse = (): CourseState => ({ version: 1, history: [], active: null });
export const courseStorageKey = (user: string | null) =>
  `sg4-approach-course-v1:${user ?? "guest"}`;
export function holeStars(shots: readonly CourseShot[], index: number) {
  if (!shots.length) return 0;
  const d = approachProximity(shots[0], COURSE_DISTANCES[index]);
  return d <= 5 ? 3 : d <= 10 ? 2 : d <= 20 ? 1 : 0;
}
export const roundStars = (r: Pick<CourseRound, "holes">) =>
  r.holes.reduce((s, h, i) => s + holeStars(h, i), 0);
export const shotMiss = (shot: CourseShot, index: number) =>
  approachProximity(shot, COURSE_DISTANCES[index]);
export const averageMiss = (r: Pick<CourseRound, "holes">) => {
  const filled = r.holes.flatMap((h, i) => (h.length ? [shotMiss(h[0], i)] : []));
  return filled.length ? filled.reduce((s, n) => s + n, 0) / filled.length : 0;
};
export function courseHandicap(r: Pick<CourseRound, "holes">) {
  const errors = r.holes.flatMap((h, i) =>
    h.length ? [(100 * shotMiss(h[0], i)) / COURSE_DISTANCES[i]] : [],
  );
  return errors.length >= 3
    ? handicapFromPct(errors.reduce((s, n) => s + n, 0) / errors.length)
    : null;
}
export function approachAverage(history: CourseRound[]) {
  const rounds = history
    .filter((r) => r.status === "full")
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id))
    .slice(0, 5);
  const stars = rounds.length ? rounds.reduce((s, r) => s + roundStars(r), 0) / rounds.length : 0;
  return { count: rounds.length, stars, points: stars };
}
export function reduceCourse(state: CourseState, action: CourseAction): CourseState {
  const a = state.active;
  if (action.type === "start")
    return a || !action.id || state.history.some((r) => r.id === action.id)
      ? state
      : {
          ...state,
          active: { id: action.id, model: 1, startedAt: action.at, holes: [[]], phase: "play" },
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
    const ids = new Set<string>();
    for (const r of d.history) {
      if (
        !r ||
        typeof r.id !== "string" ||
        !r.id ||
        ids.has(r.id) ||
        r.model !== 1 ||
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
      Number.isFinite(a.startedAt) &&
      validHoles(a.holes, false)
    )
      s.active = {
        id: a.id,
        model: a.model,
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
export function approachBests(history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  return {
    stars: full.length ? Math.max(...full.map(roundStars)) : null,
    miss: full.length ? Math.min(...full.map(averageMiss)) : null,
  };
}
export function approachGoal(active: CourseSession, history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  if (!full.length) return null;
  const done = active.holes.filter((h) => h.length).length,
    left = 6 - done;
  if (!left) return null;
  const best = approachBests(full).stars!,
    total = roundStars(active),
    need = best + 1 - total;
  if (need <= 0) return "Över personbästa – fortsätt samla!";
  if (need <= Math.min(5, left * 2)) return `${need} stjärnor till personbästa.`;
  const avg = approachAverage(full);
  const toAverage = Math.floor(avg.stars) + 1 - total;
  return done >= 4 && toAverage > 0 && toAverage <= left * 2
    ? `${toAverage} stjärnor till över ditt snitt.`
    : null;
}
