/** Chipping Practice v1. Product thresholds, not a validated handicap model.
 * Never reuse the old 0–5 match scale or feed these repeated shots into HCP tests.
 */
export type ChipPoints = 0 | 1 | 2 | 3 | 4;
export type ChipLie = "Fairway" | "Ruff";
export type Mastery = "Bronze" | "Silver" | "Gold" | "Elite" | "Perfect";
export type Station = {
  distance: number;
  unlock: number;
  tiers: ReadonlyArray<{ name: Mastery; points: number }>;
};

const station = (distance: number, unlock: number): Station => ({
  distance,
  unlock,
  tiers: [
    { name: "Bronze", points: unlock },
    { name: "Silver", points: unlock + 1 },
    { name: "Gold", points: unlock + 2 },
    { name: "Elite", points: Math.min(11, unlock + 4) },
    { name: "Perfect", points: 12 },
  ],
});
export const CHIP_STATIONS: readonly Station[] = [
  station(8, 8),
  station(12, 7),
  station(16, 6),
  station(20, 5),
  station(25, 4),
  station(30, 3),
];
export const CHIP_ZONES: ReadonlyArray<{ points: ChipPoints; label: string; detail: string }> = [
  { points: 4, label: "Sänkt", detail: "Bollen i hål" },
  { points: 3, label: "Inom 1 m", detail: "Ej sänkt · högst 1 m" },
  { points: 2, label: "1–2 m", detail: "Över 1 m · högst 2 m" },
  { points: 1, label: "2–3 m", detail: "Över 2 m · högst 3 m" },
  { points: 0, label: "Över 3 m", detail: "Mer än 3 m kvar" },
];
export const ROUNDS_PER_PASS = 3;
export const CHIP_STORAGE_PREFIX = "sg4-chip-stations-v1";
export type ChipRound = {
  id: string;
  sessionId: string;
  distance: number;
  lie: ChipLie;
  shots: ChipPoints[];
  at: number;
};
export type ChipSession = {
  id: string;
  lies: ChipLie[];
  phase: "stations" | "play" | "result" | "summary";
  current: ChipRound | null;
  startedAt: number;
  mode?: "guided" | "single";
};
export type ChipProgress = { version: 1; rounds: ChipRound[]; session: ChipSession | null };
export type ChipAction =
  | { type: "start"; id: string; lies: ChipLie[]; at: number; mode?: "guided" | "single" }
  | { type: "begin"; distance: number; lie: ChipLie; id: string; at: number }
  | { type: "score"; points: ChipPoints }
  | { type: "undo" }
  | { type: "stations" }
  | { type: "finish" }
  | { type: "home" };

export const emptyChipProgress = (): ChipProgress => ({ version: 1, rounds: [], session: null });
export const chipStorageKey = (userId: string | null) =>
  `${CHIP_STORAGE_PREFIX}:${userId ?? "guest"}`;
export const getStation = (distance: number) => CHIP_STATIONS.find((s) => s.distance === distance);
export const roundTotal = (round: Pick<ChipRound, "shots">) =>
  round.shots.reduce<number>((sum, p) => sum + p, 0);
export const isChipPoints = (value: unknown): value is ChipPoints =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4;
export const pointsForLeave = (metres: number, holed = false): ChipPoints => {
  if (!Number.isFinite(metres) || metres < 0) throw new RangeError("Invalid leave distance");
  return holed ? 4 : metres <= 1 ? 3 : metres <= 2 ? 2 : metres <= 3 ? 1 : 0;
};
export function bestAt(
  progress: ChipProgress,
  distance: number,
  lie: ChipLie = "Fairway",
): number | null {
  const rounds = progress.rounds.filter((r) => r.distance === distance && r.lie === lie);
  return rounds.length ? Math.max(...rounds.map(roundTotal)) : null;
}
export function recentAt(
  progress: ChipProgress,
  distance: number,
  lie: ChipLie = "Fairway",
): number | null {
  const rounds = progress.rounds.filter((r) => r.distance === distance && r.lie === lie).slice(-5);
  return rounds.length ? rounds.reduce((sum, r) => sum + roundTotal(r), 0) / rounds.length : null;
}
export function masteryAt(distance: number, score: number | null): Mastery | null {
  if (score === null) return null;
  const tiers = getStation(distance)?.tiers ?? [];
  return [...tiers].reverse().find((t) => score >= t.points)?.name ?? null;
}
export function unlockedDistances(progress: ChipProgress, lie: ChipLie = "Fairway"): number[] {
  const distances = [CHIP_STATIONS[0].distance];
  for (let i = 0; i < CHIP_STATIONS.length - 1; i++) {
    const current = CHIP_STATIONS[i];
    if ((bestAt(progress, current.distance, lie) ?? -1) < starTargets(current.distance, lie)[0])
      break;
    distances.push(CHIP_STATIONS[i + 1].distance);
  }
  return distances;
}
/** Three permanent goals; targets remain comparable across lies, progress does not. */
export function starTargets(distance: number, _lie: ChipLie = "Fairway"): readonly number[] {
  const unlock = getStation(distance)!.unlock;
  const adjustment = _lie === "Ruff" ? 1 : 0;
  return [unlock, unlock + 2, unlock + 4].map((value) =>
    Math.max(2, Math.min(12, value - adjustment)),
  );
}
export function starsAt(progress: ChipProgress, distance: number, lie: ChipLie): number {
  const best = bestAt(progress, distance, lie) ?? -1;
  return starTargets(distance, lie).filter((target) => best >= target).length;
}
export function goalAt(progress: ChipProgress, distance: number, lie: ChipLie = "Fairway") {
  const stars = starsAt(progress, distance, lie);
  const next = CHIP_STATIONS[CHIP_STATIONS.findIndex((s) => s.distance === distance) + 1];
  return {
    points: starTargets(distance, lie)[stars] ?? 12,
    label:
      stars === 0 && next
        ? `Öppna ${next.distance} m`
        : stars < 3
          ? `Ta stjärna ${stars + 1}`
          : "Slå ditt rekord",
  };
}
export const sessionRounds = (progress: ChipProgress) =>
  progress.rounds.filter((r) => r.sessionId === progress.session?.id);

