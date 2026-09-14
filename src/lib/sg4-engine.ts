import type { TestSession } from "@/lib/sessions/types";
import { getBehaviorRecommendationScore, recordRecommendationCompletion, recordRecommendationSignal } from "@/lib/sg4-recommender";
import { challengeTargetForPhase, distanceVariationScore, learningPhaseFromEvidence, meaningfulDistanceGap, spacingPriority } from "@/lib/motor-learning-policy";

/**
 * SG4:s interna spelarmotor.
 *
 * Motorn har två primära mål:
 * - fun: hålla utmaningar relevanta, varierade och på en nivå som skapar flow.
 * - learning: maximera förbättring genom rätt svårighetsgrad, svagheter,
 *   mastery, spacing och exploration.
 *
 * balanced kombinerar båda. Detta är ett internt besluts- och datalager och
 * ska inte exponeras som en separat produktfunktion i UI:t.
 */

export type EngineObjective = "fun" | "learning" | "balanced";
export type EngineSkill = "chip" | "putting" | "approach" | "driver";
export type EngineContext = "game" | "training" | "assessment";

export type EngineOutcome = {
  skill: EngineSkill;
  /** Svårighetsaxel. För chip/putt/inspel är detta meter. */
  distance?: number;
  /** 0 = mycket svagt resultat, 1 = perfekt resultat. */
  performance: number;
  context: EngineContext;
  activityId?: string;
};

type SkillBucket = {
  attempts: number;
  performance: number;
  confidence: number;
  mastery: number;
  lastPlayedAt?: string;
  recent: number[];
};

type ActivityProfile = {
  completions: number;
  affinity: number;
  lastCompletedAt?: string;
};

export type PlayerEngineModel = {
  version: 1;
  updatedAt: string;
  buckets: Record<string, SkillBucket>;
  activities: Record<string, ActivityProfile>;
  seenSessionIds: string[];
  recentChallenges: string[];
};

export type DistanceDecision = {
  skill: EngineSkill;
  objective: EngineObjective;
  context?: EngineContext;
  min: number;
  max: number;
  previousDistance?: number;
  previousPerformance?: number;
  /** Används för spel där en viss del av intervallet måste representeras. */
  allowedDistances?: number[];
};

export type RankedActivity = {
  id: string;
  engineSkill: EngineSkill;
};

const STORAGE_KEY = "sg4-player-engine-v1";
const MODEL_VERSION = 1 as const;
const RECENT_LIMIT = 18;
const SESSION_ID_LIMIT = 600;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value);

function hasStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function emptyModel(): PlayerEngineModel {
  return {
    version: MODEL_VERSION,
    updatedAt: new Date(0).toISOString(),
    buckets: {},
    activities: {},
    seenSessionIds: [],
    recentChallenges: [],
  };
}

export function loadPlayerEngineModel(): PlayerEngineModel {
  if (!hasStorage()) return emptyModel();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<PlayerEngineModel> | null;
    if (!parsed || parsed.version !== MODEL_VERSION) return emptyModel();
    return {
      ...emptyModel(),
      ...parsed,
      buckets: parsed.buckets && typeof parsed.buckets === "object" ? parsed.buckets : {},
      activities: parsed.activities && typeof parsed.activities === "object" ? parsed.activities : {},
      seenSessionIds: Array.isArray(parsed.seenSessionIds) ? parsed.seenSessionIds.slice(-SESSION_ID_LIMIT) : [],
      recentChallenges: Array.isArray(parsed.recentChallenges) ? parsed.recentChallenges.slice(-RECENT_LIMIT) : [],
    };
  } catch {
    return emptyModel();
  }
}

function savePlayerEngineModel(model: PlayerEngineModel) {
  if (!hasStorage()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...model, updatedAt: new Date().toISOString() }),
  );
}

