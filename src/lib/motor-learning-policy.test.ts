import { describe, expect, it } from "vitest";
import { challengeTargetForPhase, distanceVariationScore, feedbackPolicyForPhase, learningPhaseFromEvidence, spacingPriority } from "@/lib/motor-learning-policy";

describe("motor learning policy", () => {
  it("starts new or uncertain skills in acquisition", () => {
    expect(learningPhaseFromEvidence({ attempts: 2, performance: 0.8, confidence: 0.2 })).toBe("acquisition");
  });
  it("moves stable game skills into pressure transfer", () => {
    expect(learningPhaseFromEvidence({ attempts: 16, performance: 0.78, confidence: 0.85, context: "game" })).toBe("pressure");
  });
  it("uses a harder target once transfer matters", () => {
    expect(challengeTargetForPhase({ phase: "acquisition", objective: "learning", context: "training" }))
      .toBeGreaterThan(challengeTargetForPhase({ phase: "transfer", objective: "learning", context: "game" }));
  });
  it("rewards meaningful putting variation during transfer", () => {
    const small = distanceVariationScore({ skill: "putting", previous: 3, current: 5, phase: "transfer" });
    const varied = distanceVariationScore({ skill: "putting", previous: 3, current: 12, phase: "transfer" });
    expect(varied).toBeGreaterThan(small);
  });
  it("increases revisit priority with spacing", () => {
    expect(spacingPriority(72)).toBeGreaterThan(spacingPriority(2));
  });
  it("fades feedback as skill transfers", () => {
    expect(feedbackPolicyForPhase("acquisition").feedbackFrequency).toBeGreaterThan(feedbackPolicyForPhase("transfer").feedbackFrequency);
  });
});
