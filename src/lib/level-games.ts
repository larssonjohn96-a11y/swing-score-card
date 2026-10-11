/**
 * SG4 Level Challenges – fristående SPEL (inte HCP-tester).
 * Reglerna/trösklarna är PRELIMINÄRA SG4-speldesign, inga vetenskapliga HCP-benchmarks.
 * Dessa omgångar skrivs aldrig till HCP-historik, sessionslager eller shot bank
 * (activityType "game", hcpEligible false).
 */

export type LevelGameId = "kortputt" | "langputt" | "chipping" | "bunker" | "inspel";
export type LevelNumber = 1 | 2 | 3 | 4 | 5;
export const LEVELS: readonly LevelNumber[] = [1, 2, 3, 4, 5];

/** Outcome index: 0 = bäst. */
export type Condition =
  | { kind: "within"; zone: number; min: number }
  | { kind: "maxWorse"; zone: number; max: number }
  | { kind: "sumMax"; max: number };

export type Target = { distance: number; lie?: "normal" | "uppför" | "nedför" };

export type LevelDef = { targets: number[]; conditions: Condition[]; summary: string };

export type LevelGameDef = {
  id: LevelGameId;
  title: string;
  section: "Puttning" | "Närspel" | "Inspel";
  description: string;
  image: string;
  unit: string; // "putt" | "hål" | "boll" | "slag"
  outcomes: readonly string[];
  /** Antal outcomes (från index 0) som räknas som "bra" i poängen. */
  goodZones: number;
  scoreLabel: string;
  /** "low" = lägre poäng är bättre (antal puttar). */
  better: "high" | "low";
  placementTargets: number[];
  placementConditions?: Condition[][];
  levels: Record<LevelNumber, LevelDef>;
  stationSize?: number;
};

const rep = (ds: number[], n: number) => ds.flatMap(d => Array(n).fill(d) as number[]);