function distanceBucket(skill: EngineSkill, distance?: number) {
  if (typeof distance !== "number" || !Number.isFinite(distance)) return `${skill}:global`;

  if (skill === "chip") {
    if (distance <= 10) return "chip:7-10";
    if (distance <= 14) return "chip:11-14";
    if (distance <= 18) return "chip:15-18";
    if (distance <= 22) return "chip:19-22";
    if (distance <= 26) return "chip:23-26";
    return "chip:27-30";
  }
  if (skill === "putting") {
    if (distance <= 2) return "putting:0-2";
    if (distance <= 5) return "putting:3-5";
    if (distance <= 8) return "putting:6-8";
    if (distance <= 14) return "putting:9-14";
    return "putting:15+";
  }
  if (skill === "approach") {
    if (distance <= 80) return "approach:50-80";
    if (distance <= 120) return "approach:81-120";
    if (distance <= 160) return "approach:121-160";
    if (distance <= 200) return "approach:161-200";
    return "approach:200+";
  }
  return `${skill}:global`;
}

function defaultPerformance(skill: EngineSkill, distance?: number) {
  if (typeof distance !== "number") return 0.52;
  if (skill === "chip") return clamp(0.82 - Math.max(0, distance - 7) * 0.022, 0.25, 0.82);
  if (skill === "putting") return clamp(0.94 - Math.max(0, distance - 1) * 0.035, 0.18, 0.94);
  if (skill === "approach") return clamp(0.78 - Math.max(0, distance - 50) * 0.0026, 0.22, 0.78);
  return 0.55;
}

function updateBucket(bucket: SkillBucket | undefined, performance: number): SkillBucket {
  const value = clamp(performance);
  const attempts = (bucket?.attempts ?? 0) + 1;
  const alpha = attempts <= 4 ? 0.34 : attempts <= 10 ? 0.24 : 0.17;
  const current = bucket?.performance ?? value;
  const nextPerformance = current * (1 - alpha) + value * alpha;
  const confidence = clamp(1 - Math.exp(-attempts / 7));
  const mastery = clamp((nextPerformance - 0.68) / 0.32) * confidence;
  return {
    attempts,
    performance: nextPerformance,
    confidence,
    mastery,
    lastPlayedAt: new Date().toISOString(),
    recent: [...(bucket?.recent ?? []), value].slice(-10),
  };
}

function recordActivity(model: PlayerEngineModel, activityId?: string) {
  if (!activityId) return;
  const current = model.activities[activityId];
  const completions = (current?.completions ?? 0) + 1;
  model.activities[activityId] = {
    completions,
    affinity: clamp(0.28 + Math.log1p(completions) / 4.5),
    lastCompletedAt: new Date().toISOString(),
  };
}

export function recordEngineOutcome(outcome: EngineOutcome) {
  if (!hasStorage()) return;
  const model = loadPlayerEngineModel();
  const value = clamp(outcome.performance);
  const localKey = distanceBucket(outcome.skill, outcome.distance);
  const globalKey = `${outcome.skill}:global`;

  model.buckets[localKey] = updateBucket(model.buckets[localKey], value);
  if (localKey !== globalKey) {
    model.buckets[globalKey] = updateBucket(model.buckets[globalKey], value);
  }
  recordActivity(model, outcome.activityId);
  if (outcome.activityId) recordRecommendationSignal(outcome.activityId, "engage");

  if (typeof outcome.distance === "number") {
    model.recentChallenges = [
      ...model.recentChallenges,
      `${outcome.skill}:${Math.round(outcome.distance)}`,
    ].slice(-RECENT_LIMIT);
  }
  savePlayerEngineModel(model);
}

export function chipPerformanceFromPoints(points: number) {
  return clamp(points / 5);
}

export function puttingPerformanceFromStrokes(strokes: number) {
  if (strokes <= 1) return 1;
  if (strokes === 2) return 0.7;
  if (strokes === 3) return 0.32;
  return 0.08;
}

