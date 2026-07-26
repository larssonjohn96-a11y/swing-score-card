import { CATEGORIES } from "@/lib/categories";
import { loadSessions } from "@/lib/drill";
import { loadBunkerSessions } from "@/lib/bunker";
import { loadSpeedEntries } from "@/lib/speed";
import { loadLongDriveSessions, sessionBest } from "@/lib/longdrive";
import { TOUR } from "@/lib/benchmarks";

export type CategoryRating = {
  slug: string;
  title: string;
  /** 0–100 där 100 = tournivå. undefined = inga resultat än */
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
  const drill = loadSessions();
  const bunker = loadBunkerSessions();
  const speed = loadSpeedEntries();
  const longdrive = loadLongDriveSessions();

  // Approach: score 0–3.0, 3.0 = 100
  const drillAvg = lastAvg(drill.map((s) => s.score));
  const approach: CategoryRating = {
    slug: "approach",
    title: "Approach",
    hasTests: true,
    rating: drillAvg === undefined ? undefined : clamp((drillAvg / 3) * 100),
    detail:
      drillAvg === undefined
        ? "Kör 18 bollar för att få en nivå."
        : `Snitt ${drillAvg.toFixed(1)} av 3.0 i score`,
  };

  // Around the green: snittfot i bunker, tournivå ~9 fot, 25 fot = 0
  const bunkerAvg = lastAvg(bunker.map((s) => s.avgFeet));
  const atg: CategoryRating = {
    slug: "around-the-green",
    title: "Around the green",
    hasTests: true,
    rating:
      bunkerAvg === undefined
        ? undefined
        : clamp(((25 - bunkerAvg) / (25 - TOUR.bunkerFeet)) * 100),
    detail:
      bunkerAvg === undefined
        ? "Kör bunkertestet för att få en nivå."
        : `Snitt ${bunkerAvg.toFixed(1)} fot (tour ${TOUR.bunkerFeet} fot)`,
  };

  // Driving: ball speed mot tour, annars carry mot tour
  const ballAvg = lastAvg(speed.map((e) => e.ballSpeed));
  const ldLast = longdrive.length ? longdrive[longdrive.length - 1] : undefined;
  const carryBest = ldLast ? sessionBest(ldLast) : undefined;
  const carryTarget = ldLast?.unit === "yds" ? TOUR.carryYds : TOUR.carryM;
  let drivingRating: number | undefined;
  let drivingDetail = "Kör speed- eller long drive-testet för att få en nivå.";
  if (ballAvg !== undefined) {
    // 60 % av tourfart = 0, tourfart = 100
    drivingRating = clamp(((ballAvg - TOUR.ballSpeed * 0.6) / (TOUR.ballSpeed * 0.4)) * 100);
    drivingDetail = `Snitt ${ballAvg.toFixed(1)} mph ball speed (tour ${TOUR.ballSpeed})`;
  } else if (carryBest !== undefined) {
    drivingRating = clamp(((carryBest - carryTarget * 0.6) / (carryTarget * 0.4)) * 100);
    drivingDetail = `Längsta carry ${carryBest.toFixed(0)} ${ldLast?.unit} (tour ${carryTarget})`;
  }
  const driving: CategoryRating = {
    slug: "driving",
    title: "Driving",
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