/** A transparent default recommendation; users can always pick another unlocked station.
 * No random jumps, no permanent skill estimates from a three-ball sample.
 */
export function recommendStation(
  progress: ChipProgress,
  lie: ChipLie = progress.session?.lies[0] ?? "Fairway",
): { distance: number; reason: string } {
  const unlocked = unlockedDistances(progress, lie);
  const rounds = sessionRounds(progress);
  const last = rounds.at(-1);
  if (!last) return { distance: 8, reason: "Börja kort och hitta kontrollen." };
  const index = CHIP_STATIONS.findIndex((s) => s.distance === last.distance);
  const config = CHIP_STATIONS[index];
  const prior = { ...progress, rounds: progress.rounds.filter((r) => r.id !== last.id) };
  const fresh = unlocked.find((d) => !unlockedDistances(prior, lie).includes(d));
  if (fresh)
    return {
      distance: fresh,
      reason: "Ny station upplåst. Du kan också stanna och förbättra rekordet.",
    };
  if (roundTotal(last) < starTargets(last.distance, lie)[0] - 1 && index > 0) {
    return {
      distance: CHIP_STATIONS[index - 1].distance,
      reason: "Ta ett kortare avstånd och bygg upp kontrollen igen.",
    };
  }
  if (
    roundTotal(last) < config.unlock &&
    (bestAt(progress, last.distance, lie) ?? 0) < config.unlock
  ) {
    return {
      distance: last.distance,
      reason: "Stanna på den här stationen. Längre avstånd väntar.",
    };
  }
  // Bring short-distance precision back regularly, even for advanced players.
  if (rounds.length % 3 === 0 && unlocked.length > 1) {
    const short = unlocked.slice(0, Math.max(1, Math.ceil(unlocked.length / 2)));
    const choice = short.find((d) => d !== last.distance) ?? short[0];
    return {
      distance: choice,
      reason: "Tillbaka till kort precision – nästa stjärna finns även här.",
    };
  }
  const unvisited = unlocked.find((d) => !rounds.some((r) => r.distance === d));
  if (unvisited !== undefined)
    return { distance: unvisited, reason: "Bygg kontroll på nästa upplåsta station." };
  if (rounds.length >= 2 && rounds.at(-2)?.distance === last.distance && unlocked.length > 1) {
    const neighbour = unlocked[Math.max(0, unlocked.indexOf(last.distance) - 1)];
    return {
      distance: neighbour === last.distance ? unlocked[1] : neighbour,
      reason: "Byt station och jaga ett nytt mål.",
    };
  }
  return {
    distance: last.distance,
    reason: "Ett nytt försök på samma avstånd, eller välj en annan station.",
  };
}