function skillFromSession(session: Pick<TestSession, "category">): EngineSkill | null {
  if (session.category === "around-the-green") return "chip";
  if (session.category === "puttning") return "putting";
  if (session.category === "approach") return "approach";
  if (session.category === "driving" || session.category === "speed") return "driver";
  return null;
}

function performanceFromTestHandicap(testHandicap: number) {
  // +54 ≈ mycket tidig nivå, 0 ≈ scratch, plus-handicap ≈ nära taket.
  return clamp((42 - testHandicap) / 47);
}

/**
 * Alla standardiserade tester kan mata motorn via det gemensamma sessionslagret.
 * Test-HCP används när det finns; träningssessioner utan jämförbar skala lär
 * motorn främst vilka aktiviteter spelaren faktiskt återkommer till.
 */
export function recordEngineSession(session: TestSession) {
  if (!hasStorage()) return;
  const model = loadPlayerEngineModel();
  if (model.seenSessionIds.includes(session.id)) return;

  model.seenSessionIds = [...model.seenSessionIds, session.id].slice(-SESSION_ID_LIMIT);
  recordActivity(model, session.testId);
  recordRecommendationCompletion(session.testId);

  const skill = skillFromSession(session);
  if (skill && typeof session.testHandicap === "number" && Number.isFinite(session.testHandicap)) {
    const key = `${skill}:global`;
    model.buckets[key] = updateBucket(model.buckets[key], performanceFromTestHandicap(session.testHandicap));
  }
  savePlayerEngineModel(model);
}

export function recordEngineSessions(sessions: TestSession[]) {
  sessions.forEach(recordEngineSession);
}

function modelEstimate(model: PlayerEngineModel, skill: EngineSkill, distance: number) {
  const fallback = defaultPerformance(skill, distance);
  const local = model.buckets[distanceBucket(skill, distance)];
  const global = model.buckets[`${skill}:global`];

  let estimate = fallback;
  let confidence = 0;
  if (global) {
    estimate = fallback * (1 - global.confidence * 0.35) + global.performance * (global.confidence * 0.35);
    confidence = global.confidence * 0.5;
  }
  if (local) {
    estimate = estimate * (1 - local.confidence) + local.performance * local.confidence;
    confidence = Math.max(confidence, local.confidence);
  }
  return { expected: clamp(estimate), confidence: clamp(confidence), mastery: local?.mastery ?? 0, attempts: local?.attempts ?? global?.attempts ?? 0, lastPlayedAt: local?.lastPlayedAt ?? global?.lastPlayedAt };
}

function maxStep(skill: EngineSkill) {
  if (skill === "chip") return 5;
  if (skill === "putting") return 4;
  if (skill === "approach") return 20;
  return 20;
}

/**
 * Deterministisk riktning efter ett nyligt resultat. Den begränsar aggressiva
 * hopp och är separat från kandidat-rankingen så den går att testa stabilt.
 */
export function adaptiveTargetAfterResult(
  skill: EngineSkill,
  previousDistance: number,
  previousPerformance: number,
  min: number,
  max: number,
) {
  const step = maxStep(skill);
  const p = clamp(previousPerformance);
  let delta = 0;
  if (p <= 0.12) delta = -step;
  else if (p <= 0.3) delta = -Math.max(2, Math.round(step * 0.7));
  else if (p <= 0.48) delta = -Math.max(1, Math.round(step * 0.35));
  else if (p >= 0.9) delta = step;
  else if (p >= 0.76) delta = Math.max(2, Math.round(step * 0.7));
  else if (p >= 0.64) delta = Math.max(1, Math.round(step * 0.35));
  return clamp(round(previousDistance + delta), min, max);
}

function challengeNovelty(model: PlayerEngineModel, skill: EngineSkill, distance: number) {
  const key = `${skill}:${Math.round(distance)}`;
  const recent = model.recentChallenges.slice(-8);
  const matches = recent.filter((item) => item === key).length;
  return clamp(1 - matches * 0.32, 0.12, 1);
}

