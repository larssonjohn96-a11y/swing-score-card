import { describe, expect, it } from "vitest";
import {
  buildActivityReview,
  rawActivityOutcomes,
  scoredActivityOutcomes,
  shortGameReviewInput,
} from "./activity-review";

describe("shared activity review", () => {
  it("does not invent HCP or quality from uncalibrated numeric scores", () => {
    const result = buildActivityReview({
      title: "Training",
      outcomes: rawActivityOutcomes([0, 1, 5, 10]),
      handicap: NaN,
    });
    expect(result.handicap).toBeNull();
    expect(result.good).toBe(0);
    expect(result.poor).toBe(0);
    expect(result.outcomes).toHaveLength(4);
  });
  it("preserves zero and plus handicaps from existing models", () => {
    expect(buildActivityReview({ title: "Test", outcomes: [], handicap: 0 }).handicap).toBe(0);
    expect(buildActivityReview({ title: "Test", outcomes: [], handicap: -3 }).handicap).toBe(-3);
  });
  it("uses registered makes and misses without inferring miss direction", () => {
    const review = buildActivityReview({
      title: "Putting",
      outcomes: rawActivityOutcomes([
        { holed: true, distance: 2 },
        { holed: false, distance: 3 },
      ]),
    });
    expect(review.good).toBe(1);
    expect(review.poor).toBe(1);
    expect(review.outcomes[1].result).toContain("Sänkt: Nej");
    expect(review.outcomes[1].result).not.toContain("Vänster");
  });
  it("keeps chip and bunker zone meanings separate", () => {
    expect(shortGameReviewInput("Chip", [{ points: 0 }]).outcomes[0].result).toBe("Utanför 5 m");
    expect(shortGameReviewInput("Bunker", [{ points: 0 }], true).outcomes[0].result).toBe(
      "Missad green",
    );
    expect(
      shortGameReviewInput("Chip", [{ distance: 12, lie: "Ruff", points: 4 }]).outcomes[0].context,
    ).toBe("12 m · Ruff");
  });
  it("resolves score labels without assuming that a high score is better", () => {
    expect(
      scoredActivityOutcomes(
        [1, 4],
        [
          { value: 1, label: "1 putt" },
          { value: 4, label: "4 puttar" },
        ],
      ).map((r) => r.result),
    ).toEqual(["1 putt", "4 puttar"]);
    expect(
      scoredActivityOutcomes([4], [{ value: 4, label: "4 puttar" }])[0].quality,
    ).toBeUndefined();
  });
});
