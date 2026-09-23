import { describe, expect, it } from "vitest";
import { buildPlayerMatchReview, type MatchReviewHole } from "./match-review";

describe("combined match review", () => {
  const holes: MatchReviewHole[] = [2.5, 5, 10].map((distance) => ({
    challenge: { title: `${String(distance).replace(".", ",")} m` },
    winner: "blue",
    blueStrokes: 1,
    redStrokes: 3,
    bluePoints: 4,
    redPoints: 1,
  }));
  it("keeps both players' results separate and reads decimal distances", () => {
    const blue = buildPlayerMatchReview("putting", holes, "blue");
    const red = buildPlayerMatchReview("putting", holes, "red");
    expect(blue.hcp).not.toBe(red.hcp);
    expect(blue.outcomes[0].context).toBe("2,5 m");
    expect(blue.outcomes.every((r) => r.result === "1 putt")).toBe(true);
    expect(red.outcomes.every((r) => r.result === "3 puttar")).toBe(true);
  });
  it("estimates both chip handicaps and counts the correct zones", () => {
    const blue = buildPlayerMatchReview("around-the-green", holes, "blue");
    const red = buildPlayerMatchReview("around-the-green", holes, "red");
    expect(blue.hcp).not.toBe("–");
    expect(red.hcp).not.toBe("–");
    expect(blue.hcp).not.toBe(red.hcp);
    expect(blue.counts.find((c) => c.category === "Utmärkt")?.count).toBe(3);
    expect(red.counts.find((c) => c.category === "Svagt")?.count).toBe(3);
  });
  it("excludes unfinished holes and does not invent estimates for unsupported formats", () => {
    const pending = { ...holes[0], winner: null };
    expect(buildPlayerMatchReview("putting", [holes[0], pending], "blue").hcp).toBe("–");
    expect(
      buildPlayerMatchReview("around-the-green", [holes[0], pending], "blue").outcomes,
    ).toHaveLength(1);
    expect(buildPlayerMatchReview("bunker", holes, "red").hcp).toBe("–");
  });
});
