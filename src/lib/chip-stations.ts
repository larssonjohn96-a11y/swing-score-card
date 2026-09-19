/** Chipping Practice v2 – stations, stars and guided rounds.
 * Product thresholds, not a validated handicap model.
 * Never reuse the old 0–5 match scale or feed these repeated shots into HCP tests.
 */
export type ChipPoints = 0 | 1 | 2 | 3 | 4;
export type ChipLie = "Fairway" | "Ruff";
export type ChipMode = "guided" | "standalone";

export const CHIP_DISTANCES = [8, 12, 16, 20, 25, 30] as const;
export const ROUNDS_PER_GUIDED = 3;
export const BALLS_PER_ROUND = 3;
export const MAX_ROUND_POINTS = 12;
export const CHIP_LIES: readonly ChipLie[] = ["Fairway", "Ruff"];
export const CHIP_LIE_LABELS: Record<ChipLie, string> = {
  Fairway: "Kortklippt",
  Ruff: "Ruff",
};
export const CHIP_LIE_HELP: Record<ChipLie, string> = {
  Fairway: "Kortklippt gräs utanför green.",
  Ruff: "Längre gräs – bollen syns i ruffen.",
};

export const CHIP_ZONES: ReadonlyArray<{ points: ChipPoints; label: string; detail: string }> = [
  { points: 4, label: "Sänkt", detail: "Bollen i hål" },
  { points: 3, label: "Inom 1 m", detail: "Ej sänkt · högst 1 m" },
  { points: 2, label: "1–2 m", detail: "Över 1 m · högst 2 m" },
  { points: 1, label: "2–3 m", detail: "Över 2 m · högst 3 m" },
  { points: 0, label: "Över 3 m", detail: "Mer än 3 m kvar" },
];
export const CHIP_STORAGE_PREFIX = "sg4-chip-stations-v1";

export type StarThresholds = readonly [number, number, number];
export type Station = { distance: number; index: number };
export const CHIP_STATIONS: readonly Station[] = CHIP_DISTANCES.map((distance, index) => ({
  distance,
  index,
}));

/** Centralised star thresholds per station and lie. Never requires a perfect score. */
export function starThresholds(distance: number, lie: ChipLie): StarThresholds {
  const index = CHIP_DISTANCES.indexOf(distance as (typeof CHIP_DISTANCES)[number]);
  if (index < 0) return [8, 10, 12];
  const first = 8 - index; // 8,7,6,5,4,3
  const penalty = lie === "Ruff" ? 1 : 0;
  const clamp = (value: number) => Math.max(2, Math.min(MAX_ROUND_POINTS, value - penalty));
  return [clamp(first), clamp(first + 2), clamp(first + 4)];
}

export type ChipRound = {
  id: string;
  sessionId: string;
  mode: ChipMode;
  distance: number;
  lie: ChipLie;
  shots: ChipPoints[];
  at: number;
};
export type ChipSession = {
  id: string;
  lie: ChipLie;
  mode: ChipMode;
  phase: "map" | "play" | "result" | "summary";
  current: ChipRound | null;
  startedAt: number;
};
export type ChipProgress = {
  version: 2;
  lie: ChipLie;
  rounds: ChipRound[];
  session: ChipSession | null;
};
export type ChipAction =
  | { type: "setLie"; lie: ChipLie }
  | { type: "map" }
  | { type: "startGuided"; id: string; roundId: string; distance: number; lie: ChipLie; at: number }
  | {
      type: "startStandalone";
      id: string;
      roundId: string;
      distance: number;
      lie: ChipLie;
      at: number;
    }
  | { type: "next"; roundId: string; distance: number; at: number }
  | { type: "score"; points: ChipPoints }
  | { type: "undo" }
  | { type: "finish" }
  | { type: "exit" };

export const emptyChipProgress = (): ChipProgress => ({
  version: 2,
  lie: "Fairway",
  rounds: [],
  session: null,
});
export const chipStorageKey = (userId: string | null) =>
  `${CHIP_STORAGE_PREFIX}:${userId ?? "guest"}`;
export const isChipDistance = (value: unknown): value is number =>
  typeof value === "number" && CHIP_DISTANCES.includes(value as (typeof CHIP_DISTANCES)[number]);
export const roundTotal = (round: Pick<ChipRound, "shots">) =>
  round.shots.reduce<number>((sum, p) => sum + p, 0);
export const isChipPoints = (value: unknown): value is ChipPoints =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4;
export const pointsForLeave = (metres: number, holed = false): ChipPoints => {
  if (!Number.isFinite(metres) || metres < 0) throw new RangeError("Invalid leave distance");
  return holed ? 4 : metres <= 1 ? 3 : metres <= 2 ? 2 : metres <= 3 ? 1 : 0;
};

export function bestAt(progress: ChipProgress, distance: number, lie: ChipLie): number | null {
  const rounds = progress.rounds.filter((r) => r.distance === distance && r.lie === lie);
  return rounds.length ? Math.max(...rounds.map(roundTotal)) : null;
}
export function starsFor(distance: number, lie: ChipLie, score: number | null): 0 | 1 | 2 | 3 {
  if (score === null) return 0;
  const tiers = starThresholds(distance, lie);
  return tiers.filter((t) => score >= t).length as 0 | 1 | 2 | 3;
}
export const starsAt = (progress: ChipProgress, distance: number, lie: ChipLie) =>
  starsFor(distance, lie, bestAt(progress, distance, lie));