export const LEVEL_GAMES: Record<LevelGameId, LevelGameDef> = {
  kortputt: {
    id: "kortputt", title: "Kortputtning", section: "Puttning", image: "/Putting_1.png",
    description: "9 puttar 1–5 m. Sänkt eller miss.", unit: "putt",
    outcomes: ["Sänkt", "Miss"], goodZones: 1, scoreLabel: "sänkta", better: "high",
    placementTargets: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
    placementConditions: [3, 4, 5, 6, 8].map(min => [{ kind: "within", zone: 0, min }]),
    levels: {
      1: { targets: [1, 1, 1.5, 1.5, 2, 2, 2, 2.5, 2.5], conditions: [{ kind: "within", zone: 0, min: 6 }], summary: "Sänk 6 av 9 (1–2,5 m)" },
      2: { targets: [1.5, 1.5, 2, 2, 2.5, 2.5, 3, 3, 3], conditions: [{ kind: "within", zone: 0, min: 6 }], summary: "Sänk 6 av 9 (1,5–3 m)" },
      3: { targets: [2, 2, 2.5, 2.5, 3, 3, 3.5, 3.5, 4], conditions: [{ kind: "within", zone: 0, min: 6 }], summary: "Sänk 6 av 9 (2–4 m)" },
      4: { targets: [2.5, 3, 3, 3.5, 3.5, 4, 4, 4.5, 5], conditions: [{ kind: "within", zone: 0, min: 6 }], summary: "Sänk 6 av 9 (2,5–5 m)" },
      5: { targets: [3, 3.5, 3.5, 4, 4, 4.5, 4.5, 5, 5], conditions: [{ kind: "within", zone: 0, min: 6 }], summary: "Sänk 6 av 9 (3–5 m)" },
    },
  },
  langputt: {
    id: "langputt", title: "Långputtning", section: "Puttning", image: "/putting-card.jpg",
    description: "6 hål från 6 m och längre. Undvik treputt.", unit: "hål",
    outcomes: ["1 putt", "2 puttar", "3+ puttar"], goodZones: 2, scoreLabel: "hål utan treputt", better: "high",
    placementTargets: [6, 8, 10, 12, 14, 16],
    levels: {
      1: { targets: [6, 6, 7, 7, 8, 8], conditions: [{ kind: "maxWorse", zone: 2, max: 2 }], summary: "Högst 2 treputtar (6–8 m)" },
      2: { targets: [7, 8, 8, 9, 9, 10], conditions: [{ kind: "maxWorse", zone: 2, max: 1 }], summary: "Högst 1 treputt (7–10 m)" },
      3: { targets: [8, 9, 10, 10, 11, 12], conditions: [{ kind: "maxWorse", zone: 2, max: 1 }], summary: "Högst 1 treputt (8–12 m)" },
      4: { targets: [10, 11, 12, 12, 13, 14], conditions: [{ kind: "maxWorse", zone: 2, max: 0 }], summary: "Ingen treputt (10–14 m)" },
      5: { targets: [12, 13, 14, 15, 16, 18], conditions: [{ kind: "maxWorse", zone: 2, max: 0 }, { kind: "within", zone: 0, min: 1 }], summary: "Ingen treputt och minst 1 hålad direkt (12–18 m)" },
    },
  },
  chipping: {
    id: "chipping", title: "Chipping", section: "Närspel", image: "/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png",
    description: "3 hål × 3 bollar från gräs: 8, 12 och 18 m.", unit: "boll", stationSize: 3,
    outcomes: ["≤1,5 m", "≤3 m", "≤5 m", "På green >5 m", "Missad green"], goodZones: 2, scoreLabel: "inom 3 m", better: "high",
    placementTargets: rep([8, 12, 18], 3),
    levels: {
      1: { targets: rep([8, 12, 18], 3), conditions: [{ kind: "within", zone: 2, min: 5 }], summary: "5 av 9 inom 5 m" },
      2: { targets: rep([8, 12, 18], 3), conditions: [{ kind: "within", zone: 2, min: 7 }], summary: "7 av 9 inom 5 m" },
      3: { targets: rep([8, 12, 18], 3), conditions: [{ kind: "within", zone: 2, min: 8 }, { kind: "within", zone: 1, min: 4 }], summary: "8 inom 5 m och 4 inom 3 m" },
      4: { targets: rep([8, 12, 18], 3), conditions: [{ kind: "within", zone: 2, min: 8 }, { kind: "within", zone: 1, min: 6 }], summary: "8 inom 5 m och 6 inom 3 m" },
      5: { targets: rep([8, 12, 18], 3), conditions: [{ kind: "within", zone: 2, min: 9 }, { kind: "within", zone: 1, min: 7 }, { kind: "within", zone: 0, min: 3 }], summary: "Alla inom 5 m, 7 inom 3 m, 3 inom 1,5 m" },
    },
  },
  bunker: {
    id: "bunker", title: "Bunker", section: "Närspel", image: "/bunker-card.jpg",
    description: "6 slag från greenbunker, ca 12 m.", unit: "slag",
    outcomes: ["Hålad", "Inom 1,5 m", "Inom 3 m", "Inom 5 m", "Green >5 m", "Ur, ej green", "Ej ur bunkern"], goodZones: 4, scoreLabel: "inom 5 m", better: "high",
    placementTargets: rep([12], 6),
    levels: {
      1: { targets: rep([12], 6), conditions: [{ kind: "within", zone: 5, min: 5 }], summary: "Upp ur bunkern 5 av 6" },
      2: { targets: rep([12], 6), conditions: [{ kind: "within", zone: 5, min: 6 }, { kind: "within", zone: 4, min: 4 }], summary: "Alla upp, 4 av 6 på green" },
      3: { targets: rep([12], 6), conditions: [{ kind: "within", zone: 5, min: 6 }, { kind: "within", zone: 4, min: 5 }, { kind: "within", zone: 3, min: 4 }], summary: "4 av 6 inom 5 m" },
      4: { targets: rep([12], 6), conditions: [{ kind: "within", zone: 4, min: 6 }, { kind: "within", zone: 3, min: 5 }, { kind: "within", zone: 2, min: 4 }], summary: "Alla på green, 4 av 6 inom 3 m" },
      5: { targets: rep([12], 6), conditions: [{ kind: "within", zone: 4, min: 6 }, { kind: "within", zone: 2, min: 5 }, { kind: "within", zone: 1, min: 3 }], summary: "5 inom 3 m och 3 inom 1,5 m" },
    },
  },
  inspel: {
    id: "inspel", title: "Inspel", section: "Inspel", image: "/Approach_shot.png",
    description: "3 avstånd × 3 bollar: 60, 90 och 120 m.", unit: "boll", stationSize: 3,
    outcomes: ["≤3 m", "3–6 m", "6–10 m", ">10 m"], goodZones: 2, scoreLabel: "inom 6 m", better: "high",
    placementTargets: rep([60, 90, 120], 3),
    levels: {
      1: { targets: rep([60, 90, 120], 3), conditions: [{ kind: "within", zone: 2, min: 3 }], summary: "3 av 9 inom 10 m" },
      2: { targets: rep([60, 90, 120], 3), conditions: [{ kind: "within", zone: 2, min: 5 }], summary: "5 av 9 inom 10 m" },
      3: { targets: rep([60, 90, 120], 3), conditions: [{ kind: "within", zone: 2, min: 7 }, { kind: "within", zone: 1, min: 2 }], summary: "7 inom 10 m och 2 inom 6 m" },
      4: { targets: rep([60, 90, 120], 3), conditions: [{ kind: "within", zone: 2, min: 7 }, { kind: "within", zone: 1, min: 4 }], summary: "7 inom 10 m och 4 inom 6 m" },
      5: { targets: rep([60, 90, 120], 3), conditions: [{ kind: "within", zone: 2, min: 8 }, { kind: "within", zone: 1, min: 6 }, { kind: "within", zone: 0, min: 2 }], summary: "6 inom 6 m och 2 inom 3 m" },
    },
  },
};

