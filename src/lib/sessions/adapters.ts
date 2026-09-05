/**
 * Adapters mellan appens befintliga lokala sessionsformat (legacy) och den
 * kanoniska TestSession-modellen.
 *
 * Alla lokala historiker är platta objekt: { id, <datumfält>, <slagfält>, …mätvärden }.
 * Adaptern är därför generisk och FÖRLUSTFRI:
 *   - id, datum och slag mappas till egna fält
 *   - score/test-HCP lyfts ut ur angivna fält
 *   - ALLA övriga fält hamnar oförändrade i `metrics`
 *   - id/datum som inte är UUID/ISO bevaras i metrics.legacyId / metrics.legacyDate
 *
 * Restore (fromLegacyCanonical) bygger tillbaka exakt samma objekt så att
 * befintliga läsare (category-index, historiksidor, highlights …) fortsätter
 * fungera utan att veta att sessionslagret finns.
 */
import { LEGACY_KEYS, trainingKey } from "./keys";
import { cloudIdFor, isUuid } from "./ids";
import type { LegacyRecord, SessionCategory, TestSession, TestType } from "./types";

export type SessionAdapter = {
  /** Stabilt test-id i molnet. */
  testId: string;
  label: string;
  category: SessionCategory;
  testType: TestType;
  storageKey: string;
  dateField: "date" | "createdAt";
  shotsField?: string;
  scoreField?: string;
  /** Legacyfält med RÅ test-HCP. Speed: testHandicap (med fallback till handicap). */
  handicapField?: string;
  testVersion: number;
  scoringVersion: number;
  /** Om den lokala historiken alltid hålls sorterad på datum. */
  sortByDate: boolean;
};

type Spec = Omit<SessionAdapter, "dateField" | "testVersion" | "scoringVersion" | "sortByDate"> &
  Partial<Pick<SessionAdapter, "dateField" | "testVersion" | "scoringVersion" | "sortByDate">>;

function adapter(spec: Spec): SessionAdapter {
  return {
    dateField: "date",
    testVersion: 1,
    scoringVersion: 1,
    sortByDate: false,
    ...spec,
  };
}

/** Generiska träningstester som sparas via src/lib/training/core.ts. */
export const TRAINING_CORE_TESTS: Array<{ testId: string; label: string; category: SessionCategory }> = [
  { testId: "pga-tour-18-puttar", label: "PGA Tour – 18 puttar", category: "puttning" },
  { testId: "green-reading", label: "Green Reading", category: "puttning" },
  { testId: "upp-och-in", label: "Up & Down Challenge", category: "around-the-green" },
  { testId: "wedge-stege", label: "Wedge Ladder", category: "approach" },
  { testId: "shot-shaping-9-window", label: "9 Window Drill", category: "approach" },
  { testId: "shot-shaping-konstant", label: "Constant Shot Shape", category: "approach" },
  { testId: "shot-shaping-vaxlande", label: "Alternating Shot Shape", category: "approach" },
  { testId: "driver-konsekvens", label: "Driver-konsekvens", category: "driving" },
];

