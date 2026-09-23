import { describe, expect, it } from "vitest";
import { speedStories, tourMessage } from "./speed-story";
describe("speed stories", () => {
  it("hides an inferior all-golfer comparison but keeps references and the final CTA story", () => {
    expect(speedStories(130, 70)).toEqual(["hcp", "age", "tour", "perspective", "distance"]);
  });
  it("includes equal, stronger and age-unknown all-golfer comparisons", () => {
    for (const [speed, age] of [
      [200, 70],
      [130, 20],
      [100, undefined],
    ] as const) {
      expect(speedStories(speed, age)).toContain("all");
    }
  });
  it("does not claim to beat a tour average just because a shot is close", () => {
    expect(tourMessage(170, 171, "PGA Tour")).toContain("nära");
    expect(tourMessage(171, 171, "PGA Tour")).toContain("matchar");
    expect(tourMessage(172, 171, "PGA Tour")).toContain("slår bollhastigheten");
    expect(tourMessage(100, 171, "PGA Tour")).toContain("58 %");
  });
});
