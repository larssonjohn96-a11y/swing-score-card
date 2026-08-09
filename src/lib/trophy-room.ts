import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadSpeedSessions } from "@/lib/speed";
import { loadShortGameSessions } from "@/lib/shortgame";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { loadLagPuttSessions } from "@/lib/lagputt";
import { loadCardProfile } from "@/lib/rating-card";
import { computeCategoryHandicaps } from "@/lib/sg-handicap";

/**
 * Trophy Room – ren härledning ur befintlig, riktig testhistorik. Rör
 * ALDRIG scoring/HCP-beräkning; läser bara redan sparad data. All status
 * (unlocked/collected) och alla "första gången uppnått"-datum räknas fram
 * från historiken varje gång sidan öppnas, så systemet fungerar retroaktivt
 * för spelare som redan har massor av tidigare tester.
 */

export const TEST_META = [
  { id: "offtee", title: "Off the Tee" },
  { id: "speed", title: "Speed" },
  { id: "approach", title: "Approach" },
  { id: "narspel", title: "Närspel" },
  { id: "bunker", title: "Bunker" },
  { id: "kortputt", title: "Kortputt" },
  { id: "lagputt", title: "Lag Putt" },
] as const;

export type TestId = (typeof TEST_META)[number]["id"];

type FlatSession = { testId: TestId; title: string; date: string; handicap: number };

