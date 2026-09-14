/**
 * SG4 engagement/fun policy.
 * Evidence-informed product policy, not scientific constants. Numeric weights
 * are tuning defaults to calibrate with SG4 retention, completion, replay and
 * transfer data through controlled experiments.
 *
 * Principles:
 * - optimize long-term useful return, not raw taps/time spent
 * - support autonomy, competence and relatedness
 * - mix familiarity with discovery; avoid recommendation echo chambers
 * - make the minimum useful action easy and missed-day recovery forgiving
 * - celebrate progress and personal wins without making rewards the whole product
 * - reduce waiting and interaction friction
 * - treat deep sessions differently from first/returning sessions
 * - A/B test engagement mechanics with skill/learning as guardrails
 */
export type EngagementStage = "new" | "habit" | "established" | "deep-session" | "returning";

export const ENGAGEMENT_FUN_PRINCIPLES = [
  "Optimize long-term return and useful completed activity, not raw taps or time spent.",
  "Support autonomy with meaningful choice and personalization instead of forcing one path.",
  "Support competence with achievable challenge, visible progress, milestones and clear feedback.",
  "Support relatedness with friends, teams, shared goals and appropriately matched competition.",
  "Mix familiar favorites with deliberate discovery so recommendations do not become repetitive.",
  "Make the minimum useful daily action easy enough to start, then let users voluntarily continue.",
  "Use forgiving recovery after a missed day instead of turning one lapse into abandonment.",
  "Celebrate personal bests, streak milestones, wins and progress without making rewards the whole product.",
  "Reduce load time, waiting and unnecessary taps because friction directly competes with motivation.",
  "Treat deep sessions differently: preserve quality and end on a satisfying win rather than maximizing grind.",
  "A/B test major engagement mechanics and keep learning/skill outcomes as guardrail metrics.",
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function engagementStageFromSignals(input: { sessionDepth: number; completions: number; hoursSinceLastCompletion: number }): EngagementStage {
  if (Number.isFinite(input.hoursSinceLastCompletion) && input.hoursSinceLastCompletion >= 96) return "returning";
  if (input.sessionDepth >= 12) return "deep-session";
  if (input.completions < 2) return "new";
  if (input.completions < 8) return "habit";
  return "established";
}

export function noveltyTargetForStage(stage: EngagementStage) {
  if (stage === "new") return 0.62;
  if (stage === "habit") return 0.5;
  if (stage === "established") return 0.42;
  if (stage === "returning") return 0.48;
  return 0.32;
}

export function repetitionDiversityScore(recentMatches: number) {
  if (recentMatches <= 0) return 1;
  if (recentMatches === 1) return 0.82;
  if (recentMatches === 2) return 0.58;
  if (recentMatches === 3) return 0.38;
  return 0.24;
}

export function competenceFit(completionRate: number) {
  const c = clamp(completionRate);
  if (c < 0.25) return clamp((c / 0.25) * 0.45, 0.08, 0.45);
  if (c <= 0.82) return clamp(0.45 + ((c - 0.25) / 0.57) * 0.55, 0.45, 1);
  return clamp(1 - (c - 0.82) * 0.45, 0.88, 1);
}

export function engagementFunScore(input: {
  affinity: number;
  novelty: number;
  exploration: number;
  spacing: number;
  completionRate: number;
  recentMatches: number;
  sessionDepth: number;
  hoursSinceLastCompletion: number;
  completions?: number;
}) {
  const stage = engagementStageFromSignals({
    sessionDepth: input.sessionDepth,
    completions: input.completions ?? 0,
    hoursSinceLastCompletion: input.hoursSinceLastCompletion,
  });
  const noveltyTarget = noveltyTargetForStage(stage);
  const noveltyFit = clamp(1 - Math.abs(clamp(input.novelty) - noveltyTarget) / 0.75, 0.18, 1);
  const competence = competenceFit(input.completionRate);
  const diversity = repetitionDiversityScore(input.recentMatches);
  const affinity = clamp(input.affinity);
  const exploration = clamp(input.exploration);
  const spacing = clamp(input.spacing);
  const score = stage === "deep-session"
    ? affinity * 0.31 + competence * 0.25 + noveltyFit * 0.11 + exploration * 0.07 + spacing * 0.11 + diversity * 0.15
    : stage === "returning"
      ? affinity * 0.24 + competence * 0.23 + noveltyFit * 0.15 + exploration * 0.1 + spacing * 0.16 + diversity * 0.12
      : affinity * 0.26 + competence * 0.2 + noveltyFit * 0.18 + exploration * 0.11 + spacing * 0.11 + diversity * 0.14;
  return { score: clamp(score), stage, noveltyFit, competence, diversity } as const;
}

export function habitRecoveryPolicy(daysSinceUsefulActivity: number) {
  if (daysSinceUsefulActivity <= 1) return { state: "active", preserveMomentum: true, reentryIntensity: 0.7 } as const;
  if (daysSinceUsefulActivity <= 3) return { state: "grace", preserveMomentum: true, reentryIntensity: 0.45 } as const;
  if (daysSinceUsefulActivity <= 7) return { state: "returning", preserveMomentum: false, reentryIntensity: 0.32 } as const;
  return { state: "restart", preserveMomentum: false, reentryIntensity: 0.22 } as const;
}

export function frictionQualityScore(input: { expectedWaitMs?: number; interactionSteps?: number }) {
  const wait = Math.max(0, input.expectedWaitMs ?? 0);
  const steps = Math.max(0, input.interactionSteps ?? 0);
  const waitScore = clamp(1 - wait / 5000, 0.15, 1);
  const stepScore = clamp(1 - Math.max(0, steps - 1) * 0.08, 0.3, 1);
  return clamp(waitScore * 0.62 + stepScore * 0.38);
}