/** One star on a station unlocks the next distance for the SAME lie. */
export function unlockedDistances(progress: ChipProgress, lie: ChipLie): number[] {
  const open = [CHIP_DISTANCES[0] as number];
  for (let i = 0; i < CHIP_DISTANCES.length - 1; i++) {
    if (starsAt(progress, CHIP_DISTANCES[i], lie) < 1) break;
    open.push(CHIP_DISTANCES[i + 1]);
  }
  return open;
}
export const isUnlocked = (progress: ChipProgress, distance: number, lie: ChipLie) =>
  unlockedDistances(progress, lie).includes(distance);
export function unlockRequirement(distance: number, lie: ChipLie): string | null {
  const index = CHIP_DISTANCES.indexOf(distance as (typeof CHIP_DISTANCES)[number]);
  if (index <= 0) return null;
  const previous = CHIP_DISTANCES[index - 1];
  return `Ta 1 stjärna på ${previous} m (${starThresholds(previous, lie)[0]} p) från ${CHIP_LIE_LABELS[lie].toLowerCase()}.`;
}
export function totalStars(progress: ChipProgress, lie: ChipLie) {
  const earned = CHIP_DISTANCES.reduce((sum, d) => sum + starsAt(progress, d, lie), 0);
  const available = unlockedDistances(progress, lie).length * 3;
  return { earned, available, max: CHIP_DISTANCES.length * 3 };
}

export type ChipGoal = { points: number; star: 1 | 2 | 3 | null; label: string };
export function goalAt(progress: ChipProgress, distance: number, lie: ChipLie): ChipGoal {
  const best = bestAt(progress, distance, lie);
  const tiers = starThresholds(distance, lie);
  const index = tiers.findIndex((t) => (best ?? -1) < t);
  if (index < 0) return { points: MAX_ROUND_POINTS, star: null, label: "Alla stjärnor tagna" };
  const star = (index + 1) as 1 | 2 | 3;
  const label =
    star === 1 && distance !== CHIP_DISTANCES[CHIP_DISTANCES.length - 1]
      ? `1 stjärna låser upp nästa avstånd`
      : `Nå ${star} ${star === 1 ? "stjärna" : "stjärnor"}`;
  return { points: tiers[index], star, label };
}

export const sessionRounds = (progress: ChipProgress) =>
  progress.rounds.filter((r) => r.sessionId === progress.session?.id);

/** Transparent selection: familiar → near next star → frontier, with short-distance variety. */
export function recommendStation(
  progress: ChipProgress,
  lie: ChipLie,
  played: readonly number[] = sessionRounds(progress).map((r) => r.distance),
): { distance: number; reason: string } {
  const open = unlockedDistances(progress, lie);
  if (open.length === 1)
    return { distance: open[0], reason: "Enda upplåsta stationen – ta första stjärnan här." };
  const last = played.at(-1);
  const repeated = played.length >= 2 && played.at(-2) === last;
  const avoid = (list: number[]) => {
    const filtered = repeated ? list.filter((d) => d !== last) : list;
    return filtered.length ? filtered : list;
  };
  const frontier = open[open.length - 1];
  const shortHalf = open.slice(0, Math.max(1, Math.ceil(open.length / 2)));

  if (starsAt(progress, frontier, lie) === 0 && !repeated)
    return { distance: frontier, reason: "Ny station – en stjärna räcker för att gå vidare." };

  const unplayedShort = avoid(shortHalf.filter((d) => !played.includes(d)));
  if (played.length && played.every((d) => d >= 20) && unplayedShort.length)
    return { distance: unplayedShort[0], reason: "Tillbaka till kort precision." };

  const nearGoal = avoid(
    open
      .filter((d) => starsAt(progress, d, lie) < 3)
      .sort((a, b) => {
        const gap = (d: number) => goalAt(progress, d, lie).points - (bestAt(progress, d, lie) ?? 0);
        return gap(a) - gap(b) || a - b;
      }),
  );
  if (nearGoal.length && starsAt(progress, nearGoal[0], lie) > 0)
    return { distance: nearGoal[0], reason: "Du är nära nästa stjärna här." };

  const unplayed = avoid(open.filter((d) => !played.includes(d)));
  if (unplayed.length)
    return { distance: unplayed[0], reason: "Bygg kontroll på nästa upplåsta station." };
  if (nearGoal.length) return { distance: nearGoal[0], reason: "Närmast nästa stjärna." };
  return { distance: avoid([...open])[0], reason: "Ett nytt försök på en upplåst station." };
}

/** Honest preview of the remaining guided stations; re-evaluated after every attempt. */
export function plannedStations(
  progress: ChipProgress,
  lie: ChipLie,
  remaining: number,
): number[] {
  const played = sessionRounds(progress).map((r) => r.distance);
  const plan: number[] = [];
  for (let i = 0; i < remaining; i++) {
    const next = recommendStation(progress, lie, [...played, ...plan]).distance;
    plan.push(next);
  }
  return plan;
}

