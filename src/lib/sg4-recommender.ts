export type RecommendationSignal =
  | "impression"
  | "open"
  | "engage"
  | "complete"
  | "replay"
  | "abandon";

export type ActivityBehaviorProfile = {
  impressions: number;
  opens: number;
  engagements: number;
  completions: number;
  replays: number;
  abandons: number;
  valueEma: number;
  lastShownAt?: string;
  lastOpenedAt?: string;
  lastCompletedAt?: string;
};

type PendingActivity = {
  id: string;
  openedAt: number;
};

type RecommendationModel = {
  version: 1;
  activities: Record<string, ActivityBehaviorProfile>;
  recentActivityIds: string[];
  pending?: PendingActivity;
  sessionStartedAt: number;
  lastEventAt: number;
  sessionEvents: number;
};

export type BehaviorRecommendationScore = {
  score: number;
  affinity: number;
  novelty: number;
  exploration: number;
  spacing: number;
  completionRate: number;
};

const STORAGE_KEY = "sg4-recommender-v1";
const SESSION_GAP_MS = 30 * 60 * 1000;
const IMPRESSION_DEDUPE_MS = 8 * 60 * 1000;
const REPLAY_WINDOW_MS = 72 * 60 * 60 * 1000;
const RECENT_LIMIT = 24;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function hasStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function emptyProfile(): ActivityBehaviorProfile {
  return {
    impressions: 0,
    opens: 0,
    engagements: 0,
    completions: 0,
    replays: 0,
    abandons: 0,
    valueEma: 0.5,
  };
}

function emptyModel(now = Date.now()): RecommendationModel {
  return {
    version: 1,
    activities: {},
    recentActivityIds: [],
    sessionStartedAt: now,
    lastEventAt: now,
    sessionEvents: 0,
  };
}

function loadModel(): RecommendationModel {
  const now = Date.now();
  if (!hasStorage()) return emptyModel(now);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<RecommendationModel> | null;
    if (!parsed || parsed.version !== 1) return emptyModel(now);
    const sessionExpired = !parsed.lastEventAt || now - parsed.lastEventAt > SESSION_GAP_MS;
    return {
      ...emptyModel(now),
      ...parsed,
      activities: parsed.activities && typeof parsed.activities === "object" ? parsed.activities : {},
      recentActivityIds: Array.isArray(parsed.recentActivityIds) ? parsed.recentActivityIds.slice(-RECENT_LIMIT) : [],
      sessionStartedAt: sessionExpired ? now : (parsed.sessionStartedAt ?? now),
      sessionEvents: sessionExpired ? 0 : (parsed.sessionEvents ?? 0),
      pending: sessionExpired ? undefined : parsed.pending,
      lastEventAt: now,
    };
  } catch {
    return emptyModel(now);
  }
}

function saveModel(model: RecommendationModel) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  } catch {
    // Recommendation data must never block the app.
  }
}

function signalValue(signal: RecommendationSignal) {
  if (signal === "open") return 0.62;
  if (signal === "engage") return 0.72;
  if (signal === "complete") return 0.94;
  if (signal === "replay") return 1;
  if (signal === "abandon") return 0.12;
  return 0.5;
}

function applySignal(profile: ActivityBehaviorProfile, signal: RecommendationSignal, now: number) {
  const next = { ...profile };
  if (signal === "impression") {
    next.impressions += 1;
    next.lastShownAt = new Date(now).toISOString();
    return next;
  }
  if (signal === "open") {
    next.opens += 1;
    next.lastOpenedAt = new Date(now).toISOString();
  } else if (signal === "engage") {
    next.engagements += 1;
  } else if (signal === "complete") {
    next.completions += 1;
    next.lastCompletedAt = new Date(now).toISOString();
  } else if (signal === "replay") {
    next.replays += 1;
    next.lastCompletedAt = new Date(now).toISOString();
  } else if (signal === "abandon") {
    next.abandons += 1;
  }
  const alpha = signal === "replay" || signal === "complete" ? 0.34 : signal === "abandon" ? 0.3 : 0.2;
  next.valueEma = clamp(next.valueEma * (1 - alpha) + signalValue(signal) * alpha);
  return next;
}

function maybeMarkPendingAbandon(model: RecommendationModel, nextActivityId?: string) {
  if (!model.pending) return;
  if (nextActivityId && model.pending.id === nextActivityId) return;
  const profile = model.activities[model.pending.id] ?? emptyProfile();
  model.activities[model.pending.id] = applySignal(profile, "abandon", Date.now());
  model.pending = undefined;
}

