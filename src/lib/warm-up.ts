export const STATIONS = {
  range: {
    title: "Driving range",
    short: "Range",
    icon: "🏌️",
    focus: "Hitta rytmen och en trygg känsla med utslagsklubban.",
    text: "Börja lugnt med wedgar. Gå vidare till järn och avsluta med din utslagsklubba. Använd din vanliga rutin.",
    question: "Känns bollträffen och rytmen bra?",
    weight: 15,
  },
  chip: {
    title: "Chippinggreen",
    short: "Chipp",
    icon: "⛳",
    focus: "Känn in bollträffen och hur bollen rullar.",
    text: "Välj ett bekvämt läge. Upprepa några chippar mot samma landningspunkt och prova sedan ett annat mål.",
    question: "Har du hittat känslan i chippningen?",
    weight: 5,
  },
  bunker: {
    title: "Bunker",
    short: "Bunker",
    icon: "☀️",
    focus: "Hitta en trygg känsla i sanden.",
    text: "Välj ett vanligt läge och känn in sandkontakten med din vanliga teknik. Avsluta när du känner dig redo.",
    question: "Känns sandkontakten trygg?",
    weight: 4,
  },
  putt: {
    title: "Puttinggreen",
    short: "Putt",
    icon: "⚑",
    focus: "Hitta dagens längdkänsla och en trygg startlinje.",
    text: "Börja med några puttar från samma avstånd. Prova sedan längre puttar åt olika håll och avsluta med några bekväma kortputtar.",
    question: "Har du hittat dagens längdkänsla?",
    weight: 7,
  },
} as const;
export type Station = keyof typeof STATIONS;
export type Feeling = "good" | "medium" | "notyet";
export type Prefs = {
  minutes: number;
  order: Station[];
  weights: Record<Station, number>;
  mode: "guided" | "custom";
};
export type WarmSession = {
  id: string;
  startedAt: number;
  teeAt: number;
  reserve: number;
  order: Station[];
  weights: Record<Station, number>;
  done: Station[];
  skipped: Station[];
  ratings: Partial<Record<Station, Feeling>>;
  current: Station;
  stationAt: number;
  dueAt: number;
  manual: boolean;
  finishedAt?: number;
  followup?: "done" | "dismissed";
  deferUntil?: number;
  readiness?: Feeling;
  helped?: Station;
  more?: Station;
};
export type WarmState = {
  version: 1;
  prefs: Prefs;
  active: WarmSession | null;
  history: WarmSession[];
};
export const defaults = (): Prefs => ({
  minutes: 30,
  order: ["range", "chip", "putt"],
  weights: { range: 15, chip: 5, bunker: 4, putt: 7 },
  mode: "guided",
});
export const emptyWarm = (): WarmState => ({
  version: 1,
  prefs: defaults(),
  active: null,
  history: [],
});
export const warmKey = (id: string | null) => `sg4-warm-up-v1:${id ?? "guest"}`;
const station = (s: unknown): s is Station => typeof s === "string" && Object.hasOwn(STATIONS, s);
const validPrefs = (p: any): p is Prefs =>
  p &&
  Number.isFinite(p.minutes) &&
  p.minutes >= 5 &&
  p.minutes <= 60 &&
  ["guided", "custom"].includes(p.mode) &&
  Array.isArray(p.order) &&
  p.order.length > 0 &&
  p.order.length <= 4 &&
  new Set(p.order).size === p.order.length &&
  p.order.every(station) &&
  Object.keys(STATIONS).every(
    (k) => Number.isFinite(p.weights?.[k]) && p.weights[k] >= 1 && p.weights[k] <= 30,
  );