const newRound = (
  session: Pick<ChipSession, "id" | "mode" | "lie">,
  id: string,
  distance: number,
  at: number,
): ChipRound => ({
  id,
  sessionId: session.id,
  mode: session.mode,
  distance,
  lie: session.lie,
  shots: [],
  at,
});

/** Pure state transitions: completion, unlocks and persistence cannot double-count taps. */
export function reduceChipProgress(state: ChipProgress, action: ChipAction): ChipProgress {
  const session = state.session;
  if (action.type === "setLie") {
    if (!CHIP_LIES.includes(action.lie) || session) return state;
    return state.lie === action.lie ? state : { ...state, lie: action.lie };
  }
  if (action.type === "startGuided" || action.type === "startStandalone") {
    if (session) return state;
    if (!CHIP_LIES.includes(action.lie) || !isUnlocked(state, action.distance, action.lie))
      return state;
    if (state.rounds.some((r) => r.id === action.roundId)) return state;
    const mode: ChipMode = action.type === "startGuided" ? "guided" : "standalone";
    const base = { id: action.id, mode, lie: action.lie };
    return {
      ...state,
      lie: action.lie,
      session: {
        ...base,
        phase: "play",
        startedAt: action.at,
        current: newRound(base, action.roundId, action.distance, action.at),
      },
    };
  }
  if (!session) return state;
  if (action.type === "exit") return { ...state, session: null };
  if (action.type === "map") {
    if (session.current?.shots.length) return state;
    return { ...state, session: { ...session, phase: "map", current: null } };
  }
  if (action.type === "next") {
    if (session.current?.shots.length && session.phase === "play") return state;
    if (!isUnlocked(state, action.distance, session.lie)) return state;
    if (state.rounds.some((r) => r.id === action.roundId)) return state;
    return {
      ...state,
      session: {
        ...session,
        phase: "play",
        current: newRound(session, action.roundId, action.distance, action.at),
      },
    };
  }
  if (action.type === "score") {
    if (
      session.phase !== "play" ||
      !session.current ||
      !isChipPoints(action.points) ||
      session.current.shots.length >= BALLS_PER_ROUND
    )
      return state;
    const current = { ...session.current, shots: [...session.current.shots, action.points] };
    const complete = current.shots.length === BALLS_PER_ROUND;
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
    isChipDistance(value.distance) &&
    (value.lie === "Fairway" || value.lie === "Ruff") &&
    typeof value.at === "number" &&
    Number.isFinite(value.at) &&
    Array.isArray(value.shots) &&
    (complete ? value.shots.length === BALLS_PER_ROUND : value.shots.length <= BALLS_PER_ROUND) &&
    value.shots.every(isChipPoints)
  );
}
/** Accepts v1 history (same three-ball shape with a known lie) and ignores the legacy 0–5 scale. */
export function parseChipProgress(raw: string | null): ChipProgress {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (!isRecord(data) || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.rounds))
      return emptyChipProgress();
    const ids = new Set<string>();
    const rounds = data.rounds.flatMap((entry): ChipRound[] => {
      if (!validRound(entry, true) || ids.has(entry.id)) return [];
      ids.add(entry.id);
      return [{ ...entry, mode: entry.mode === "standalone" ? "standalone" : "guided" }];
    });
    const lie: ChipLie = data.lie === "Ruff" ? "Ruff" : "Fairway";
    const progress: ChipProgress = { version: 2, lie, rounds, session: null };
    const session = data.session;
    if (
      data.version !== 2 ||
      !isRecord(session) ||
      typeof session.id !== "string" ||
      typeof session.startedAt !== "number" ||
      !Number.isFinite(session.startedAt) ||
      (session.lie !== "Fairway" && session.lie !== "Ruff") ||
      !["map", "play", "result", "summary"].includes(String(session.phase))
    )
      return progress;
    const mode: ChipMode = session.mode === "standalone" ? "standalone" : "guided";
    const current =
      validRound(session.current, false) &&
      session.current.sessionId === session.id &&
      session.current.lie === session.lie &&
      isUnlocked(progress, session.current.distance, session.lie)
        ? session.current
        : null;
    let phase = session.phase as ChipSession["phase"];
    if ((phase === "play" || phase === "result") && !current) phase = "map";
    if (current && (phase === "play" || phase === "result")) {
      if (current.shots.length === BALLS_PER_ROUND) {
        phase = "result";
        if (!ids.has(current.id)) rounds.push({ ...current, mode });
      } else {
        phase = "play";
        // An incomplete draft cannot simultaneously be a committed round.
        progress.rounds = rounds.filter((r) => r.id !== current.id);
      }
    }
    progress.session = {
      id: session.id,
      lie: session.lie,
      mode,
      startedAt: session.startedAt,
      phase,
      current: phase === "play" || phase === "result" ? current : null,
    };
    return progress;
  } catch {
    return emptyChipProgress();
  }
}
