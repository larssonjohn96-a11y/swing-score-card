import { buildPuttingMatchReview, puttingReviewCategory } from "./putting-match-review";
export const COURSE_DISTANCES = [2, 8, 4, 10, 3, 12] as const;
export const maxStars = (index: number) => (COURSE_DISTANCES[index] <= 3 ? 2 : 3);
export type CourseRound = {
  id: string;
  model: 1 | 2;
  startedAt: number;
  finishedAt: number;
  holes: number[][];
  status: "full" | "front" | "partial";
};
export type CourseSession = Omit<CourseRound, "finishedAt" | "status"> & {
  phase: "play" | "result" | "halfway";
};
export type CourseState = { version: 1; history: CourseRound[]; active: CourseSession | null };
export type CourseAction =
  | { type: "start"; id: string; at: number }
  | { type: "score"; putts: number }
  | { type: "undo" }
  | { type: "next" | "finish"; at: number }
  | { type: "continue" };
export const emptyCourse = (): CourseState => ({ version: 1, history: [], active: null });
export const courseStorageKey = (user: string | null) => `sg4-putt-course-v1:${user ?? "guest"}`;
export const holeStars = (shots: readonly number[], index: number) =>
  !shots.length
    ? 0
    : shots[0] === 1
      ? maxStars(index)
      : shots[0] === 2
        ? COURSE_DISTANCES[index] >= 8
          ? 2
          : 1
        : 0;
export const roundStars = (round: Pick<CourseRound, "holes">) =>
  round.holes.reduce((s, h, i) => s + holeStars(h, i), 0);
export const reviewRound = (round: Pick<CourseRound, "holes">) =>
  buildPuttingMatchReview(
    round.holes.map((h, i) => ({
      distance: COURSE_DISTANCES[i],
      yourValue: h[0],
      completed: !!h.length,
    })),
  );
export const courseHandicap = (round: Pick<CourseRound, "holes">) => reviewRound(round).estimate;
export function puttAverage(history: CourseRound[]) {
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
          active: { id: action.id, model: 2, startedAt: action.at, holes: [[]], phase: "play" },
        };
  if (!a) return state;
  const i = a.holes.length - 1;
  if (action.type === "score")
    return a.phase !== "play" ||
      !Number.isInteger(action.putts) ||
      action.putts < 1 ||
      action.putts > 99
      ? state
      : {
          ...state,
          active: { ...a, holes: [...a.holes.slice(0, -1), [action.putts]], phase: "result" },
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
const validHoles = (v: unknown, complete: boolean): v is number[][] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 6 &&
  v.every(
    (h, i) =>
      Array.isArray(h) &&
      (complete || i < v.length - 1 ? h.length === 1 : h.length <= 1) &&
      h.every((p) => Number.isInteger(p) && p >= 1 && p <= 99),
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
        (r.model !== 1 && r.model !== 2) ||
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
      (a.model === 1 || a.model === 2) &&
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
export function puttGoal(active: CourseSession, history: CourseRound[], average = false) {
  const full = history.filter((r) => r.status === "full");
  if (!full.length) return null;
  const done = active.holes.filter((h) => h.length).length;
  if (average && done < 4) return null;
  const target = average ? puttAverage(full).stars : Math.max(...full.map(roundStars));
  const need = Math.floor(target) + 1 - roundStars(active);
  const remaining = COURSE_DISTANCES.slice(done).reduce((s, _, j) => s + maxStars(done + j), 0);
  // A two-putt on each remaining hole is a realistic target; one extra star allows a one-putt opportunity.
  const realistic = COURSE_DISTANCES.slice(done).reduce((s, d) => s + (d >= 8 ? 2 : 1), 0) + 1;
  if (need <= 0) return { need: 0, target };
  return need <= remaining && need <= realistic && (average || need <= 5) ? { need, target } : null;
}

export const STAR_STEPS = [3, 6, 9, 11, 13, 16] as const;
export const starLevel = (stars: number) => STAR_STEPS.filter((n) => stars >= n).length;
export const totalPutts = (round: Pick<CourseRound, "holes">) =>
  round.holes.reduce((sum, h) => sum + (h[0] ?? 0), 0);
export const exactPutts = (round: Pick<CourseRound, "holes" | "model">) =>
  round.model === 2 || !round.holes.some((h) => h[0] === 4);
export const puttsLabel = (round: Pick<CourseRound, "holes" | "model">) =>
  `${exactPutts(round) ? "" : "≥ "}${totalPutts(round)}`;
export function puttStats(history: CourseRound[]) {
  const full = history
    .filter((r) => r.status === "full" && exactPutts(r))
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id));
  const recent = full.slice(0, 5);
  return {
    count: recent.length,
    average: recent.length ? recent.reduce((s, r) => s + totalPutts(r), 0) / recent.length : null,
    best: full.length ? Math.min(...full.map(totalPutts)) : null,
  };
}
export function roundPuttCategory(distance: number, putts: number, gained: number) {
  if ((distance <= 3 && putts >= 3) || putts >= 4)
    return { id: "loss", label: "Stort tapp", tone: "bg-rose-100 text-rose-800" };
  if (putts === 3) return { id: "weak", label: "Svagt", tone: "bg-orange-100 text-orange-800" };
  return puttingReviewCategory(gained);
}
export function puttCountGoal(active: CourseSession, history: CourseRound[]) {
  const done = active.holes.filter((h) => h.length).length,
    remaining = 6 - done;
  if (done < 4 || remaining < 1 || !exactPutts(active)) return null;
  const stats = puttStats(history),
    total = totalPutts(active);
  for (const [target, label] of [
    [stats.best, "puttrekord"],
    [stats.average, "puttsnitt"],
  ] as const) {
    if (target === null) continue;
    const budget = Math.ceil(target) - 1 - total;
    if (budget >= remaining && budget <= remaining * 2)
      return `${budget} puttar på ${remaining === 1 ? "sista hålet" : "sista två"} slår ditt ${label}.`;
  }
  return null;
}
