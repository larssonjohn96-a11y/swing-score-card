import { describe, expect, it } from "vitest";
import { competenceFit, engagementFunScore, engagementStageFromSignals, frictionQualityScore, habitRecoveryPolicy, repetitionDiversityScore } from "@/lib/engagement-fun-policy";

describe("engagement fun policy", () => {
  it("treats long sessions differently", () => {
    expect(engagementStageFromSignals({ sessionDepth: 14, completions: 10, hoursSinceLastCompletion: 1 })).toBe("deep-session");
  });
  it("recognizes returning users", () => {
    expect(engagementStageFromSignals({ sessionDepth: 0, completions: 10, hoursSinceLastCompletion: 120 })).toBe("returning");
  });
  it("penalizes repetitive recommendations", () => {
    expect(repetitionDiversityScore(3)).toBeLessThan(repetitionDiversityScore(0));
  });
  it("prefers competent over frustrating completion", () => {
    expect(competenceFit(0.7)).toBeGreaterThan(competenceFit(0.1));
  });
  it("uses forgiving habit recovery for short lapses", () => {
    expect(habitRecoveryPolicy(2)).toMatchObject({ state: "grace", preserveMomentum: true });
  });
  it("scores lower friction higher", () => {
    expect(frictionQualityScore({ expectedWaitMs: 200, interactionSteps: 1 })).toBeGreaterThan(frictionQualityScore({ expectedWaitMs: 4000, interactionSteps: 5 }));
  });
  it("repetition lowers otherwise identical engagement value", () => {
    const base = { affinity: 0.72, novelty: 0.55, exploration: 0.4, spacing: 0.7, completionRate: 0.72, sessionDepth: 4, hoursSinceLastCompletion: 30, completions: 5 };
    expect(engagementFunScore({ ...base, recentMatches: 0 }).score).toBeGreaterThan(engagementFunScore({ ...base, recentMatches: 3 }).score);
  });
});