export const SESSION_ADAPTERS: SessionAdapter[] = [
  // ─── HCP-grundande tester (driver profil/kategori-index) ───────────────
  adapter({ testId: "approach-precision", label: "Approach Test", category: "approach", testType: "hcp", storageKey: LEGACY_KEYS.precision, shotsField: "shots", scoreField: "score", handicapField: "handicap" }),
  adapter({ testId: "off-the-tee", label: "Off the Tee", category: "driving", testType: "hcp", storageKey: LEGACY_KEYS.offtee, shotsField: "shots", scoreField: "score", handicapField: "handicap" }),
  adapter({ testId: "short-game", label: "Närspel", category: "around-the-green", testType: "hcp", storageKey: LEGACY_KEYS.shortgame, shotsField: "shots", scoreField: "score", handicapField: "handicap", sortByDate: true }),
  adapter({ testId: "bunker", label: "Bunkerslag", category: "around-the-green", testType: "hcp", storageKey: LEGACY_KEYS.bunker, shotsField: "shots", scoreField: "score", handicapField: "handicap" }),
  adapter({ testId: "short-putt", label: "Kortputt", category: "puttning", testType: "hcp", storageKey: LEGACY_KEYS.shortputt, shotsField: "putts", scoreField: "score", handicapField: "handicap", sortByDate: true }),
  adapter({ testId: "lag-putt-hcp", label: "Lagputt (HCP)", category: "puttning", testType: "hcp", storageKey: LEGACY_KEYS.lagputtHcp, shotsField: "putts", scoreField: "pct", handicapField: "handicap", sortByDate: true }),
  adapter({ testId: "speed", label: "Speed Test", category: "speed", testType: "hcp", storageKey: LEGACY_KEYS.speed, shotsField: "shots", scoreField: "score", handicapField: "testHandicap", sortByDate: true }),

  // ─── Träningstester med egna moduler ───────────────────────────────────
  adapter({ testId: "eight-ball", label: "8-bollsövningen", category: "around-the-green", testType: "training", storageKey: LEGACY_KEYS.eightBall, shotsField: "scores", scoreField: "score" }),
  adapter({ testId: "lag-putt-18", label: "Lagputt 18", category: "puttning", testType: "training", storageKey: LEGACY_KEYS.lagputt18, shotsField: "scores", scoreField: "total" }),
  adapter({ testId: "fifty-putt", label: "25 puttar", category: "puttning", testType: "training", storageKey: LEGACY_KEYS.fiftyPutt, dateField: "createdAt", shotsField: "entries", scoreField: "total" }),
  adapter({ testId: "tutor", label: "Tutor-test", category: "puttning", testType: "training", storageKey: LEGACY_KEYS.tutor, shotsField: "results", scoreField: "score" }),
  adapter({ testId: "approach-pei", label: "Approach PEI", category: "approach", testType: "training", storageKey: LEGACY_KEYS.approachPei, shotsField: "shots", scoreField: "pei" }),
  adapter({ testId: "pei-wedge", label: "Wedge PEI", category: "approach", testType: "training", storageKey: LEGACY_KEYS.peiWedge, scoreField: "pei" }),
  adapter({ testId: "pei-iron", label: "Iron PEI", category: "approach", testType: "training", storageKey: LEGACY_KEYS.peiIron, scoreField: "pei" }),
  ...TRAINING_CORE_TESTS.map((t) =>
    adapter({ testId: t.testId, label: t.label, category: t.category, testType: "training", storageKey: trainingKey(t.testId), shotsField: "shots", scoreField: "total" }),
  ),

  // ─── Äldre tester (routes/läsare finns kvar, ej i huvudnavigeringen) ────
  adapter({ testId: "tornado", label: "Tornado Drill", category: "puttning", testType: "training", storageKey: LEGACY_KEYS.tornado, shotsField: "putts", scoreField: "points" }),
  adapter({ testId: "pitch", label: "Pitch", category: "around-the-green", testType: "training", storageKey: LEGACY_KEYS.pitch, shotsField: "shots", scoreField: "pct" }),
  adapter({ testId: "chip", label: "Chip", category: "around-the-green", testType: "training", storageKey: LEGACY_KEYS.chip, shotsField: "shots", scoreField: "avgFeet" }),
  adapter({ testId: "combine", label: "Combine", category: "approach", testType: "training", storageKey: LEGACY_KEYS.combine, shotsField: "shots", scoreField: "score" }),
  adapter({ testId: "fairway", label: "Fairway Challenge", category: "driving", testType: "training", storageKey: LEGACY_KEYS.fairway, shotsField: "drives", scoreField: "points" }),
  adapter({ testId: "long-drive", label: "Long Drive", category: "driving", testType: "training", storageKey: LEGACY_KEYS.longdrive, shotsField: "carries" }),
  adapter({ testId: "tee-shot", label: "Tee Shot", category: "driving", testType: "training", storageKey: LEGACY_KEYS.teeshot, shotsField: "shots", scoreField: "points" }),
];

