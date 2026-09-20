import {
  STATIONS,
  defaults as legacyDefaults,
  parseWarm as parseLegacy,
  warmKey,
  type Station,
  type Feeling,
} from "./warm-up";
export { STATIONS, warmKey };
export type { Station, Feeling };

export type RoutinePrefs = {
  timing?: "duration" | "tee";
  minutes: number;
  order: Station[];
  weights: Record<Station, number>;
  body: boolean;
  reserve: number;
  useStats: boolean;
  par3: number[];
  holes: 9 | 18;
};
export type Focus = { distance: number; reason: string; detail: string; samples: number };
export type WarmProfile = { putt?: Focus; chip?: Focus; approach?: Focus };
export type Exercise = {
  id: string;
  title: string;
  instruction: string;
  cue: string;
  distance?: number;
  count?: number;
  seconds?: number;
};
export type Visit = {
  id: string;
  kind: Station | "body" | "tee";
  title: string;
  minutes: number;
  exercises: Exercise[];
  focus?: Focus;
};
export type RoutineChange =
  "keep" | "putt-first" | "range-last" | "two-putts" | "more-putt" | "more-chip" | "more-range";
export type RoutineSession = {
  id: string;
  timing?: "duration" | "tee";
  startedAt: number;
  teeAt: number;
  reserve: number;
  holes: 9 | 18;
  visits: Visit[];
  current: number;
  exercise: number;
  visitAt: number;
  dueAt: number;
  phase: "intro" | "exercise" | "check";
  done: string[];
  skipped: string[];
  ratings: Record<string, Feeling>;
  manual: boolean;
  finishedAt?: number;
  feedback?: { rating: Feeling; change: RoutineChange | "custom" };
  followup?: "done" | "dismissed";
  roundFeeling?: "better" | "same" | "worse" | "unsure";
  deferUntil?: number;
};
export type RoutineState = {
  version: 2;
  prefs: RoutinePrefs;
  active: RoutineSession | null;
  history: RoutineSession[];
};
export const routineDefaults = (): RoutinePrefs => ({
  timing: "duration",
  minutes: 30,
  order: ["range", "chip", "putt"],
  weights: legacyDefaults().weights,
  body: true,
  reserve: 5,
  useStats: true,
  par3: [],
  holes: 18,
});
export const emptyRoutine = (): RoutineState => ({
  version: 2,
  prefs: routineDefaults(),
  active: null,
  history: [],
});
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const isStation = (s: unknown): s is Station => typeof s === "string" && Object.hasOwn(STATIONS, s);
const isFeeling = (s: unknown): s is Feeling => s === "good" || s === "medium" || s === "notyet";
export function normalizePrefs(value: Partial<RoutinePrefs>): RoutinePrefs {
  const d = routineDefaults();
  const order = Array.isArray(value.order)
    ? value.order
        .filter(isStation)
        .filter((s, i, all) => all.slice(0, i).filter((k) => k === s).length < 1)
        .slice(0, 5)
    : d.order;
  return {
    timing: value.timing === "tee" ? "tee" : "duration",
    minutes: finite(value.minutes) ? clamp(Math.round(value.minutes), 5, 120) : d.minutes,
    order: order.length ? order : d.order,
    weights: Object.fromEntries(
      Object.keys(STATIONS).map((k) => [
        k,
        finite(value.weights?.[k as Station])
          ? clamp(value.weights![k as Station], 1, 30)
          : d.weights[k as Station],
      ]),
    ) as RoutinePrefs["weights"],
    body: typeof value.body === "boolean" ? value.body : d.body,
    reserve: finite(value.reserve) ? clamp(value.reserve, 1, 15) : d.reserve,
    useStats: typeof value.useStats === "boolean" ? value.useStats : true,
    par3: Array.isArray(value.par3)
      ? [...new Set(value.par3.filter((n) => finite(n) && n >= 70 && n <= 220))].slice(0, 3)
      : [],
    holes: value.holes === 9 ? 9 : 18,
  };
}
function exercise(
  id: string,
  title: string,
  instruction: string,
  cue: string,
  extra: Partial<Exercise> = {},
): Exercise {
  return { id, title, instruction, cue, ...extra };
}
const distanceTask = (kind: "putt" | "chip", d: number) =>
  exercise(
    `${kind}-${d}`,
    kind === "putt" ? "Putta 3 bollar" : "Chippa 3 bollar",
    kind === "putt"
      ? "Putta mot samma hål. Samla bollarna när alla tre är slagna."
      : "Sikta på en flagga. Försök få bollarna att stanna inom 1–2 meter från flaggan.",
    kind === "putt"
      ? d <= 2
        ? "Se bollen rulla på din valda startlinje."
        : "Låt bollen stanna nära hålet. Känn in farten."
      : "Välj en landningspunkt och använd din vanliga teknik.",
    { distance: d, count: 3 },
  );