function validSession(s: any): s is WarmSession {
  return (
    s &&
    typeof s.id === "string" &&
    validPrefs({ minutes: 30, order: s.order, weights: s.weights, mode: "guided" }) &&
    station(s.current) &&
    s.order.includes(s.current) &&
    Number.isFinite(s.startedAt) &&
    Number.isFinite(s.teeAt) &&
    s.teeAt > s.startedAt &&
    Number.isFinite(s.reserve) &&
    s.reserve >= 0 &&
    s.reserve <= 5 &&
    Number.isFinite(s.stationAt) &&
    Number.isFinite(s.dueAt) &&
    typeof s.manual === "boolean" &&
    Array.isArray(s.done) &&
    Array.isArray(s.skipped) &&
    [...s.done, ...s.skipped].every((x) => s.order.includes(x)) &&
    new Set([...s.done, ...s.skipped]).size === s.done.length + s.skipped.length &&
    s.ratings &&
    Object.entries(s.ratings).every(
      ([k, v]) => station(k) && ["good", "medium", "notyet"].includes(v as string),
    ) &&
    (s.finishedAt === undefined || Number.isFinite(s.finishedAt)) &&
    (s.deferUntil === undefined || Number.isFinite(s.deferUntil)) &&
    (s.followup === undefined || ["done", "dismissed"].includes(s.followup)) &&
    (s.readiness === undefined || ["good", "medium", "notyet"].includes(s.readiness)) &&
    (s.helped === undefined || s.done.includes(s.helped)) &&
    (s.more === undefined || s.order.includes(s.more))
  );
}
export function parseWarm(raw: string | null): WarmState {
  try {
    const d = JSON.parse(raw ?? "null");
    if (d?.version !== 1) return emptyWarm();
    return {
      version: 1,
      prefs: validPrefs(d.prefs) ? d.prefs : defaults(),
      active: validSession(d.active) && !d.active.finishedAt ? d.active : null,
      history: Array.isArray(d.history)
        ? d.history.filter((s: any) => validSession(s) && s.finishedAt).slice(-100)
        : [],
    };
  } catch {
    return emptyWarm();
  }
}
export function remaining(s: WarmSession) {
  return s.order.filter((x) => !s.done.includes(x) && !s.skipped.includes(x));
}
export function allocation(
  order: Station[],
  weights: Record<Station, number>,
  minutes: number,
): Partial<Record<Station, number>> {
  const budget = Math.max(0, minutes),
    total = order.reduce((n, k) => n + weights[k], 0);
  return Object.fromEntries(order.map((k) => [k, total ? (budget * weights[k]) / total : 0]));
}
export function plan(s: WarmSession, now: number) {
  return allocation(remaining(s), s.weights, (s.teeAt - now) / 60000 - s.reserve);
}
export function startWarm(prefs: Prefs, now: number, id: string): WarmSession {
  const reserve = Math.min(3, Math.max(1, Math.floor(prefs.minutes / 10))),
    s: WarmSession = {
      id,
      startedAt: now,
      teeAt: now + prefs.minutes * 60000,
      reserve,
      order: [...prefs.order],
      weights: { ...prefs.weights },
      done: [],
      skipped: [],
      ratings: {},
      current: prefs.order[0],
      stationAt: now,
      dueAt: now,
      manual: false,
    };
  s.dueAt = now + (plan(s, now)[s.current] ?? 0) * 60000;
  return s;
}
export function switchStation(s: WarmSession, next: Station, now: number): WarmSession {
  if (!remaining(s).includes(next)) return s;
  const updated = { ...s, current: next, stationAt: now };
  return {
    ...updated,
    dueAt: Math.min(s.teeAt - s.reserve * 60000, now + (plan(updated, now)[next] ?? 0) * 60000),
  };
}
export function finishStation(
  s: WarmSession,
  now: number,
  feeling?: Feeling,
  skip = false,
): WarmSession {
  const updated = {
    ...s,
    done: skip ? s.done : [...s.done, s.current],
    skipped: skip ? [...s.skipped, s.current] : s.skipped,
    ratings: feeling ? { ...s.ratings, [s.current]: feeling } : s.ratings,
  };
  const next = remaining(updated)[0];
  return !next ? { ...updated, finishedAt: now } : switchStation(updated, next, now);
}
export function snooze(s: WarmSession, now: number) {
  return { ...s, dueAt: Math.min(now + 3 * 60000, s.teeAt - s.reserve * 60000) };
}
export function followupDue(state: WarmState, now: number) {
  if (state.active) return null;
  const s = [...state.history].sort((a, b) => b.startedAt - a.startedAt)[0];
  return s &&
    s.done.length > 0 &&
    !s.followup &&
    now >= s.teeAt + 5 * 3600000 &&
    now <= s.teeAt + 48 * 3600000 &&
    now >= (s.deferUntil ?? 0)
    ? s
    : null;
}