/** Pure state transitions: completion, unlocks and persistence cannot double-count taps. */
export function reduceChipProgress(state: ChipProgress, action: ChipAction): ChipProgress {
  const session = state.session;
  if (action.type === "start") {
    const lies = [...new Set(action.lies)].filter(
      (lie): lie is ChipLie => lie === "Fairway" || lie === "Ruff",
    );
    if (!lies.length) return state;
    return {
      ...state,
      session: {
        id: action.id,
        lies,
        phase: "stations",
        current: null,
        startedAt: action.at,
        ...(action.mode ? { mode: action.mode } : {}),
      },
    };
  }
  if (action.type === "home") return { ...state, session: null };
  if (!session) return state;
  if (action.type === "begin") {
    if (
      session.mode &&
      sessionRounds(state).length >= (session.mode === "guided" ? ROUNDS_PER_PASS : 1)
    )
      return state;
    if (session.phase === "summary") return state;
    if (session.phase === "play" && session.current?.shots.length) return state;
    if (
      !unlockedDistances(state, action.lie).includes(action.distance) ||
      !session.lies.includes(action.lie)
    )
      return state;
    if (state.rounds.some((r) => r.id === action.id)) return state;
    return {
      ...state,
      session: {
        ...session,
        phase: "play",
        current: {
          id: action.id,
          sessionId: session.id,
          distance: action.distance,
          lie: action.lie,
          shots: [],
          at: action.at,
        },
      },
    };
  }
  if (action.type === "score") {
    if (
      session.phase !== "play" ||
      !session.current ||
      !isChipPoints(action.points) ||
      session.current.shots.length >= 3
    )
      return state;
    const current = { ...session.current, shots: [...session.current.shots, action.points] };
    const complete = current.shots.length === 3;
    return {
      ...state,
      rounds:
        complete && !state.rounds.some((r) => r.id === current.id)
          ? [...state.rounds, current]
          : state.rounds,
      session: { ...session, current, phase: complete ? "result" : "play" },
    };
  }
  if (action.type === "undo") {
    if (!session.current?.shots.length || !["play", "result"].includes(session.phase)) return state;
    return {
      ...state,
      rounds: state.rounds.filter((r) => r.id !== session.current!.id),
      session: {
        ...session,
        phase: "play",
        current: { ...session.current, shots: session.current.shots.slice(0, -1) },
      },
    };
  }
  if (action.type === "stations") {
    if (session.phase === "play" && session.current?.shots.length) return state;
    return { ...state, session: { ...session, phase: "stations", current: null } };
  }
  if (action.type === "finish")
    return { ...state, session: { ...session, phase: "summary", current: null } };
  return state;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
function validRound(value: unknown, complete: boolean): value is ChipRound {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.sessionId === "string" &&
    typeof value.distance === "number" &&
    !!getStation(value.distance) &&
    (value.lie === "Fairway" || value.lie === "Ruff") &&
    typeof value.at === "number" &&
    Number.isFinite(value.at) &&
    Array.isArray(value.shots) &&
    (complete ? value.shots.length === 3 : value.shots.length <= 3) &&
    value.shots.every(isChipPoints)
  );
}
/** Ignore the legacy 0–5 scale and malformed records. Restore unfinished rounds safely. */
export function parseChipProgress(raw: string | null): ChipProgress {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (
      !isRecord(data) ||
      (data.version !== 1 && data.version !== 2) ||
      !Array.isArray(data.rounds)
    )
      return emptyChipProgress();
    const ids = new Set<string>();
    const rounds = data.rounds.filter((r): r is ChipRound => {
      if (!validRound(r, true) || ids.has(r.id)) return false;
      ids.add(r.id);
      return true;
    });
    const progress: ChipProgress = { version: 1, rounds, session: null };
    if (data.version === 2) return progress;
    const session = data.session;
    if (
      !isRecord(session) ||
      typeof session.id !== "string" ||
      typeof session.startedAt !== "number" ||
      !Number.isFinite(session.startedAt) ||
      !Array.isArray(session.lies)
    )
      return progress;
    const lies = [
      ...new Set(session.lies.filter((l): l is ChipLie => l === "Fairway" || l === "Ruff")),
    ];
    if (!lies.length || !["stations", "play", "result", "summary"].includes(String(session.phase)))
      return progress;
    const current =
      validRound(session.current, false) &&
      session.current.sessionId === session.id &&
      lies.includes(session.current.lie) &&
      unlockedDistances(progress, session.current.lie).includes(session.current.distance)
        ? session.current
        : null;
    let phase = session.phase as ChipSession["phase"];
    if ((phase === "play" || phase === "result") && !current) phase = "stations";
    if (current && (phase === "play" || phase === "result")) {
      if (current.shots.length === 3) {
        phase = "result";
        if (!ids.has(current.id)) rounds.push(current);
      } else {
        phase = "play";
        // An incomplete draft cannot simultaneously be a committed round.
        progress.rounds = rounds.filter((r) => r.id !== current.id);
      }
    }
    progress.session = {
      id: session.id,
      lies,
      startedAt: session.startedAt,
      ...(session.mode === "guided" || session.mode === "single" ? { mode: session.mode } : {}),
      phase,
      current: phase === "play" || phase === "result" ? current : null,
    };
    return progress;
  } catch {
    return emptyChipProgress();
  }
}
