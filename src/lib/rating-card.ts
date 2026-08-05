/**
 * Rating Card – spelarkort i tv-spelsstil.
 *
 * Räknar fram en totalrating 0–99, kortnivå (Brons → Icon) och sex
 * delbetyg (SPD, DRV, APP, SGM, PUT, CON) utifrån befintlig testdata.
 * Profilfälten (hemmaklubb, land, åldersklass, bild) sparas lokalt.
 */
import {
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  ratingFromHandicap,
  type CategoryHandicap,
} from "@/lib/sg-handicap";
import { loadSpeedEntries, speedStats } from "@/lib/speed";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";
import { TOUR_LEVEL } from "@/lib/levels";

export type CardTier = {
  key: "bronze" | "silver" | "gold" | "elite" | "icon";
  label: string;
  /** kort beskrivning av nivån */
  range: string;
  blurb: string;
};

export const CARD_TIERS: CardTier[] = [
  {
    key: "bronze",
    label: "Brons",
    range: "HCP 18,0 – 54,0",
    blurb: "För dig som är ny på resan eller utvecklar ditt spel.",
  },
  {
    key: "silver",
    label: "Silver",
    range: "HCP 10,0 – 17,9",
    blurb: "För den stabila golfaren som tar nästa steg.",
  },
  {
    key: "gold",
    label: "Gold",
    range: "HCP 0,0 – 9,9",
    blurb: "För den låghandicappade spelaren som presterar på hög nivå.",
  },
  {
    key: "elite",
    label: "Elite",
    range: "HCP +1,0 – +2,9",
    blurb: "För spelare på mycket hög nivå med plus-handicap.",
  },
  {
    key: "icon",
    label: "Icon",
    range: "HCP +3,0 och uppåt",
    blurb: "För de allra bästa. Golf på högsta nivå.",
  },
];

export function tierForHandicap(hcp: number | undefined): CardTier {
  if (hcp === undefined) return CARD_TIERS[0];
  if (hcp <= -3) return CARD_TIERS[4];
  if (hcp <= -1) return CARD_TIERS[3];
  if (hcp < 10) return CARD_TIERS[2];
  if (hcp < 18) return CARD_TIERS[1];
  return CARD_TIERS[0];
}

export type CardStat = {
  key: "SPD" | "DRV" | "APP" | "SGM" | "PUT" | "CON";
  label: string;
  value?: number;
};

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));

function catRating(cats: CategoryHandicap[], slug: CategoryHandicap["slug"]) {
  const hcp = cats.find((c) => c.slug === slug)?.handicap;
  return hcp === undefined ? undefined : clamp(ratingFromHandicap(hcp));
}

/** Konsistens: hur jämna de senaste testerna varit. */
function consistencyRating(): number | undefined {
  const precision = loadPrecisionSessions();
  const values = precision
    .map((s) => s.consistency)
    .filter((v): v is number => typeof v === "number");
  if (!values.length) return undefined;
  return clamp(values.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, values.length));
}

/** Speed: bästa bollhastighet relativt PGA Tour-snittet. */
function speedRating(): number | undefined {
  const entries = loadSpeedEntries();
  if (!entries.length) return undefined;
  const { bestBall } = speedStats(entries);
  if (!bestBall) return undefined;
  return clamp(50 + (bestBall - TOUR_LEVEL.ballSpeed * 0.75) * 1.15);
}

export type RatingCardData = {
  rating: number;
  tier: CardTier;
  stats: CardStat[];
  handicap?: number;
  /** true om handicapet är manuellt satt (verifierat), annars uppskattat */
  verified: boolean;
  testCount: number;
  lastUpdated?: string;
};

export function computeRatingCard(realHandicap: number | null): RatingCardData {
  const cats = computeCategoryHandicaps();
  const estimated = computeEstimatedHandicap(cats);
  const handicap = realHandicap ?? estimated;

  const stats: CardStat[] = [
    { key: "SPD", label: "SPD", value: speedRating() },
    { key: "DRV", label: "DRV", value: catRating(cats, "driving") },
    { key: "APP", label: "APP", value: catRating(cats, "approach") },
    { key: "SGM", label: "SGM", value: catRating(cats, "around-the-green") },
    { key: "PUT", label: "PUT", value: catRating(cats, "puttning") },
    { key: "CON", label: "CON", value: consistencyRating() },
  ];

  const known = stats.map((s) => s.value).filter((v): v is number => v !== undefined);
  const fromStats = known.length ? known.reduce((a, b) => a + b, 0) / known.length : undefined;
  const fromHcp = handicap === undefined ? undefined : clamp(ratingFromHandicap(handicap));
  const rating =
    fromHcp !== undefined && fromStats !== undefined
      ? clamp(fromHcp * 0.6 + fromStats * 0.4)
      : (fromHcp ?? (fromStats !== undefined ? clamp(fromStats) : 40));

  const dates = [
    ...loadPrecisionSessions().map((s) => s.date),
    ...loadOffTeeSessions().map((s) => s.date),
    ...loadBunkerSessions().map((s) => s.date),
    ...loadShortPuttSessions().map((s) => s.date),
    ...loadSpeedEntries().map((s) => s.date),
  ].sort();

  return {
    rating,
    tier: tierForHandicap(handicap),
    stats,
    handicap,
    verified: realHandicap !== null,
    testCount: dates.length,
    lastUpdated: dates[dates.length - 1],
  };
}

/* -------------------------------------------------------------------------
 * Valfria profiluppgifter
 * ---------------------------------------------------------------------- */

export type CardProfile = {
  club?: string;
  country?: string;
  ageClass?: string;
  photo?: string;
};

const PROFILE_KEY = "golf-rating-card-profile-v1";

export function loadCardProfile(): CardProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as CardProfile) : {};
  } catch {
    return {};
  }
}

export function saveCardProfile(profile: CardProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
