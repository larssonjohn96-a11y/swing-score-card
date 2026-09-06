/**
 * Rating Card – spelarkort byggt från SG4-testprofilen.
 *
 * SG4 HCP och kortnivå kommer från samma stabiliserade kategoriindex som
 * spindeldiagrammet (senaste 20, bästa 8). Officiellt HCP visas endast som
 * referens och styr inte längre rating eller tier.
 */
import {
  computeEstimatedHandicap,
  ratingFromHandicap,
  type CategoryHandicap,
} from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { loadSpeedSessions } from "@/lib/speed";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";

export type CardTier = {
  key: "bronze" | "silver" | "gold" | "elite" | "icon";
  label: string;
  range: string;
  blurb: string;
};

export const CARD_TIERS: CardTier[] = [
  { key: "bronze", label: "Bronze", range: "SG4 HCP 18,0 – 54,0", blurb: "Profilen byggs upp genom dina SG4-tester." },
  { key: "silver", label: "Silver", range: "SG4 HCP 10,0 – 17,9", blurb: "En stabil testprofil på medelnivå." },
  { key: "gold", label: "Gold", range: "SG4 HCP 0,0 – 9,9", blurb: "En stark testprofil på låg handicapnivå." },
  { key: "elite", label: "Elite", range: "SG4 HCP +1,0 – +2,9", blurb: "Testprofil på mycket hög nivå." },
  { key: "icon", label: "Icon", range: "SG4 HCP +3,0 och bättre", blurb: "SG4:s högsta spelarnivå." },
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
  key: "speed" | "driving" | "approach" | "around-the-green" | "puttning";
  label: string;
  value?: number;
  handicap?: number;
  count: number;
  isBaseline?: boolean;
};

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));

function statFor(cats: CategoryHandicap[], slug: CardStat["key"], label: string): CardStat {
  const cat = cats.find((c) => c.slug === slug);
  return {
    key: slug,
    label,
    value: cat?.handicap === undefined ? undefined : clamp(ratingFromHandicap(cat.handicap)),
    handicap: cat?.handicap,
    count: cat?.count ?? 0,
    isBaseline: cat?.isBaseline,
  };
}

export type RatingCardData = {
  rating: number;
  tier: CardTier;
  stats: CardStat[];
  /** Primärt HCP på kortet: SG4 HCP från kategoriindexen. */
  handicap?: number;
  /** Officiellt/manuellt HCP – endast referens. */
  real: number | null;
  estimated?: number;
  verified: boolean;
  testCount: number;
  testedCategories: number;
  lastUpdated?: string;
  playerType?: string;
};

function derivePlayerType(stats: CardStat[]): string | undefined {
  const known = stats.filter((s): s is CardStat & { value: number } => s.value !== undefined && s.count > 0);
  if (known.length < 2) return undefined;
  const strongest = [...known].sort((a, b) => b.value - a.value)[0];
  const LABELS: Record<CardStat["key"], string> = {
    speed: "Power Player",
    driving: "Tee Specialist",
    approach: "Iron Player",
    "around-the-green": "Short Game Player",
    puttning: "Putting Specialist",
  };
  return LABELS[strongest.key];
}

export function computeRatingCard(realHandicap: number | null): RatingCardData {
  // Exakt samma stabiliserade kategori-HCP som används i spindel/profil.
  // Officiellt HCP kan fortfarande vara startankare tidigt i en kategori,
  // men får ingen separat vikt i kortets rating eller tier.
  const cats = computeStableCategoryHandicaps(undefined, realHandicap ?? undefined);
  const estimated = computeEstimatedHandicap(cats);

  const stats: CardStat[] = [
    statFor(cats, "driving", "Off the Tee"),
    statFor(cats, "approach", "Approach"),
    statFor(cats, "around-the-green", "Around Green"),
    statFor(cats, "puttning", "Putting"),
    statFor(cats, "speed", "Speed"),
  ];

  // Rating följer SG4 HCP. Speed är fortfarande en profilstat men påverkar
  // inte totalen, precis som i resten av SG4.
  const rating = estimated !== undefined ? clamp(ratingFromHandicap(estimated)) : 40;

  const dates = [
    ...loadPrecisionSessions().map((s) => s.date),
    ...loadOffTeeSessions().map((s) => s.date),
    ...loadBunkerSessions().map((s) => s.date),
    ...loadShortPuttSessions().map((s) => s.date),
    ...loadSpeedSessions().map((s) => s.date),
  ].sort();

  return {
    rating,
    tier: tierForHandicap(estimated),
    stats,
    handicap: estimated,
    real: realHandicap,
    estimated,
    verified: stats.some((s) => s.count > 0),
    testCount: dates.length,
    testedCategories: stats.filter((s) => s.count > 0).length,
    lastUpdated: dates[dates.length - 1],
    playerType: derivePlayerType(stats),
  };
}

export type CardProfile = {
  club?: string;
  country?: string;
  ageClass?: string;
  age?: number;
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
