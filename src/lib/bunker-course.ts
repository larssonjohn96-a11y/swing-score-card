import { handicapFromProximity } from "./bunker";
export const BUNKER_ZONES = [
  {
    points: 4,
    label: "Sänkt",
    top: "Sänkt",
    bottom: "",
    category: "Exceptionellt",
    tone: "bg-teal-100 text-teal-800",
  },
  {
    points: 3,
    label: "Inom 1 m på green",
    top: "Inom",
    bottom: "1 m",
    category: "Utmärkt",
    tone: "bg-blue-100 text-blue-800",
  },
  {
    points: 2,
    label: "1–3 m på green",
    top: "Inom",
    bottom: "1–3 m",
    category: "Bra",
    tone: "bg-emerald-100 text-emerald-800",
  },
  {
    points: 1,
    label: "På green, över 3 m",
    top: "På green",
    bottom: "över 3 m",
    category: "Förväntat",
    tone: "bg-slate-100 text-slate-700",
  },
  {
    points: 0,
    label: "Utanför green / kvar i bunkern",
    top: "Utanför",
    bottom: "green",
    category: "Svagt",
    tone: "bg-orange-100 text-orange-800",
  },
] as const;
export type CourseRound = {
  id: string;
  model: 1;
  startedAt: number;
  finishedAt: number;
  holes: number[][];
  status: "full" | "partial";
};
export type CourseSession = Omit<CourseRound, "finishedAt" | "status"> & {
  phase: "play" | "result";
};
export type CourseState = { version: 1; history: CourseRound[]; active: CourseSession | null };
export type CourseAction =
  | { type: "start"; id: string; at: number }
  | { type: "score"; points: number }
  | { type: "undo" }
  | { type: "next" | "finish"; at: number };
export const emptyCourse = (): CourseState => ({ version: 1, history: [], active: null });
export const courseStorageKey = (user: string | null) => `sg4-bunker-course-v1:${user ?? "guest"}`;
export const holePoints = (shots: readonly number[]) => shots.reduce((a, b) => a + b, 0);
export const holeStars = (shots: readonly number[]) => Math.min(3, holePoints(shots) / 3);
export const roundPoints = (r: Pick<CourseRound, "holes">) =>
  r.holes.reduce((s, h) => s + holePoints(h), 0);
export const roundStars = (r: Pick<CourseRound, "holes">) =>
  r.holes.reduce((s, h) => s + holeStars(h), 0);
export const STAR_STEPS = [1, 2, 3, 4, 5, 6] as const;
export const starLevel = (stars: number) => STAR_STEPS.filter((n) => stars >= n - 1e-9).length;
export const formatStars = (n: number) => n.toFixed(1).replace(".", ",");
// Coarse activity estimate using the app's existing bunker curve. Open-ended zones
// use representative distances; never included in official handicap history.
export function courseHandicap(r: Pick<CourseRound, "holes">) {
  const shots = r.holes.flat();
  if (shots.length < 3) return null;
  const metres = [10, 5, 2, 0.5, 0];
  return (
    Math.round(
      handicapFromProximity(shots.reduce((s, p) => s + metres[p], 0) / shots.length) * 10,
    ) / 10
  );
}
export function bunkerAverage(history: CourseRound[]) {
  const full = history
    .filter((r) => r.status === "full")
    .slice()
    .sort((a, b) => b.finishedAt - a.finishedAt || b.id.localeCompare(a.id))
    .slice(0, 5);
  return {
    count: full.length,
    points: full.length ? full.reduce((s, r) => s + roundPoints(r), 0) / full.length : 0,
    stars: full.length ? full.reduce((s, r) => s + roundStars(r), 0) / full.length : 0,
  };
}
export function bunkerBests(history: CourseRound[]) {
  const full = history.filter((r) => r.status === "full");
  return {
    points: full.length ? Math.max(...full.map(roundPoints)) : null,
    stars: full.length ? Math.max(...full.map(roundStars)) : 0,
  };
}
export function bunkerGoal(active: CourseSession, history: CourseRound[]) {
  const best = bunkerBests(history).points;
  if (best === null) return null;
  const left = 6 - active.holes.flat().length;
  if (!left) return null;
  const target = best + 1 - roundPoints(active);
  if (target <= 0) return "Över personbästa – fortsätt samla!";
  if (target <= Math.min(6, left * 3))
    return `${target} poäng till personbästa · ${left} ${left === 1 ? "boll" : "bollar"} kvar.`;
  const avg = bunkerAverage(history);
  const need = Math.floor(avg.points) + 1 - roundPoints(active);
  return active.holes.length === 2 && need > 0 && need <= Math.min(6, left * 3)
    ? `${need} poäng till över ditt snitt.`
    : null;
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
  const shots = a.holes.at(-1)!;
  if (action.type === "score") {
    if (a.phase !== "play" || !validPoint(action.points) || shots.length === 3) return state;
    const next = [...shots, action.points];
    return {
      ...state,
      active: {
        ...a,
        holes: [...a.holes.slice(0, -1), next],
        phase: next.length === 3 ? "result" : "play",
      },
    };
  }
  if (action.type === "undo")
    return !shots.length
      ? state
      : {
          ...state,
          active: { ...a, holes: [...a.holes.slice(0, -1), shots.slice(0, -1)], phase: "play" },
        };
  if (action.type === "next") {
    if (a.phase !== "result") return state;
    if (a.holes.length === 1)
      return { ...state, active: { ...a, holes: [...a.holes, []], phase: "play" } };
  }
  if (action.type === "finish" || action.type === "next") {
    const holes = a.holes.filter((h) => h.length === 3);
    if (!holes.length) return { ...state, active: null };
    const round: CourseRound = {
      id: a.id,
      model: 1,
      startedAt: a.startedAt,
      finishedAt: action.at,
      holes,
      status: holes.length === 2 ? "full" : "partial",
    };
    return { ...state, active: null, history: [...state.history, round] };
  }
  return state;
}
const validPoint = (p: unknown): p is number =>
  typeof p === "number" && Number.isInteger(p) && p >= 0 && p <= 4;
const validHoles = (v: unknown, complete: boolean): v is number[][] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 2 &&
  v.every(
    (h, i) =>
      Array.isArray(h) &&
      (complete || i < v.length - 1 ? h.length === 3 : h.length <= 3) &&
      h.every(validPoint),
  );
export function parseCourse(raw: string | null): CourseState {
  try {
    const d = JSON.parse(raw ?? "null"),
      s = emptyCourse();
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
      s.history.push({ ...r, status: r.holes.length === 2 ? "full" : "partial" });
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
        model: 1,
        startedAt: a.startedAt,
        holes: a.holes,
        phase: a.holes.at(-1).length === 3 ? "result" : "play",
      };
    return s;
  } catch {
    return emptyCourse();
  }
}