function flatten(): FlatSession[] {
  const out: FlatSession[] = [];
  const push = (testId: TestId, title: string, rows: { date: string; handicap?: number }[]) => {
    for (const r of rows) {
      if (typeof r.handicap === "number")
        out.push({ testId, title, date: r.date, handicap: r.handicap });
    }
  };
  push("offtee", "Off the Tee", loadOffTeeSessions());
  push("speed", "Speed", loadSpeedSessions());
  push("approach", "Approach", loadPrecisionSessions());
  push("narspel", "Närspel", loadShortGameSessions());
  push("bunker", "Bunker", loadBunkerSessions());
  push("kortputt", "Kortputt", loadShortPuttSessions());
  push("lagputt", "Lag Putt", loadLagPuttSessions());
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* -------------------------------------------------------------------------
 * Personal Records
 * ---------------------------------------------------------------------- */

export type PersonalRecord = {
  testId: TestId;
  title: string;
  hcp?: number;
  date?: string;
};

export function computePersonalRecords(): PersonalRecord[] {
  const all = flatten();
  return TEST_META.map(({ id, title }) => {
    const rows = all.filter((s) => s.testId === id);
    if (!rows.length) return { testId: id, title };
    const best = [...rows].sort((a, b) => a.handicap - b.handicap)[0];
    return { testId: id, title, hcp: best.handicap, date: best.date };
  });
}

/* -------------------------------------------------------------------------
 * Collect-status – separat från själva uppnåendet (som alltid är permanent).
 * ---------------------------------------------------------------------- */

const COLLECTED_KEY = "sg4-trophy-collected-v1";

function loadCollected(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLECTED_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markCollected(id: string) {
  const set = loadCollected();
  set.add(id);
  window.localStorage.setItem(COLLECTED_KEY, JSON.stringify([...set]));
}

/** Datum som inte kan härledas ur historiken (t.ex. FULL PROFILE) – sparas
 *  som "första gången vi såg det uppfyllt", inte tillbakadaterat. */
const FIRST_SEEN_KEY_PREFIX = "sg4-trophy-first-seen:";

function firstSeenDate(id: string, achievedNow: boolean): string | undefined {
  if (typeof window === "undefined") return undefined;
  const key = FIRST_SEEN_KEY_PREFIX + id;
  const stored = window.localStorage.getItem(key);
  if (stored) return stored;
  if (achievedNow) {
    const now = new Date().toISOString();
    window.localStorage.setItem(key, now);
    return now;
  }
  return undefined;
}

export type ProgressItem = {
  id: string;
  title: string;
  description: string;
  status: "locked" | "unlocked" | "collected";
  progress: number; // 0–1
  progressLabel?: string;
  remainingLabel?: string;
  achievedDate?: string;
  achievedDetail?: string;
  /** för ALL-ROUND-typer: delstatus per kategori */
  breakdown?: { label: string; done: boolean; detail?: string }[];
};

function withCollectStatus(
  id: string,
  unlocked: boolean,
  collected: Set<string>,
): ProgressItem["status"] {
  if (!unlocked) return "locked";
  return collected.has(id) ? "collected" : "unlocked";
}

/* -------------------------------------------------------------------------
 * Milestones
 * ---------------------------------------------------------------------- */

export function computeMilestones(): ProgressItem[] {
  const all = flatten();
  const collected = loadCollected();
  const total = all.length;
  const items: ProgressItem[] = [];

  const testCountMilestone = (id: string, title: string, n: number) => {
    const unlocked = total >= n;
    const date = unlocked ? all[n - 1]?.date : undefined;
    items.push({
      id,
      title,
      description: `Genomför ${n === 1 ? "ditt första" : n} SG4-test${n === 1 ? "" : "er"}.`,
      status: withCollectStatus(id, unlocked, collected),
      progress: Math.min(1, total / n),
      progressLabel: `${Math.min(total, n)} / ${n}`,
      remainingLabel: unlocked ? undefined : `${n - total} test${n - total === 1 ? "" : "er"} kvar`,
      achievedDate: date,
      achievedDetail: unlocked ? `${n} SG4-test${n === 1 ? "" : "er"} genomförda.` : undefined,
    });
  };

  testCountMilestone("first-test", "First Test", 1);
  testCountMilestone("tests-5", "5 Tests", 5);
  testCountMilestone("tests-10", "10 Tests", 10);
  testCountMilestone("tests-25", "25 Tests", 25);
  testCountMilestone("tests-50", "50 Tests", 50);
  testCountMilestone("tests-100", "100 Tests", 100);

  // ALL 7: datumet är när den SISTA (7:e) unika testtypen först genomfördes.
  const firstDateByTest = new Map<TestId, string>();
  for (const s of all) {
    if (!firstDateByTest.has(s.testId)) firstDateByTest.set(s.testId, s.date);
  }
  const doneTestCount = firstDateByTest.size;
  const all7Unlocked = doneTestCount === TEST_META.length;
  const all7Date = all7Unlocked ? [...firstDateByTest.values()].sort().slice(-1)[0] : undefined;
  items.push({
    id: "all-7",
    title: "All 7",
    description: "Genomför alla 7 olika tester minst en gång.",
    status: withCollectStatus("all-7", all7Unlocked, collected),
    progress: doneTestCount / TEST_META.length,
    progressLabel: `${doneTestCount} / ${TEST_META.length}`,
    remainingLabel: all7Unlocked
      ? undefined
      : `${TEST_META.length - doneTestCount} test${
          TEST_META.length - doneTestCount === 1 ? "" : "er"
        } kvar`,
    achievedDate: all7Date,
    achievedDetail: all7Unlocked ? "Alla 7 SG4-tester genomförda minst en gång." : undefined,
    breakdown: TEST_META.map((t) => ({ label: t.title, done: firstDateByTest.has(t.id) })),
  });

  // FULL PROFILE: går inte att räkna fram retroaktivt (ingen historik på
  // profilfältet), så vi sparar "första gången vi såg det klart".
  const profile = loadCardProfile();
  const profileComplete = Boolean(
    profile.club && profile.country && profile.ageClass && profile.photo,
  );
  const profileDate = firstSeenDate("full-profile", profileComplete);
  const profileFieldsDone = [profile.club, profile.country, profile.ageClass, profile.photo].filter(
    Boolean,
  ).length;
  items.push({
    id: "full-profile",
    title: "Full Profile",
    description: "Skapa en komplett SG4-spelprofil.",
    status: withCollectStatus("full-profile", profileComplete, collected),
    progress: profileFieldsDone / 4,
    progressLabel: `${profileFieldsDone} / 4`,
    remainingLabel: profileComplete ? undefined : "Fyll i klubb, land, åldersklass och bild",
    achievedDate: profileDate,
    achievedDetail: profileComplete ? "Din SG4-spelprofil är komplett." : undefined,
  });

  return items;
}

/* -------------------------------------------------------------------------
 * Achievements
 * ---------------------------------------------------------------------- */

function breakThreshold(
  id: string,
  title: string,
  threshold: number,
  all: FlatSession[],
  collected: Set<string>,
): ProgressItem {
  const hit = all.find((s) => s.handicap <= threshold);
  const best = all.length ? [...all].sort((a, b) => a.handicap - b.handicap)[0] : undefined;
  const unlocked = Boolean(hit);
  return {
    id,
    title,
    description: `Nå HCP ${threshold} eller bättre i ett SG4-test.`,
    status: withCollectStatus(id, unlocked, collected),
    progress: best ? Math.min(1, Math.max(0, (30 - best.handicap) / (30 - threshold))) : 0,
    achievedDate: hit?.date,
    achievedDetail: hit ? `${hit.title} · HCP ${hit.handicap.toFixed(1)}` : undefined,
    remainingLabel:
      !unlocked && best
        ? `Bästa hittills: ${best.title} · HCP ${best.handicap.toFixed(1)}`
        : undefined,
  };
}

function hcpBetterAchievement(
  id: string,
  title: string,
  threshold: number,
  all: FlatSession[],
  collected: Set<string>,
): ProgressItem {
  let bestHit: { date: string; testTitle: string; delta: number } | undefined;
  let bestProgress = 0;
  for (const meta of TEST_META) {
    const rows = all.filter((s) => s.testId === meta.id);
    if (!rows.length) continue;
    const baseline = rows[0].handicap;
    for (const r of rows) {
      const delta = baseline - r.handicap;
      bestProgress = Math.max(bestProgress, delta / threshold);
      if (delta >= threshold && (!bestHit || r.date < bestHit.date)) {
        bestHit = { date: r.date, testTitle: meta.title, delta };
      }
    }
  }
  return {
    id,
    title,
    description: `Förbättra samma test med minst ${threshold} HCP från din baseline.`,
    status: withCollectStatus(id, Boolean(bestHit), collected),
    progress: Math.min(1, bestProgress),
    achievedDate: bestHit?.date,
    achievedDetail: bestHit
      ? `${bestHit.testTitle} · ↓ ${bestHit.delta.toFixed(1)} HCP`
      : undefined,
  };
}

const ALL_ROUND_CATEGORIES = ["driving", "approach", "around-the-green", "puttning"] as const;

function allRoundAchievement(
  id: string,
  title: string,
  threshold: number,
  collected: Set<string>,
): ProgressItem {
  const current = computeCategoryHandicaps();
  const byAllRoundSlug = new Map(current.map((c) => [c.slug, c]));
  const breakdown = ALL_ROUND_CATEGORIES.map((slug) => {
    const cat = byAllRoundSlug.get(slug);
    const done = cat?.handicap !== undefined && cat.handicap <= threshold;
    return {
      label: cat?.title ?? slug,
      done,
      detail: cat?.handicap !== undefined ? `HCP ${cat.handicap.toFixed(1)}` : "Inget test än",
    };
  });
  const doneCount = breakdown.filter((b) => b.done).length;
  const unlocked = doneCount === ALL_ROUND_CATEGORIES.length;
  const dateKey = `all-round-${threshold}`;
  const date = firstSeenDate(dateKey, unlocked);
  return {
    id,
    title,
    description: `Alla fyra huvudkategorier på HCP ${threshold} eller bättre.`,
    status: withCollectStatus(id, unlocked, collected),
    progress: doneCount / ALL_ROUND_CATEGORIES.length,
    progressLabel: `${doneCount} / ${ALL_ROUND_CATEGORIES.length} klara`,
    achievedDate: date,
    achievedDetail: unlocked ? "Alla fyra huvudkategorier klara samtidigt." : undefined,
    breakdown,
  };
}

export function computeAchievements(): ProgressItem[] {
  const all = flatten();
  const collected = loadCollected();

  return [
    breakThreshold("break-20", "Break 20", 20, all, collected),
    breakThreshold("break-10", "Break 10", 10, all, collected),
    breakThreshold("break-5", "Break 5", 5, all, collected),
    breakThreshold("scratch", "Scratch", 0, all, collected),
    breakThreshold("plus-player", "Plus Player", -0.1, all, collected),
    hcpBetterAchievement("hcp-better-5", "5 HCP Better", 5, all, collected),
    hcpBetterAchievement("hcp-better-10", "10 HCP Better", 10, all, collected),
    allRoundAchievement("all-round-20", "All-Round 20", 20, collected),
    allRoundAchievement("all-round-10", "All-Round 10", 10, collected),
    allRoundAchievement("all-round-5", "All-Round 5", 5, collected),
  ];
}

/* -------------------------------------------------------------------------
 * Summering
 * ---------------------------------------------------------------------- */

export function countUncollected(items: ProgressItem[]): number {
  return items.filter((i) => i.status === "unlocked").length;
}