export const LEVEL_GAME_ORDER: LevelGameId[] = ["kortputt", "langputt", "chipping", "bunker", "inspel"];
export const isLevelGameId = (v: string): v is LevelGameId => (LEVEL_GAME_ORDER as string[]).includes(v);

export const BUNKER_VARIED_LIES: Target["lie"][] = ["normal", "normal", "uppför", "uppför", "nedför", "nedför"];

export type RoundMode = { kind: "placement" } | { kind: "level"; level: LevelNumber; variant?: "varied-lies" };

export function targetsFor(game: LevelGameDef, mode: RoundMode): Target[] {
  if (mode.kind === "placement") return game.placementTargets.map(distance => ({ distance }));
  const t = game.levels[mode.level].targets;
  if (mode.variant === "varied-lies") return t.map((distance, i) => ({ distance, lie: BUNKER_VARIED_LIES[i] }));
  return t.map(distance => ({ distance }));
}

export function checkCondition(c: Condition, outcomes: number[]): boolean {
  if (c.kind === "within") return outcomes.filter(o => o <= c.zone).length >= c.min;
  if (c.kind === "maxWorse") return outcomes.filter(o => o >= c.zone).length <= c.max;
  return outcomes.reduce((s, o) => s + o + 1, 0) <= c.max;
}

export const passesConditions = (cs: Condition[], outcomes: number[]) => cs.every(c => checkCondition(c, outcomes));

/** Högsta nivå där alla nivåer 1..k uppfylls (nested). 0 = ingen. */
export function earnedLevel(game: LevelGameDef, outcomes: number[], placement: boolean): 0 | LevelNumber {
  let earned: 0 | LevelNumber = 0;
  for (const l of LEVELS) {
    const cs = placement && game.placementConditions ? game.placementConditions[l - 1] : game.levels[l].conditions;
    if (!passesConditions(cs, outcomes)) break;
    earned = l;
  }
  return earned;
}

export function roundScore(game: LevelGameDef, outcomes: number[]): number {
  if (game.better === "low") return outcomes.reduce((s, o) => s + o + 1, 0);
  return outcomes.filter(o => o < game.goodZones).length;
}

export type Attempt = { target: number; outcome: number; outcomeLabel: string; lie?: Target["lie"] };

export type LevelGameRound = {
  id: string;
  gameId: LevelGameId;
  activityType: "game";
  hcpEligible: false;
  rulesVersion: 1;
  placement: boolean;
  level: LevelNumber | null;
  variant?: "varied-lies";
  playedAt: string;
  attempts: Attempt[];
  attemptCount: number;
  passed: boolean;
  earnedLevel: number;
  recommendedLevel: LevelNumber;
  score: number;
  personalBest: boolean;
};

export type GameProgress = {
  rounds: LevelGameRound[];
  cleared: LevelNumber[];
  placementLevel: LevelNumber | null;
  recommended: LevelNumber | null;
  pb: number | null;
  /** Nivån som personbästa avser. Null betyder placeringsomgång. */
  pbLevel: LevelNumber | null;
};

