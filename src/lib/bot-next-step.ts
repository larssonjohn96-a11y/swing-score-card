import { getBehaviorRecommendationScore } from "@/lib/sg4-recommender";
import { getBotCategoryHistory, type BotMatchCategory } from "@/lib/bot-match-history";

export type BotNextCandidate = {
  id: string;
  hcp: number;
  locked?: boolean;
};

export type BotNextStep = {
  action: "rematch" | "challenge";
  targetBotId?: string;
  rematchScore: number;
  challengeScore: number;
};

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export function chooseBotNextStep(input: {
  currentBotId: string;
  currentBotHcp: number;
  category: BotMatchCategory;
  outcome: "player" | "bot";
  margin: number;
  candidates: BotNextCandidate[];
}): BotNextStep {
  const { currentBotId, currentBotHcp, category, outcome, margin, candidates } = input;
  const history = getBotCategoryHistory(currentBotId, category);
  const rematchBehavior = getBehaviorRecommendationScore(`bot-next:rematch:${currentBotId}:${category}`);
  const closeMatch = margin <= 1 ? 1 : margin <= 2 ? 0.55 : 0;
  const repeatedLosses = clamp(history.botStreak / 3);
  const repeatedWins = clamp(history.playerStreak / 3);

  let rematchScore =
    rematchBehavior.affinity * 0.28 +
    rematchBehavior.completionRate * 0.12 +
    closeMatch * 0.24 +
    (outcome === "bot" ? 0.18 : 0.08) +
    repeatedLosses * 0.12 -
    repeatedWins * 0.16;

  if (history.meetings >= 4 && history.botWins / Math.max(1, history.meetings) >= 0.75 && history.averageMargin >= 2) {
    rematchScore -= 0.16;
  }
  rematchScore = clamp(rematchScore);

  const available = candidates.filter((candidate) => !candidate.locked && candidate.id !== currentBotId);
  let bestTarget: BotNextCandidate | undefined;
  let bestTargetScore = -Infinity;

  for (const candidate of available) {
    const behavior = getBehaviorRecommendationScore(`bot-next:challenge:${candidate.id}:${category}`);
    const difficultyDelta = currentBotHcp - candidate.hcp;
    const isHarder = difficultyDelta > 0;
    const progressionFit = outcome === "player"
      ? (isHarder ? clamp(1 - Math.abs(difficultyDelta - 5) / 18) : 0.18)
      : (!isHarder ? clamp(0.7 - Math.abs(difficultyDelta) / 30) : 0.38);
    const novelty = behavior.novelty * 0.24 + behavior.exploration * 0.14;
    const preference = behavior.affinity * 0.22;
    const masteryPush = repeatedWins * (isHarder ? 0.22 : 0.02);
    const frustrationEscape = repeatedLosses * (outcome === "bot" ? 0.14 : 0.02);
    const score = progressionFit * 0.34 + novelty + preference + masteryPush + frustrationEscape;
    if (score > bestTargetScore) {
      bestTargetScore = score;
      bestTarget = candidate;
    }
  }

  const challengeScore = clamp(bestTarget ? bestTargetScore : 0);
  const action = bestTarget && challengeScore > rematchScore + 0.04 ? "challenge" : "rematch";
  return {
    action,
    targetBotId: action === "challenge" ? bestTarget?.id : undefined,
    rematchScore,
    challengeScore,
  };
}