function hoursSinceEngine(iso?: string) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - time) / 3_600_000);
}

function candidateScore(model: PlayerEngineModel, input: DistanceDecision, distance: number) {
  const estimate = modelEstimate(model, input.skill, distance);
  const context = input.context ?? "training";
  const phase = learningPhaseFromEvidence({ attempts: estimate.attempts, performance: estimate.expected, confidence: estimate.confidence, context });
  const target = challengeTargetForPhase({ phase, objective: input.objective, context });
  const challengeFit = clamp(1 - Math.abs(estimate.expected - target) / 0.58);
  const weakness = clamp(1 - estimate.expected);
  const uncertainty = clamp(1 - estimate.confidence);
  const novelty = challengeNovelty(model, input.skill, distance);
  const spacing = spacingPriority(hoursSinceEngine(estimate.lastPlayedAt));
  const variation = distanceVariationScore({ skill: input.skill, current: distance, previous: input.previousDistance, phase });
  const mastery = estimate.expected >= 0.76 ? clamp((estimate.expected - 0.7) / 0.3) : estimate.mastery * 0.5;
  const representative = context === "game" ? 1 : context === "assessment" ? 0.86 : 0.62;

  const learning = challengeFit * 0.24 + weakness * 0.16 + uncertainty * 0.12 + mastery * 0.08 + novelty * 0.08 + variation * 0.16 + spacing * 0.1 + representative * 0.06;
  const fun = challengeFit * 0.38 + novelty * 0.22 + variation * 0.2 + mastery * 0.12 + representative * 0.08;
  let score = input.objective === "learning" ? learning : input.objective === "fun" ? fun : fun * 0.48 + learning * 0.52;

  if (typeof input.previousDistance === "number" && typeof input.previousPerformance === "number") {
    const targetDistance = adaptiveTargetAfterResult(input.skill, input.previousDistance, input.previousPerformance, input.min, input.max);
    const adaptationFit = clamp(1 - Math.abs(distance - targetDistance) / Math.max(1, maxStep(input.skill)));
    const adaptationWeight = context === "game" ? 0.18 : phase === "acquisition" ? 0.45 : phase === "stabilization" ? 0.34 : 0.24;
    score = score * (1 - adaptationWeight) + adaptationFit * adaptationWeight;
  }
  return score;
}

function weightedTopPick(items: Array<{ distance: number; score: number }>) {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, Math.min(5, sorted.length));
  if (!top.length) return 0;
  const floor = Math.max(0.03, top[top.length - 1].score * 0.35);
  const weights = top.map((item) => Math.max(floor, item.score ** 2));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return top[i].distance;
  }
  return top[0].distance;
}

/**
 * Väljer nästa svårighetsnivå. Resultat från föregående försök får stor vikt,
 * men historik, mastery, svagheter, osäkerhet och variation påverkar också.
 */
export function selectNextEngineDistance(input: DistanceDecision) {
  const min = Math.min(input.min, input.max);
  const max = Math.max(input.min, input.max);
  const model = loadPlayerEngineModel();
  const baseCandidates = input.allowedDistances?.length
    ? input.allowedDistances
        .map((value) => round(value))
        .filter((value) => value >= min && value <= max)
    : Array.from({ length: max - min + 1 }, (_, index) => min + index);

  let candidates = [...new Set(baseCandidates)];
  const context = input.context ?? "training";
  if (typeof input.previousDistance === "number") {
    if (context === "game") {
      const minGap = meaningfulDistanceGap(input.skill);
      const varied = candidates.filter((value) => Math.abs(value - input.previousDistance!) >= minGap);
      if (varied.length) candidates = varied;
    } else {
      const previousEstimate = modelEstimate(model, input.skill, input.previousDistance);
      const phase = learningPhaseFromEvidence({ attempts: previousEstimate.attempts, performance: previousEstimate.expected, confidence: previousEstimate.confidence, context });
      const step = maxStep(input.skill) * (phase === "stabilization" ? 2 : 1);
      const nearby = candidates.filter((value) => Math.abs(value - input.previousDistance!) <= step);
      if (nearby.length) candidates = nearby;
    }
  }

  if (context !== "game" && typeof input.previousDistance === "number" && typeof input.previousPerformance === "number") {
    const p = clamp(input.previousPerformance);
    if (p <= 0.3) {
      const easier = candidates.filter((value) => value <= input.previousDistance!);
      if (easier.length) candidates = easier;
    }
    if (p >= 0.76) {
      const harder = candidates.filter((value) => value >= input.previousDistance! - 1);
      if (harder.length) candidates = harder;
    }
  }

  const scored = candidates.map((distance) => ({
    distance,
    score: candidateScore(model, { ...input, min, max }, distance),
  }));
  return weightedTopPick(scored) || min;
}