const STORAGE_KEY = "sg4.level-games.v1";
const DRAFT_KEY = "sg4.level-games.draft.v1";
const hasStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function loadRounds(): LevelGameRound[] {
  if (!hasStorage()) return [];
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

export function progressFrom(game: LevelGameDef, all: LevelGameRound[]): GameProgress {
  const rounds = all.filter(r => r.gameId === game.id);
  const cleared = LEVELS.filter(l => rounds.some(r => !r.placement && r.level === l && r.passed));
  const placementRound = rounds.find(r => r.placement);
  const placementLevel = placementRound ? placementRound.recommendedLevel : null;
  const highestCleared = cleared.length ? Math.max(...cleared) : 0;
  const recommended = placementRound || highestCleared
    ? (Math.min(5, Math.max(placementLevel ?? 1, highestCleared + 1)) as LevelNumber)
    : null;
  const lastLevelRound = [...rounds].reverse().find(r => !r.placement);
  const pbLevel = lastLevelRound?.level ?? null;
  const comparable = lastLevelRound
    ? rounds.filter(r => !r.placement && r.level === pbLevel && r.variant === lastLevelRound.variant)
    : rounds.filter(r => r.placement);
  const pb = scoreBest(game, comparable.map(r => r.score));
  return { rounds, cleared, placementLevel, recommended, pb, pbLevel };
}

/** PB kan bara jämföras mellan samma nivå och samma lie-variant. */
function scoreBest(game: LevelGameDef, scores: number[]): number | null {
  if (!scores.length) return null;
  return game.better === "low" ? Math.min(...scores) : Math.max(...scores);
}

export function bestComparableScore(game: LevelGameDef, rounds: LevelGameRound[], mode: RoundMode): number | null {
  const sameMode = rounds.filter(r => mode.kind === "placement"
    ? r.placement
    : !r.placement && r.level === mode.level && r.variant === mode.variant);
  return scoreBest(game, sameMode.map(r => r.score));
}

export function getProgress(id: LevelGameId): GameProgress {
  return progressFrom(LEVEL_GAMES[id], loadRounds());
}

/** Bygger rundposten (ren funktion – testbar). */
export function buildRound(game: LevelGameDef, mode: RoundMode, attempts: Attempt[], history: LevelGameRound[], id: string, playedAt: string): LevelGameRound {
  const outcomes = attempts.map(a => a.outcome);
  const placement = mode.kind === "placement";
  const earned = placement ? earnedLevel(game, outcomes, true) : 0;
  const passed = mode.kind === "level" && passesConditions(game.levels[mode.level].conditions, outcomes);
  const before = progressFrom(game, history);
  const score = roundScore(game, outcomes);
  const comparableBest = bestComparableScore(game, history, mode);
  const personalBest = comparableBest === null || (game.better === "low" ? score < comparableBest : score > comparableBest);
  let recommended: LevelNumber;
  if (placement) recommended = Math.min(5, earned === 5 ? 5 : earned + 1) as LevelNumber;
  else {
    const cleared = new Set(before.cleared);
    if (passed) cleared.add(mode.level);
    const hi = cleared.size ? Math.max(...cleared) : 0;
    recommended = Math.min(5, Math.max(before.placementLevel ?? 1, hi + 1)) as LevelNumber;
  }
  return {
    id, gameId: game.id, activityType: "game", hcpEligible: false, rulesVersion: 1, placement,
    level: mode.kind === "level" ? mode.level : null,
    ...(mode.kind === "level" && mode.variant ? { variant: mode.variant } : {}),
    playedAt, attempts, attemptCount: attempts.length, passed, earnedLevel: earned,
    recommendedLevel: recommended, score, personalBest,
  };
}

/** Sparar exakt en gång per round-id. */
export function saveRound(round: LevelGameRound): boolean {
  if (!hasStorage()) return false;
  const all = loadRounds();
  if (all.some(r => r.id === round.id)) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, round]));
  return true;
}

export type Draft = { id: string; gameId: LevelGameId; mode: RoundMode; attempts: Attempt[] };
export function loadDraft(gameId: LevelGameId): Draft | null {
  if (!hasStorage()) return null;
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Record<string, Draft> | null;
    return d?.[gameId] ?? null;
  } catch { return null; }
}
export function saveDraft(gameId: LevelGameId, draft: Draft | null) {
  if (!hasStorage()) return;
  let d: Record<string, Draft> = {};
  try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") ?? {}; } catch { /* ignore */ }
  if (draft) d[gameId] = draft; else delete d[gameId];
  localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
}

export const formatDistance = (d: number) => `${String(d).replace(".", ",")} m`;
export function distanceRange(ts: number[]) {
  const lo = Math.min(...ts), hi = Math.max(...ts);
  return lo === hi ? formatDistance(lo) : `${String(lo).replace(".", ",")}–${formatDistance(hi)}`;
}
