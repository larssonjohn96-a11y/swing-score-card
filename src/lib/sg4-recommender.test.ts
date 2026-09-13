import { describe, expect, it } from "vitest";
import { scoreBehaviorProfile, type ActivityBehaviorProfile } from "@/lib/sg4-recommender";

function profile(overrides: Partial<ActivityBehaviorProfile> = {}): ActivityBehaviorProfile {
  return {
    impressions: 0,
    opens: 0,
    engagements: 0,
    completions: 0,
    replays: 0,
    abandons: 0,
    valueEma: 0.5,
    ...overrides,
  };
}

describe("SG4 behavioral recommender", () => {
  it("strong completion and replay behavior outranks repeated abandonment", () => {
    const loved = scoreBehaviorProfile(profile({
      impressions: 12,
      opens: 10,
      engagements: 9,
      completions: 8,
      replays: 4,
      abandons: 0,
      valueEma: 0.9,
    }));
    const rejected = scoreBehaviorProfile(profile({
      impressions: 12,
      opens: 8,
      engagements: 2,
      completions: 1,
      replays: 0,
      abandons: 6,
      valueEma: 0.2,
    }));

    expect(loved.affinity).toBeGreaterThan(rejected.affinity);
    expect(loved.score).toBeGreaterThan(rejected.score);
  });

  it("keeps an exploration bonus for activities with little data", () => {
    const unknown = scoreBehaviorProfile(profile());
    const saturated = scoreBehaviorProfile(profile({
      impressions: 80,
      opens: 50,
      engagements: 45,
      completions: 35,
      replays: 6,
      valueEma: 0.7,
    }));

    expect(unknown.exploration).toBeGreaterThan(saturated.exploration);
  });

  it("reduces novelty when the same activity has appeared repeatedly", () => {
    const fresh = scoreBehaviorProfile(profile(), 0);
    const repeated = scoreBehaviorProfile(profile(), 4);
    expect(fresh.novelty).toBeGreaterThan(repeated.novelty);
  });
});
