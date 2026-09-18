import { describe, expect, it } from "vitest";
import {
  buildPuttingMatchReview,
  coachPuttingReviewHoles,
  puttingHcpDisplayBand,
  puttingReviewCategory,
  type ReviewHole,
} from "./putting-match-review";

const hole = (distance: number, yourValue: number): ReviewHole => ({
  distance,
  yourValue,
  winner: "you",
});

describe("putting match review", () => {
  it("analyses all 30 coach holes with the same engine as a match", () => {
    const attempts = Array.from({ length: 30 }, (_, index) => ({
      distance: [1, 5, 12][index % 3],
      strokes: [1, 2, 3][index % 3],
    }));
    const result = buildPuttingMatchReview(coachPuttingReviewHoles(attempts));
    expect(result.rows).toHaveLength(30);
    expect(result.rows[29].hole).toBe(30);
    expect(result.total).toBe(60);
    expect(result.categories.reduce((sum, category) => sum + category.count, 0)).toBe(30);
    expect(result.bands.map((band) => band.count)).toEqual([10, 10, 10]);
    expect(result).toEqual(
      buildPuttingMatchReview(attempts.map((attempt) => hole(attempt.distance, attempt.strokes))),
    );
    expect(buildPuttingMatchReview(coachPuttingReviewHoles([])).rows).toEqual([]);
  });
  it("uses five-point steps with bands no wider than ten", () => {
    expect(puttingHcpDisplayBand(10)).toEqual({ low: 5, high: 15 });
    expect(puttingHcpDisplayBand(20)).toEqual({ low: 15, high: 25 });
    expect(puttingHcpDisplayBand(0)).toEqual({ low: 0, high: 10 });
    expect(puttingHcpDisplayBand(54)).toEqual({ low: 45, high: 54 });
    for (let estimate = 0; estimate <= 54; estimate += 0.5) {
      const { low, high } = puttingHcpDisplayBand(estimate);
      expect(high - low).toBeLessThanOrEqual(10);
      expect(low).toBeLessThanOrEqual(estimate);
      expect(high).toBeGreaterThanOrEqual(estimate);
      expect(low % 5).toBe(0);
      expect(high === 54 || high % 5 === 0).toBe(true);
    }
  });
  it("requires three valid, completed holes for an HCP estimate", () => {
    expect(buildPuttingMatchReview([]).hcpBand).toBeNull();
    expect(buildPuttingMatchReview([hole(2, 1), hole(8, 2)]).hcpBand).toBeNull();
    expect(buildPuttingMatchReview([hole(2, 1), hole(8, 2), hole(12, 2)]).hcpBand).not.toBeNull();
  });
  it("ignores unplayed/invalid holes and retains the original hole numbers", () => {
    const result = buildPuttingMatchReview([
      { distance: 2, yourValue: 1 },
      hole(NaN, 2),
      hole(0, 1),
      hole(4, 0),
      hole(4, 1.5),
      hole(30, 2),
      hole(8, 2),
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].hole).toBe(7);
  });
  it("is independent of the opponent and match outcome", () => {
    const rows = [hole(2, 1), hole(8, 2), hole(12, 3)];
    expect(buildPuttingMatchReview(rows)).toEqual(
      buildPuttingMatchReview(rows.map((row) => ({ ...row, winner: "bot" }))),
    );
    expect(buildPuttingMatchReview(rows)).toEqual(
      buildPuttingMatchReview(rows.map((row) => ({ ...row, winner: "tie" }))),
    );
  });
  it("assigns every valid hole to exactly one category and distance band", () => {
    const result = buildPuttingMatchReview([hole(3, 1), hole(3.5, 2), hole(8, 2), hole(9, 4)]);
    expect(result.categories.reduce((sum, category) => sum + category.count, 0)).toBe(4);
    expect(result.bands.map((band) => band.count)).toEqual([1, 2, 1]);
    expect(result.onePutts).toBe(1);
    expect(result.threePutts).toBe(1);
    expect(result.total).toBe(9);
  });
  it("rewards difficult makes and identifies costly short-hole misses", () => {
    const result = buildPuttingMatchReview([hole(1, 3), hole(15, 1), hole(5, 2)]);
    expect(result.best?.hole).toBe(2);
    expect(result.best?.category.id).toBe("exceptional");
    expect(result.biggestLoss?.hole).toBe(1);
    expect(result.biggestLoss?.category.id).toBe("loss");
  });
  it("never improves HCP when more putts are used at the same distances", () => {
    const good = buildPuttingMatchReview([hole(2, 1), hole(8, 2), hole(12, 2)]);
    const bad = buildPuttingMatchReview([hole(2, 2), hole(8, 3), hole(12, 3)]);
    expect(bad.hcpBand!.low).toBeGreaterThanOrEqual(good.hcpBand!.low);
    expect(bad.hcpBand!.high).toBeGreaterThanOrEqual(good.hcpBand!.high);
    expect(bad.hcpBand!.high).toBeLessThanOrEqual(54);
  });
  it("does not invent a loss when every hole beats the benchmark", () => {
    expect(buildPuttingMatchReview([hole(1, 1), hole(10, 1), hole(15, 1)]).biggestLoss).toBeNull();
  });
  it("handles category thresholds deterministically", () => {
    expect([1, 0.5, 0.15, -0.25, -0.9, -1].map((value) => puttingReviewCategory(value).id)).toEqual(
      ["exceptional", "excellent", "good", "expected", "weak", "loss"],
    );
  });
});
