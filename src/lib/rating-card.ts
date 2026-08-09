/**
 * Rating Card – spelarkort i tv-spelsstil.
 *
 * Räknar fram en totalrating 0–99, kortnivå (Brons → Icon) och fem
 * delbetyg (Speed, Driving, Approach, Around the Green, Putting)
 * utifrån befintlig testdata. Profilfälten (hemmaklubb, land,
 * åldersklass, bild) sparas lokalt.
 */
import {
  computeCategoryHandicaps,
  computeEstimatedHandicap,
  ratingFromHandicap,
  type CategoryHandicap,
} from "@/lib/sg-handicap";
import { loadSpeedSessions } from "@/lib/speed";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadShortPuttSessions } from "@/lib/shortputt";

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
  key: "speed" | "driving" | "approach" | "around-the-green" | "puttning";
  label: string;
  value?: number;
};

const clamp = (n: number) => Math.max(1, Math.min(99, Math.round(n)));

function catRating(cats: CategoryHandicap[], slug: CategoryHandicap["slug"]) {
  const hcp = cats.find((c) => c.slug === slug)?.handicap;
  return hcp === undefined ? undefined : clamp(ratingFromHandicap(hcp));
}

/** Speed: senaste Speed Test-resultatet, omvandlat till samma 0–100-skala som övriga kort. */
function speedRating(): number | undefined {
  const sessions = loadSpeedSessions();
  if (!sessions.length) return undefined;
  const last = sessions[sessions.length - 1];
  return clamp(ratingFromHandicap(last.handicap));
}

export type RatingCardData = {
  rating: number;
  tier: CardTier;
  stats: CardStat[];
  handicap?: number;
  /** verkligt (manuellt satt) handicap, om det finns */
  real: number | null;
  /** uppskattat handicap ur testresultaten */
  estimated?: number;
  /** true om handicapet är manuellt satt (verifierat), annars uppskattat */
  verified: boolean;
  testCount: number;
  lastUpdated?: string;
  /** spelartyp, härledd ur vilken kategori som sticker ut mest relativt övriga */
  playerType?: string;
};

/** Härleder en kort "spelartyp" ur vilken av de fem kategorierna som är starkast
 *  relativt spelarens egna snitt – inte bara högst i absoluta tal. */
function derivePlayerType(stats: CardStat[]): string | undefined {
  const known = stats.filter((s): s is CardStat & { value: number } => s.value !== undefined);
  if (known.length < 2) return undefined;
  const strongest = [...known].sort((a, b) => b.value - a.value)[0];
  const LABELS: Record<CardStat["key"], string> = {
    speed: "Ball Striker",
    driving: "Ball Striker",
    approach: "Iron Player",
    "around-the-green": "Short Game Wizard",
    puttning: "Putting Ace",
  };
  return LABELS[strongest.key];
}

export function computeRatingCard(realHandicap: number | null): RatingCardData {
  const cats = computeCategoryHandicaps();
  const estimated = computeEstimatedHandicap(cats);
  const handicap = realHandicap ?? estimated;

  const stats: CardStat[] = [
    { key: "speed", label: "Speed", value: speedRating() },
    { key: "driving", label: "Driving", value: catRating(cats, "driving") },
    { key: "approach", label: "Approach", value: catRating(cats, "approach") },
    {
      key: "around-the-green",
      label: "Around the Green",
      value: catRating(cats, "around-the-green"),
    },
    { key: "puttning", label: "Putting", value: catRating(cats, "puttning") },
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
    ...loadSpeedSessions().map((s) => s.date),
  ].sort();

  return {
    rating,
    tier: tierForHandicap(handicap),
    stats,
    handicap,
    real: realHandicap,
    estimated,
    verified: realHandicap !== null,
    testCount: dates.length,
    lastUpdated: dates[dates.length - 1],
    playerType: derivePlayerType(stats),
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