/**
 * Bygger en historikstyrd sekvens när hela listan måste skapas innan spelet.
 * När ett spelläge kan välja challenge efter varje slag ska selectNextEngineDistance
 * användas direkt så föregående resultat kan påverka nästa val.
 */
export function buildEngineDistanceSequence(
  skill: EngineSkill,
  length: number,
  min: number,
  max: number,
  objective: EngineObjective = "balanced",
) {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const previousDistance = out[i - 1];
    out.push(
      selectNextEngineDistance({
        skill,
        objective,
        min,
        max,
        previousDistance,
      }),
    );
  }
  return out;
}

function skillLearningNeed(model: PlayerEngineModel, skill: EngineSkill) {
  const global = model.buckets[`${skill}:global`];
  if (!global) return 0.78;
  const weakness = 1 - global.performance;
  const uncertainty = 1 - global.confidence;
  const spacing = spacingPriority(hoursSinceEngine(global.lastPlayedAt));
  const masteryTransfer = global.performance >= 0.78 ? global.performance * 0.35 : 0;
  return clamp(weakness * 0.38 + uncertainty * 0.2 + spacing * 0.28 + masteryTransfer * 0.14);
}

function dayNoise(id: string) {
  const day = new Date().toISOString().slice(0, 10);
  const text = `${day}:${id}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

/**
 * Osynlig ranking av aktiviteter. I learning-läge väger behov tyngst; i fun-
 * läge återkommande aktivitet/variation tyngre. Ordningen är stabil samma dag
 * så UI:t inte hoppar runt mellan renderingar.
 */
export function rankEngineActivities<T extends RankedActivity>(
  activities: T[],
  objective: EngineObjective = "balanced",
): T[] {
  const model = loadPlayerEngineModel();
  return [...activities]
    .map((item, index) => {
      const profile = model.activities[item.id];
      const affinity = profile?.affinity ?? 0.42;
      const learningNeed = skillLearningNeed(model, item.engineSkill);
      const behavior = getBehaviorRecommendationScore(item.id);
      const dayVariation = 0.85 + dayNoise(item.id) * 0.15;
      const funScore =
      behavior.score * 0.34 +
      behavior.affinity * 0.22 +
      behavior.novelty * 0.1 +
      behavior.exploration * 0.08 +
      behavior.spacing * 0.08 +
      behavior.engagementFit * 0.08 +
      affinity * 0.07 +
      dayVariation * 0.03;
    const learningScore =
      learningNeed * 0.52 +
      behavior.spacing * 0.14 +
      behavior.exploration * 0.1 +
      behavior.completionRate * 0.08 +
      behavior.novelty * 0.05 +
      behavior.engagementFit * 0.05 +
      behavior.score * 0.03 +
      dayVariation * 0.03;
      const score = objective === "fun"
        ? funScore
        : objective === "learning"
          ? learningScore
          : funScore * 0.45 + learningScore * 0.55;
      return { item, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

/** Testhjälp och felsäker reset; används inte som användarfunktion. */
export function __resetPlayerEngineForTests() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
