import { describe, expect, it } from "vitest";
import { speedStories } from "./speed-story";
describe("speed stories", () => {
  it("hides an inferior all-golfer comparison and keeps the final CTA story", () => {
    expect(speedStories(130, 70)).toEqual(["hcp", "age", "distance"]);
  });
  it("includes equal, stronger and age-unknown all-golfer comparisons", () => {
    for (const [speed, age] of [
      [200, 70],
      [130, 20],
      [100, undefined],
    ] as const) {
      expect(speedStories(speed, age)).toEqual(["hcp", "age", "all", "distance"]);
    }
  });
});
