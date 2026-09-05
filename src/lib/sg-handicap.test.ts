import { describe, expect, it } from "vitest";
import {
  CATEGORY_WEIGHTS,
  SCORING_CATEGORIES,
  computeEstimatedHandicap,
  computeEstimatedTrend,
  computeStrokesLost,
  type CategoryHandicap,
} from "@/lib/sg-handicap";
import { buildCategoryIndexSeries } from "@/lib/category-index";

function cat(slug: CategoryHandicap["slug"], handicap: number, trend?: number): CategoryHandicap {
  return { slug, title: slug, count: 3, handicap, trend };
}

const FOUR: CategoryHandicap[] = [
  cat("driving", 12, -0.5),
  cat("approach", 16, -1),
  cat("around-the-green", 20, 0.5),
  cat("puttning", 14, -0.2),
];

describe("Total SG4 HCP", () => {
  it("baseras på exakt fyra scoringkategorier", () => {
    expect([...SCORING_CATEGORIES]).toEqual([
      "driving",
      "approach",
      "around-the-green",
      "puttning",
    ]);
    expect(CATEGORY_WEIGHTS.speed).toBe(0);
  });

  it("påverkas inte av Speed-värden", () => {
    const base = computeEstimatedHandicap(FOUR);
    for (const speedHcp of [-8, 0, 18, 40]) {
      expect(computeEstimatedHandicap([...FOUR, cat("speed", speedHcp)])).toBe(base);
    }
  });

  it("trenden påverkas inte av Speed-trend", () => {
    const base = computeEstimatedTrend(FOUR);
    expect(computeEstimatedTrend([...FOUR, cat("speed", 10, 5)])).toBe(base);
  });

  it("Speed ger inga strokes lost mot totalen", () => {
    const rows = computeStrokesLost([...FOUR, cat("speed", 30)]);
    expect(rows.some((r) => r.slug === "speed")).toBe(false);
  });

  it("saknas all scoringdata ger ingen total, även med Speed", () => {
    expect(computeEstimatedHandicap([cat("speed", 12)])).toBeUndefined();
  });
});

describe("Speed stabiliseras bara en gång", () => {
  it("category-index är idempotent på redan indexerad serie", () => {
    const raw = [22, 12, 24, 15, 19];
    const once = buildCategoryIndexSeries(raw);
    const twice = buildCategoryIndexSeries(once);
    expect(twice).toEqual(once);
  });
});
