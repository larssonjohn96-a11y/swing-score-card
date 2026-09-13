import { rankEngineActivities, type EngineObjective, type EngineSkill } from "@/lib/sg4-engine";
import { getBehaviorRecommendationScore } from "@/lib/sg4-recommender";

export type SurfaceActivity = {
  id: string;
  href: string;
  title: string;
  detail: string;
  label: string;
  family: "play" | "challenge" | "training";
  engineSkill?: EngineSkill;
  basePriority: number;
};

const CATALOG: SurfaceActivity[] = [
  { id: "play-bot", href: "/match-bot", title: "Spela mot bot", detail: "Snabb match mot en golfpersona på din nivå.", label: "Match", family: "play", basePriority: 0.84 },
  { id: "play-friend", href: "/match?flow=friend", title: "Utmana en vän", detail: "Head to head i putting, chip, inspel eller driver.", label: "Match", family: "play", basePriority: 0.8 },
  { id: "play-team", href: "/match?flow=team", title: "Lagspel", detail: "Fourball eller Foursomes med fyra spelare.", label: "Match", family: "play", basePriority: 0.62 },
  { id: "play-cup", href: "/cup", title: "Putting Club Cup", detail: "8 spelare · 5 hål · knockout till final.", label: "Cup", family: "play", basePriority: 0.76 },
  { id: "/putting-streak", href: "/putting-streak", title: "Putting Streak", detail: "Sätt putten för att gå vidare. Första missen avslutar.", label: "Challenge", family: "challenge", engineSkill: "putting", basePriority: 0.78 },
  { id: "/lagputt-ladder", href: "/lagputt-ladder", title: "Lag Putt Ladder", detail: "Klättra från 8 meter och håll dig på två puttar.", label: "Challenge", family: "challenge", engineSkill: "putting", basePriority: 0.67 },
  { id: "/klock-putt", href: "/klock-putt", title: "Klockan", detail: "12 puttar från fyra riktningar och tre avstånd.", label: "Putting", family: "training", engineSkill: "putting", basePriority: 0.58 },
  { id: "/8-bollar", href: "/8-bollar", title: "8-bollsövningen", detail: "Chip, pitch, lobb och bunker i ett snabbt scoringformat.", label: "Närspel", family: "challenge", engineSkill: "chip", basePriority: 0.75 },
  { id: "/bunker-traning", href: "/bunker-traning", title: "Bunkerträning", detail: "Bygg precision från olika bunkerlägen och avstånd.", label: "Närspel", family: "training", engineSkill: "chip", basePriority: 0.5 },
  { id: "/approach-pei-valj", href: "/approach-pei-valj", title: "Approach Precision", detail: "Precision från wedge till långa inspel.", label: "Inspel", family: "training", engineSkill: "approach", basePriority: 0.68 },
  { id: "/fairway-streak", href: "/fairway-streak", title: "Fairway Streak", detail: "Träffa 30 m-fairwayen och håll streaken vid liv.", label: "Challenge", family: "challenge", engineSkill: "driver", basePriority: 0.72 },
  { id: "/driver-konsekvens", href: "/driver-konsekvens", title: "Driver med konsekvens", detail: "16 drives där vänster- och högermiss kostar olika.", label: "Driver", family: "training", engineSkill: "driver", basePriority: 0.56 },
  { id: "/longdrive", href: "/longdrive", title: "Longest Drive", detail: "Sex försök. Jaga carry-PB och följ snittet.", label: "Power", family: "challenge", engineSkill: "driver", basePriority: 0.61 },
];

function learningRankScores(candidates: SurfaceActivity[], objective: EngineObjective) {
  const skillActivities = candidates.filter((item): item is SurfaceActivity & { engineSkill: EngineSkill } => Boolean(item.engineSkill));
  if (!skillActivities.length) return new Map<string, number>();
  const ranked = rankEngineActivities(
    skillActivities.map((item) => ({ ...item, engineSkill: item.engineSkill })),
    objective,
  );
  const scores = new Map<string, number>();
  const denominator = Math.max(1, ranked.length - 1);
  ranked.forEach((item, index) => scores.set(item.id, 1 - index / denominator));
  return scores;
}

function scoreCandidates(candidates: SurfaceActivity[], objective: EngineObjective) {
  const learningRanks = learningRankScores(candidates, objective);
  return candidates
    .map((item, index) => {
      const behavior = getBehaviorRecommendationScore(item.id);
      const learning = item.engineSkill ? (learningRanks.get(item.id) ?? 0.5) : 0.5;
      const score = objective === "fun"
        ? behavior.score * 0.7 + item.basePriority * 0.3
        : objective === "learning"
          ? learning * 0.64 + behavior.completionRate * 0.16 + behavior.exploration * 0.1 + item.basePriority * 0.1
          : behavior.score * 0.42 + learning * 0.36 + behavior.exploration * 0.08 + item.basePriority * 0.14;
      return { item, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

function diversifiedTop(scored: Array<{ item: SurfaceActivity; score: number; index: number }>, limit: number) {
  const selected: SurfaceActivity[] = [];
  for (const candidate of scored) {
    if (selected.length >= limit) break;
    if (!selected.length) {
      selected.push(candidate.item);
      continue;
    }
    const duplicateSkill = candidate.item.engineSkill && selected.some((item) => item.engineSkill === candidate.item.engineSkill);
    const duplicateFamily = selected.some((item) => item.family === candidate.item.family);
    const alternativesRemain = scored.some((other) =>
      !selected.includes(other.item) &&
      (!candidate.item.engineSkill || other.item.engineSkill !== candidate.item.engineSkill) &&
      other.item.family !== candidate.item.family &&
      other.score >= candidate.score - 0.1,
    );
    if ((duplicateSkill || duplicateFamily) && alternativesRemain) continue;
    selected.push(candidate.item);
  }
  if (selected.length < limit) {
    for (const candidate of scored) {
      if (selected.length >= limit) break;
      if (!selected.includes(candidate.item)) selected.push(candidate.item);
    }
  }
  return selected;
}

export function getHomeRecommendations(limit = 3) {
  return diversifiedTop(scoreCandidates(CATALOG, "balanced"), limit);
}

export function getPlayRecommendations(limit = 2, excludeIds: string[] = []) {
  const candidates = CATALOG.filter((item) => item.family === "play" && !excludeIds.includes(item.id));
  return diversifiedTop(scoreCandidates(candidates, "fun"), limit);
}

export function getRecommendationsForSkill(skill: EngineSkill, limit = 2, excludeIds: string[] = []) {
  const candidates = CATALOG.filter((item) => item.engineSkill === skill && !excludeIds.includes(item.id));
  return diversifiedTop(scoreCandidates(candidates, "balanced"), limit);
}

export function getCatalogActivity(id: string) {
  return CATALOG.find((item) => item.id === id);
}

export const SURFACE_ACTIVITY_IDS = CATALOG.map((item) => item.id);
