/**
 * SG4 motor-learning policy.
 *
 * Evidence-informed product policy, not a list of scientific constants. The
 * numeric thresholds below are tuning defaults that can later be calibrated
 * from SG4 retention/transfer data.
 *
 * Core principles:
 * - optimize durable retention and transfer, not just pretty practice performance
 * - use blocked repetition briefly for genuinely new movement solutions
 * - raise variation/interleaving quickly after the movement can be found
 * - keep difficulty near an informative challenge point
 * - preserve representative perception, decisions and consequences
 * - space and revisit skills instead of grinding one thing continuously
 * - fade feedback so the player develops independent error detection
 * - add score/competition/pressure progressively so the skill survives play
 */

export type MotorLearningSkill = "chip" | "putting" | "approach" | "driver";
export type MotorLearningObjective = "fun" | "learning" | "balanced";
export type MotorLearningContext = "game" | "training" | "assessment";
export type MotorLearningPhase = "acquisition" | "stabilization" | "transfer" | "pressure";

export const MOTOR_LEARNING_PRINCIPLES = [
  "Optimize retention and transfer, not just performance during the current session.",
  "Use blocked repetition briefly to find a new movement, then increase variability and interleaving.",
  "Preserve representative perception, decisions and consequences as the skill becomes stable.",
  "Keep difficulty near the player's challenge point: informative, achievable and not automatic.",
  "Treat variation as a learning feature: the next solution should usually need to be rebuilt, not copied.",
  "Use spacing and delayed revisits so learning must be retrieved again instead of held in short-term memory.",
  "Fade feedback and encourage self-evaluation so the player does not become dependent on the coach or app.",
  "Introduce score, competition and pressure progressively so the skill survives real play.",
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function learningPhaseFromEvidence(input: {
  attempts: number;
  performance: number;
  confidence: number;
  context?: MotorLearningContext;
}): MotorLearningPhase {
  const attempts = Math.max(0, input.attempts);
  const performance = clamp(input.performance);
  const confidence = clamp(input.confidence);
  const context = input.context ?? "training";
  if (attempts < 4 || confidence < 0.3) return "acquisition";
  if (attempts < 10 || confidence < 0.62 || performance < 0.56) return "stabilization";
  if (context === "game" && attempts >= 12 && confidence >= 0.72 && performance >= 0.66) return "pressure";
  return "transfer";
}

export function challengeTargetForPhase(input: {
  phase: MotorLearningPhase;
  objective: MotorLearningObjective;
  context?: MotorLearningContext;
}) {
  const base = input.phase === "acquisition" ? 0.72
    : input.phase === "stabilization" ? 0.64
    : input.phase === "transfer" ? 0.58
    : 0.55;
  const objectiveAdjustment = input.objective === "fun" ? 0.05 : input.objective === "balanced" ? 0.02 : 0;
  const contextAdjustment = input.context === "game" && input.phase !== "acquisition" ? -0.02 : 0;
  return clamp(base + objectiveAdjustment + contextAdjustment, 0.5, 0.8);
}

export function meaningfulDistanceGap(skill: MotorLearningSkill) {
  if (skill === "putting") return 5;
  if (skill === "chip") return 6;
  if (skill === "approach") return 18;
  return 25;
}

export function distanceVariationScore(input: {
  skill: MotorLearningSkill;
  current: number;
  previous?: number;
  phase: MotorLearningPhase;
}) {
  if (typeof input.previous !== "number" || !Number.isFinite(input.previous)) return 0.72;
  const ratio = Math.abs(input.current - input.previous) / Math.max(1, meaningfulDistanceGap(input.skill));
  if (input.phase === "acquisition") return clamp(1 - Math.abs(ratio - 0.6) / 1.2, 0.28, 1);
  if (input.phase === "stabilization") return clamp(1 - Math.abs(ratio - 1.05) / 1.45, 0.22, 1);
  if (ratio < 1) return clamp(0.2 + ratio * 0.8, 0.2, 1);
  if (ratio <= 2.2) return 1;
  return clamp(1 - (ratio - 2.2) * 0.1, 0.68, 1);
}

export function spacingPriority(hoursSinceLastPractice: number) {
  if (!Number.isFinite(hoursSinceLastPractice)) return 1;
  if (hoursSinceLastPractice <= 1) return 0.12;
  if (hoursSinceLastPractice <= 6) return 0.25;
  if (hoursSinceLastPractice <= 24) return 0.5;
  if (hoursSinceLastPractice <= 48) return 0.72;
  if (hoursSinceLastPractice <= 96) return 0.9;
  return 1;
}

export function feedbackPolicyForPhase(phase: MotorLearningPhase) {
  if (phase === "acquisition") return { feedbackFrequency: 0.9, promptSelfEstimate: false, cueBudget: 2, pressureWeight: 0 } as const;
  if (phase === "stabilization") return { feedbackFrequency: 0.62, promptSelfEstimate: true, cueBudget: 1, pressureWeight: 0.15 } as const;
  if (phase === "transfer") return { feedbackFrequency: 0.34, promptSelfEstimate: true, cueBudget: 1, pressureWeight: 0.45 } as const;
  return { feedbackFrequency: 0.18, promptSelfEstimate: true, cueBudget: 1, pressureWeight: 0.8 } as const;
}

export function practiceMixForPhase(phase: MotorLearningPhase) {
  if (phase === "acquisition") return { blocked: 0.65, varied: 0.25, gameLike: 0.1 } as const;
  if (phase === "stabilization") return { blocked: 0.3, varied: 0.5, gameLike: 0.2 } as const;
  if (phase === "transfer") return { blocked: 0.1, varied: 0.5, gameLike: 0.4 } as const;
  return { blocked: 0.05, varied: 0.35, gameLike: 0.6 } as const;
}