export function recordRecommendationSignal(activityId: string, signal: RecommendationSignal) {
  if (!activityId || !hasStorage()) return;
  const now = Date.now();
  const model = loadModel();

  if (signal === "open") maybeMarkPendingAbandon(model, activityId);

  const current = model.activities[activityId] ?? emptyProfile();
  if (signal === "impression" && current.lastShownAt) {
    const lastShown = Date.parse(current.lastShownAt);
    if (Number.isFinite(lastShown) && now - lastShown < IMPRESSION_DEDUPE_MS) return;
  }

  const wasRecentCompletion = current.lastCompletedAt
    ? now - Date.parse(current.lastCompletedAt) <= REPLAY_WINDOW_MS
    : false;
  model.activities[activityId] = applySignal(current, signal, now);

  if (signal === "open") {
    model.pending = { id: activityId, openedAt: now };
  }
  if (signal === "complete") {
    if (model.pending?.id === activityId) model.pending = undefined;
    if (wasRecentCompletion) {
      model.activities[activityId] = applySignal(model.activities[activityId], "replay", now);
    }
  }
  if (signal === "replay" && model.pending?.id === activityId) model.pending = undefined;

  if (signal !== "impression") {
    model.recentActivityIds = [...model.recentActivityIds, activityId].slice(-RECENT_LIMIT);
  }
  model.sessionEvents += 1;
  model.lastEventAt = now;
  saveModel(model);
}

export function recordRecommendationImpressions(activityIds: string[]) {
  activityIds.forEach((id) => recordRecommendationSignal(id, "impression"));
}

export function recordRecommendationOpen(activityId: string) {
  recordRecommendationSignal(activityId, "open");
}

export function recordRecommendationCompletion(activityId: string) {
  recordRecommendationSignal(activityId, "complete");
}

function hoursSince(iso?: string) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - time) / 3_600_000);
}

/**
 * Pure scoring helper. Priors keep cold-start sane; uncertainty gives new or
 * under-observed activities an exploration bonus instead of burying them.
 */
export function scoreBehaviorProfile(
  profile: ActivityBehaviorProfile,
  recentMatches = 0,
): BehaviorRecommendationScore {
  const impressionPrior = 5;
  const openPrior = 2;
  const completionPrior = 2;
  const smoothedOpenRate = (profile.opens + openPrior) / (profile.impressions + impressionPrior);
  const smoothedCompletionRate = (profile.completions + profile.replays + completionPrior) /
    (profile.opens + completionPrior * 2);
  const repeatRate = (profile.replays + 0.5) / (profile.completions + 2);
  const abandonRate = (profile.abandons + 0.5) / (profile.opens + 2);

  const affinity = clamp(
    profile.valueEma * 0.42 +
    smoothedOpenRate * 0.18 +
    smoothedCompletionRate * 0.26 +
    repeatRate * 0.14 -
    abandonRate * 0.18,
  );

  const observations = profile.impressions + profile.opens + profile.completions + profile.engagements;
  const exploration = clamp(1 / Math.sqrt(1 + observations / 3), 0.08, 1);
  const recentCompletionHours = hoursSince(profile.lastCompletedAt);
  const spacing = Number.isFinite(recentCompletionHours)
    ? clamp(recentCompletionHours / 48, 0.12, 1)
    : 1;
  const novelty = clamp((1 - recentMatches * 0.24) * (0.7 + spacing * 0.3), 0.1, 1);

  return {
  // Keep the feed engaging without becoming a pure click/replay echo chamber.
  // Spacing and exploration preserve retrieval, novelty and transfer opportunities.
  score: clamp(affinity * 0.46 + novelty * 0.18 + exploration * 0.14 + spacing * 0.22),
  affinity,
  novelty,
  exploration,
  spacing,
  completionRate: clamp(smoothedCompletionRate),
};
}

export function getBehaviorRecommendationScore(activityId: string): BehaviorRecommendationScore {
  const model = loadModel();
  const profile = model.activities[activityId] ?? emptyProfile();
  const recentMatches = model.recentActivityIds.slice(-8).filter((id) => id === activityId).length;
  return scoreBehaviorProfile(profile, recentMatches);
}

export function getRecommendationSessionDepth() {
  return loadModel().sessionEvents;
}

export function __resetRecommenderForTests() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
