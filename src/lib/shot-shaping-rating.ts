import { loadSessions, type TrainingSession } from "@/lib/training/core";

export const SHOT_SHAPING_RATING_WINDOW = 5;

export const SHOT_SHAPING_TESTS = [
  { testId: "shot-shaping-9-window", maxScore: 9 },
  { testId: "shot-shaping-konstant", maxScore: 10 },
  { testId: "shot-shaping-vaxlande", maxScore: 10 },
] as const;

export type ShotShapingRatingResult = {
  rating: number;
  count: number;
};

type RatingSource = {
  sessions: TrainingSession[];
  maxScore: number;
};

export function computeShotShapingRating(
  sources: RatingSource[],
  window = SHOT_SHAPING_RATING_WINDOW,
): ShotShapingRatingResult | null {
  const normalized = sources
    .flatMap(({ sessions, maxScore }) =>
      sessions.map((session) => ({
        date: session.date,
        score: maxScore > 0 ? (session.total / maxScore) * 10 : 0,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!normalized.length) return null;

  const recent = normalized.slice(-window);
  const rating = recent.reduce((sum, session) => sum + session.score, 0) / recent.length;

  return {
    rating: Math.round(rating * 10) / 10,
    count: recent.length,
  };
}

export function loadShotShapingRating(): ShotShapingRatingResult | null {
  return computeShotShapingRating(
    SHOT_SHAPING_TESTS.map(({ testId, maxScore }) => ({
      sessions: loadSessions(testId),
      maxScore,
    })),
  );
}

export function formatShotShapingRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}