const BY_TEST_ID = new Map(SESSION_ADAPTERS.map((a) => [a.testId, a]));
const BY_STORAGE_KEY = new Map(SESSION_ADAPTERS.map((a) => [a.storageKey, a]));

export function adapterForTest(testId: string): SessionAdapter | undefined {
  return BY_TEST_ID.get(testId);
}

export function adapterForStorageKey(storageKey: string): SessionAdapter | undefined {
  return BY_STORAGE_KEY.get(storageKey);
}

/** Alla nycklar som sessionslagret känner till (för inventering/migrering). */
export function knownStorageKeys(): string[] {
  return SESSION_ADAPTERS.map((a) => a.storageKey);
}

const RESERVED = new Set(["legacyId", "legacyDate"]);

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** ISO-normalisering. Returnerar null om datumet inte går att tolka. */
export function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function isLegacyRecord(value: unknown): value is LegacyRecord {
  return !!value && typeof value === "object" && !Array.isArray(value) && typeof (value as { id?: unknown }).id === "string";
}

/** Legacy-post → kanonisk session. Returnerar null om posten inte är mappbar. */
export function toCanonical(adapter: SessionAdapter, record: LegacyRecord): TestSession | null {
  const rawDate = record[adapter.dateField];
  const playedAt = toIso(rawDate);
  if (!playedAt) return null;

  const metrics: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "id" || key === adapter.dateField || key === adapter.shotsField) continue;
    if (key === adapter.scoreField && asNumber(value) !== null) continue;
    if (key === adapter.handicapField && asNumber(value) !== null) continue;
    if (value === undefined) continue;
    metrics[key] = value;
  }

  const id = cloudIdFor(adapter.testId, record.id);
  if (id !== record.id) metrics.legacyId = record.id;
  if (rawDate !== playedAt) metrics.legacyDate = rawDate;

  let testHandicap: number | null = null;
  if (adapter.handicapField) {
    testHandicap = asNumber(record[adapter.handicapField]);
    // Speed: äldre sessioner saknar testHandicap – det sparade handicap-fältet
    // är då det råa värdet (se src/lib/speed.ts).
    if (testHandicap === null && adapter.testId === "speed") testHandicap = asNumber(record.handicap);
  }

  return {
    id,
    testId: adapter.testId,
    category: adapter.category,
    testType: adapter.testType,
    playedAt,
    score: adapter.scoreField ? asNumber(record[adapter.scoreField]) : null,
    testHandicap,
    metrics,
    shots: adapter.shotsField ? (record[adapter.shotsField] ?? null) : null,
    testVersion: adapter.testVersion,
    scoringVersion: adapter.scoringVersion,
  };
}

/** Kanonisk session → exakt det legacy-objekt som appens läsare förväntar sig. */
export function fromCanonical(adapter: SessionAdapter, session: TestSession): LegacyRecord {
  const metrics = session.metrics ?? {};
  const record: Record<string, unknown> = {
    id: typeof metrics.legacyId === "string" ? metrics.legacyId : session.id,
  };
  record[adapter.dateField] = typeof metrics.legacyDate === "string" ? metrics.legacyDate : session.playedAt;
  if (adapter.shotsField && session.shots !== null && session.shots !== undefined) {
    record[adapter.shotsField] = session.shots;
  }
  for (const [key, value] of Object.entries(metrics)) {
    if (RESERVED.has(key)) continue;
    record[key] = value;
  }
  if (adapter.scoreField && session.score !== null && !(adapter.scoreField in record)) {
    record[adapter.scoreField] = session.score;
  }
  if (adapter.handicapField && session.testHandicap !== null) {
    record[adapter.handicapField] = session.testHandicap;
    if (adapter.testId === "speed" && !("handicap" in record)) record.handicap = session.testHandicap;
  }
  return record as LegacyRecord;
}

/** Det lokala id som en molnsession motsvarar i legacy-historiken. */
export function legacyIdOf(session: TestSession): string {
  const legacyId = session.metrics?.legacyId;
  return typeof legacyId === "string" ? legacyId : session.id;
}

export { isUuid };
