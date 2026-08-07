import { CATEGORIES } from "@/lib/categories";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedSessions } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { loadPrecisionSessions } from "@/lib/precision-store";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { TOUR_LEVEL, type Level } from "@/lib/levels";

export type CategoryRating = {
  slug: string;
  title: string;
  /** 0–100 där 100 = PGA Tour-nivå. undefined = inga resultat än */
  rating?: number;
  detail: string;
  hasTests: boolean;
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** snitt av de senaste n värdena */
function lastAvg(values: number[], n = 3) {
  const slice = values.slice(-n);
  return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : undefined;
}

export function computeRatings(): CategoryRating[] {
  const level: Level = TOUR_LEVEL;
  const precision = loadPrecisionSessions();
  const bunker = loadBunkerSessions();
  const speed = loadSpeedSessions();
  const longdrive = loadLongDriveSessions();

  // Approach: Approach Score 0–100 (redan normaliserad)
  const approachAvg = lastAvg(
    precision.map((s) => s.score).filter((v): v is number => typeof v === "number"),
  );
  const approach: CategoryRating = {
    slug: "approach",
    title: "Approach",
    hasTests: true,
    rating: approachAvg === undefined ? undefined : clamp(approachAvg),
    detail:
      approachAvg === undefined
        ? "Kör Approach Test för att få en nivå."
        : `Snitt ${approachAvg.toFixed(0)} av 100`,
  };

  // Around the green: bunker HCP, lägre är bättre
  const bunkerAvg = lastAvg(bunker.map((s) => s.handicap));
  const atg: CategoryRating = {
    slug: "around-the-green",
    title: "Around the green",
    hasTests: true,
    rating: bunkerAvg === undefined ? undefined : clamp(50 - bunkerAvg),
    detail:
      bunkerAvg === undefined
        ? "Kör bunkertestet för att få en nivå."
        : `Bunker HCP ${bunkerAvg.toFixed(1)}`,
  };

  // Driving: Off the Tee Score i första hand, annars ball speed, annars carry
  const offtee = loadOffTeeSessions();
  const offteeAvg = lastAvg(offtee.map((s) => s.score));
  const ballAvg = lastAvg(speed.map((e) => e.avgBallSpeed));
  const ldLast = longdrive.length ? longdrive[longdrive.length - 1] : undefined;
  const carryBest = ldLast ? sessionBest(ldLast) : undefined;
  const carryTarget = ldLast?.unit === "yds" ? level.carryYds : level.carryM;
  let drivingRating: number | undefined;
  let drivingDetail = "Kör Off the Tee Test, speed- eller long drive-testet för att få en nivå.";
  if (offteeAvg !== undefined) {
    drivingRating = clamp(offteeAvg);
    drivingDetail = `Off the Tee Score snitt ${offteeAvg.toFixed(0)} av 100`;
  } else if (ballAvg !== undefined) {
    drivingRating = clamp((ballAvg / level.ballSpeed) * 100);
    drivingDetail = `Snitt ${ballAvg.toFixed(1)} mph ball speed (${level.label} ${level.ballSpeed})`;
  } else if (carryBest !== undefined) {
    drivingRating = clamp((carryBest / carryTarget) * 100);
    drivingDetail = `Längsta carry ${carryBest.toFixed(0)} ${ldLast?.unit} (${level.label} ${carryTarget})`;
  }
  const driving: CategoryRating = {
    slug: "driving",
    title: "Off the Tee",
    hasTests: true,
    rating: drivingRating,
    detail: drivingDetail,
  };

  const putting: CategoryRating = {
    slug: "puttning",
    title: "Puttning",
    hasTests: CATEGORIES.find((c) => c.slug === "puttning")!.tests.length > 0,
    rating: undefined,
    detail: "Inget puttningstest ännu.",
  };

  return [atg, putting, approach, driving];
}

/** Kategorin med lägst nivå bland dem som har resultat. */
export function weakestCategory(ratings: CategoryRating[]) {
  const scored = ratings.filter((r) => typeof r.rating === "number");
  if (!scored.length) return undefined;
  return scored.reduce((a, b) => (b.rating! < a.rating! ? b : a));
}