export function buildVisits(p: RoutinePrefs, profile: WarmProfile = {}): Visit[] {
  const prefs = normalizePrefs(p);
  const data = prefs.useStats ? profile : {};
  // A short routine drops whole visits instead of reducing every station to seconds.
  const available = Math.max(
    2,
    prefs.minutes - (prefs.timing === "tee" ? Math.min(prefs.reserve, prefs.minutes - 2) : 0),
  );
  let order = [...prefs.order];
  const stationBudget = available - (prefs.body ? 1 : 0);
  const capacity = Math.max(1, Math.floor(stationBudget / 2.5));
  if (order.length > capacity) {
    const chosen = new Set<number>();
    const putt = order.lastIndexOf("putt");
    if (putt >= 0) chosen.add(putt);
    for (let i = 0; i < order.length && chosen.size < capacity; i++) chosen.add(i);
    order = order.filter((_, i) => chosen.has(i));
  }
  const visits: Visit[] = [];
  if (prefs.body)
    visits.push({
      id: "body",
      kind: "body",
      title: "Väck kroppen",
      minutes: available >= 15 ? 2 : 1,
      exercises:
        available >= 15
          ? [
              exercise(
                "turn",
                "Mjuka rotationer",
                "Stå stadigt. Vrid överkroppen lugnt åt båda håll med armarna över bröstet.",
                "Börja smått och rör dig så långt som känns bekvämt.",
                { seconds: 30 },
              ),
              exercise(
                "hips",
                "Väck höfter och ben",
                "Ta små sidosteg och böj lätt i knäna. Växla sida i lugn takt.",
                "Håll rörelserna mjuka och bekväma.",
                { seconds: 30 },
              ),
              exercise(
                "swing",
                "Bygg upp svingen",
                "Gör 5 lugna provsvingar. Börja med en halv sving och öka gradvis till din vanliga sving.",
                "Låt tempot växa utan att jaga maxfart.",
                { count: 5 },
              ),
            ]
          : [
              exercise(
                "body-quick",
                "Väck kroppen",
                "Vrid överkroppen mjukt åt båda håll. Gör sedan 5 provsvingar, från liten till vanlig sving.",
                "Rör dig i ett bekvämt tempo.",
                { seconds: 60 },
              ),
            ],
    });
  const counts: Partial<Record<Station, number>> = {};
  const totalWeight = order.reduce(
    (n, k) => n + prefs.weights[k] / order.filter((s) => s === k).length,
    0,
  );
  const budget = Math.max(0.5, available - (visits[0]?.minutes ?? 0));
  for (const kind of order) {
    const ordinal = counts[kind] ?? 0;
    counts[kind] = ordinal + 1;
    const minutes =
      (budget * (prefs.weights[kind] / order.filter((s) => s === kind).length)) / totalWeight;
    let exercises: Exercise[];
    let focus: Focus | undefined;
    if (kind === "putt") {
      focus = data.putt;
      const long = focus
        ? [
            ...new Set([
              Math.max(4, focus.distance - 2),
              Math.min(20, focus.distance + 2),
              focus.distance,
            ]),
          ]
        : [8, 12, 10];
      const split = order.filter((k) => k === "putt").length === 2;
      const distances = split
        ? ordinal === 0
          ? long.slice(0, 2)
          : [long[long.length - 1], 1]
        : [...long, 1];
      const selected =
        minutes < 2
          ? [ordinal > 0 ? 1 : (focus?.distance ?? 8)]
          : minutes < 4 && !split
            ? [focus?.distance ?? 8, 1]
            : distances;
      exercises = selected.map((d) => distanceTask("putt", d));
    } else if (kind === "chip") {
      focus = data.chip;
      exercises = (
        minutes < 3 ? [focus?.distance ?? 8] : [...new Set([8, focus?.distance ?? 14])]
      ).map((d) => distanceTask("chip", d));
    } else if (kind === "bunker") {
      exercises = [
        exercise(
          "sand",
          "Slå 3 bunkerslag",
          "Välj ett vanligt läge i sanden och ett stort mål på green. Slå alla tre före du hämtar bollarna.",
          "Känn in sandkontakten med din vanliga teknik.",
          { count: 3 },
        ),
      ];
    } else {
      exercises = [
        exercise(
          "bag",
          "Arbeta dig upp genom bagen",
          "Börja med lugna wedgar. Gå vidare till korta och sedan längre järn när bollträffen känns bra.",
          "Öka svinglängden gradvis. Du väljer när du är redo att gå vidare.",
        ),
        exercise(
          "par3",
          "Förbered ett par 3-utslag",
          "Välj ett mål på rangen som liknar ett par 3-hål på dagens bana. Välj klubba, sikta och gör din vanliga rutin.",
          "Om det saknas ett passande mål kan du gå vidare.",
        ),
        exercise(
          "first-tee",
          "Förbered första utslaget",
          "Ta klubban du tänker använda på första tee. Föreställ dig hålet och slå mot ett tydligt mål.",
          "Använd bara klubbor som är tillåtna på rangen. Annars går du vidare.",
        ),
        exercise(
          "free",
          "Avsluta med fria slag",
          "Välj de klubbor och slag du vill känna lite mer på. Avsluta när du känner dig redo.",
          "Behåll ditt vanliga tempo. Du behöver inte ändra tekniken.",
        ),
      ];
    }
    visits.push({
      id: `${kind}-${ordinal}`,
      kind,
      title:
        kind === "putt" && order.filter((k) => k === "putt").length === 2
          ? `Puttinggreen · pass ${ordinal + 1}`
          : STATIONS[kind].title,
      minutes,
      exercises,
      focus,
    });
  }
  return visits;
}
export function pendingVisits(s: RoutineSession) {
  return s.visits.filter((v) => !s.done.includes(v.id) && !s.skipped.includes(v.id));
}
function deadline(s: RoutineSession, now: number) {
  const left = Math.max(0, s.teeAt - s.reserve * 60000 - now);
  const total = pendingVisits(s).reduce((n, v) => n + v.minutes, 0);
  return now + left * (s.visits[s.current].minutes / (total || 1));
}
export function startRoutine(
  p: RoutinePrefs,
  profile: WarmProfile,
  now: number,
  id: string,
  teeAt = now + p.minutes * 60000,
): RoutineSession {
  const minutes = (teeAt - now) / 60000;
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120)
    throw new Error("Välj en starttid 5–120 minuter framåt.");
  const prefs = normalizePrefs({ ...p, minutes });
  const s: RoutineSession = {
    id,
    startedAt: now,
    teeAt,
    timing: prefs.timing,
    reserve: prefs.timing === "tee" ? Math.min(prefs.reserve, minutes - 2) : 0,
    holes: prefs.holes,
    visits: buildVisits(prefs, profile),
    current: 0,
    exercise: 0,
    visitAt: now,
    dueAt: now,
    phase: "intro",
    done: [],
    skipped: [],
    ratings: {},
    manual: false,
  };
  s.dueAt = deadline(s, now);
  return s;
}
export function goToVisit(s: RoutineSession, index: number, now: number): RoutineSession {
  if (
    s.finishedAt ||
    !s.visits[index] ||
    s.done.includes(s.visits[index].id) ||
    s.skipped.includes(s.visits[index].id)
  )
    return s;
  const next = { ...s, current: index, exercise: 0, visitAt: now, phase: "intro" as const };
  return { ...next, dueAt: deadline(next, now) };
}
export function completeVisit(
  s: RoutineSession,
  now: number,
  feeling?: Feeling,
  skip = false,
): RoutineSession {
  if (s.finishedAt) return s;
  const id = s.visits[s.current].id;
  if (s.done.includes(id) || s.skipped.includes(id)) return s;
  const next = {
    ...s,
    done: skip ? s.done : [...s.done, id],
    skipped: skip ? [...s.skipped, id] : s.skipped,
    ratings: feeling ? { ...s.ratings, [id]: feeling } : s.ratings,
  };
  const index = next.visits.findIndex(
    (v) => !next.done.includes(v.id) && !next.skipped.includes(v.id),
  );
  return index < 0 ? { ...next, finishedAt: now } : goToVisit(next, index, now);
}
export function beginVisit(s: RoutineSession, now: number): RoutineSession {
  if (s.finishedAt || s.phase !== "intro") return s;
  return { ...s, phase: "exercise", visitAt: now, dueAt: deadline(s, now) };
}
export function advanceExercise(s: RoutineSession, now: number): RoutineSession {
  if (s.finishedAt || s.phase !== "exercise") return s;
  const visit = s.visits[s.current];
  if (s.exercise < visit.exercises.length - 1) return { ...s, exercise: s.exercise + 1 };
  return completeVisit(s, now);
}
export function finishRoutine(s: RoutineSession, now: number): RoutineSession {
  return s.finishedAt
    ? s
    : {
        ...s,
        finishedAt: now,
        skipped: [...new Set([...s.skipped, ...pendingVisits(s).map((v) => v.id)])],
      };
}
export function extendVisit(s: RoutineSession, now: number): RoutineSession {
  if (s.finishedAt) return s;
  const visit = s.visits[s.current];
  // Revisit the current task with one calm cue; no technical swing diagnosis.
  const exercises = visit.exercises.map((e, i) =>
    i === s.exercise
      ? { ...e, cue: "Upprepa i lugnt tempo. Du väljer när du är redo att gå vidare." }
      : e,
  );
  return {
    ...s,
    visits: s.visits.map((v, i) => (i === s.current ? { ...v, exercises } : v)),
    phase: "exercise",
    dueAt: Math.max(now, Math.min(now + 2 * 60000, s.teeAt - s.reserve * 60000)),
  };
}
export function applyRoutineChange(p: RoutinePrefs, change: RoutineChange): RoutinePrefs {
  let order = [...p.order];
  const weights = { ...p.weights };
  if (change === "putt-first") {
    const first = order.indexOf("putt");
    order = ["putt", ...order.filter((_, i) => i !== first)];
  }
  if (change === "range-last") order = [...order.filter((k) => k !== "range"), "range"];
  if (change === "two-putts") order = ["putt", ...order.filter((k) => k !== "putt"), "putt"];
  if (change.startsWith("more-")) {
    const kind = change.slice(5) as Station;
    if (!order.includes(kind)) order.push(kind);
    weights[kind] = Math.min(30, weights[kind] + 3);
  }
  return normalizePrefs({ ...p, order, weights });
}
export function saveRoutineFeedback(
  state: RoutineState,
  id: string,
  rating: Feeling,
  change: RoutineChange,
  custom?: RoutinePrefs,
): RoutineState {
  const session = state.history.find((s) => s.id === id);
  if (!session || session.feedback) return state;
  return {
    ...state,
    prefs: custom ? normalizePrefs(custom) : applyRoutineChange(state.prefs, change),
    history: state.history.map((s) =>
      s.id === id ? { ...s, feedback: { rating, change: custom ? "custom" : change } } : s,
    ),
  };
}
export function routineFollowupDue(state: RoutineState, now: number) {
  if (state.active) return null;
  const s = [...state.history].sort((a, b) => b.startedAt - a.startedAt)[0];
  return s &&
    s.done.some((id) => !["body", "tee"].includes(id)) &&
    !s.followup &&
    now >= s.teeAt + (s.holes === 9 ? 2 : 4) * 3600000 &&
    now <= s.teeAt + 48 * 3600000 &&
    now >= (s.deferUntil ?? 0)
    ? s
    : null;
}
function validSession(v: unknown): v is RoutineSession {
  if (!v || typeof v !== "object") return false;
  const s = v as RoutineSession;
  if (
    typeof s.id !== "string" ||
    !finite(s.startedAt) ||
    !finite(s.teeAt) ||
    s.teeAt <= s.startedAt ||
    !finite(s.reserve) ||
    s.reserve < 0 ||
    s.reserve > 15 ||
    !finite(s.dueAt) ||
    !finite(s.visitAt)
  )
    return false;
  if (
    !Array.isArray(s.visits) ||
    !s.visits.length ||
    s.visits.length > 7 ||
    !s.visits.every(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.title === "string" &&
        (isStation(v.kind) || v.kind === "body" || v.kind === "tee") &&
        finite(v.minutes) &&
        v.minutes >= 0 &&
        Array.isArray(v.exercises) &&
        v.exercises.length > 0 &&
        v.exercises.length <= 8 &&
        v.exercises.every(
          (e) =>
            e &&
            typeof e.id === "string" &&
            typeof e.title === "string" &&
            typeof e.instruction === "string" &&
            typeof e.cue === "string" &&
            (e.distance === undefined || finite(e.distance)),
        ),
    )
  )
    return false;
  if (
    new Set(s.visits.map((v) => v.id)).size !== s.visits.length ||
    !Number.isInteger(s.current) ||
    s.current < 0 ||
    !s.visits[s.current] ||
    !Number.isInteger(s.exercise) ||
    s.exercise < 0 ||
    !s.visits[s.current].exercises[s.exercise]
  )
    return false;
  if (
    !Array.isArray(s.done) ||
    !Array.isArray(s.skipped) ||
    new Set([...s.done, ...s.skipped]).size !== s.done.length + s.skipped.length ||
    ![...s.done, ...s.skipped].every((id) => s.visits.some((v) => v.id === id))
  )
    return false;
  return (
    (s.phase === "intro" || s.phase === "exercise" || s.phase === "check") &&
    typeof s.manual === "boolean" &&
    (s.holes === 9 || s.holes === 18) &&
    !!s.ratings &&
    Object.values(s.ratings).every(isFeeling) &&
    (s.finishedAt === undefined || finite(s.finishedAt)) &&
    (s.deferUntil === undefined || finite(s.deferUntil)) &&
    (s.followup === undefined || s.followup === "done" || s.followup === "dismissed") &&
    (!s.feedback || isFeeling(s.feedback.rating))
  );
}
export function parseRoutine(raw: string | null): RoutineState {
  try {
    const d = JSON.parse(raw ?? "null");
    if (d?.version === 2)
      return {
        version: 2,
        prefs: normalizePrefs(d.prefs ?? {}),
        active: validSession(d.active) && !d.active.finishedAt ? d.active : null,
        history: Array.isArray(d.history)
          ? d.history.filter((s: unknown) => validSession(s) && s.finishedAt).slice(-100)
          : [],
      };
    if (d?.version !== 1) return emptyRoutine();
    const legacy = parseLegacy(raw);
    const prefs = normalizePrefs({ ...legacy.prefs, body: true });
    const migrate = (s: NonNullable<typeof legacy.active>): RoutineSession => {
      // Preserve an in-progress legacy routine; physical warm-up is added next time.
      const visits = buildVisits(
        { ...prefs, minutes: 60, order: s.order, weights: s.weights, body: false },
        {},
      ).filter((v) => v.kind !== "tee");
      const current = Math.max(
        0,
        visits.findIndex((v) => v.kind === s.current),
      );
      const ids = (kinds: Station[]) =>
        visits.filter((v) => kinds.includes(v.kind as Station)).map((v) => v.id);
      return {
        id: s.id,
        startedAt: s.startedAt,
        teeAt: s.teeAt,
        reserve: s.reserve,
        holes: 18,
        visits,
        current,
        exercise: 0,
        visitAt: s.stationAt,
        dueAt: s.dueAt,
        phase: "exercise",
        done: ids(s.done),
        skipped: ids(s.skipped),
        ratings: Object.fromEntries(
          visits.flatMap((v) =>
            s.ratings[v.kind as Station] ? [[v.id, s.ratings[v.kind as Station]!]] : [],
          ),
        ),
        manual: s.manual,
        finishedAt: s.finishedAt,
        followup: s.followup,
        deferUntil: s.deferUntil,
      };
    };
    return {
      version: 2,
      prefs,
      active: legacy.active ? migrate(legacy.active) : null,
      history: legacy.history.map(migrate),
    };
  } catch {
    return emptyRoutine();
  }
}
