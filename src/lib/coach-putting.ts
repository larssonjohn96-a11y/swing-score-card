import { getLocalPuttingProfile, recordPuttingSession } from "@/lib/shot-bank";
import { loadPlayerEngineModel, puttingPerformanceFromStrokes, recordEngineOutcome } from "@/lib/sg4-engine";

export type CoachId = "alma" | "axel" | "leo";

export type CoachPuttingAttempt = {
  id: string;
  coachSessionId: string;
  playedAt: string;
  distance: number;
  strokes: 1 | 2 | 3 | 4;
};

export type CoachQuestion = {
  topic: string;
  prompt: string;
  options: string[];
  correct: number;
  feedback: string;
};

type KnowledgeEvent = {
  id: string;
  at: string;
  topic: string;
  kind: "shown" | "answered";
  correct?: boolean;
};

type LearningEntry = {
  id: string;
  topic: string;
  condition: (distance: number, strokes: number) => boolean;
  text: string;
};

const KNOWLEDGE_KEY = "sg4-coach-knowledge-events-v1";
const SELECTED_COACH_KEY = "sg4-selected-coach-v1";

export const COACHES = [
  { id: "alma" as const, name: "Alma", style: "Lugn PGA-coach", emoji: "👩🏽‍🦱", description: "Tydlig, varm och selektiv. Säger något när det faktiskt hjälper." },
  { id: "axel" as const, name: "Axel", style: "Rak & krävande", emoji: "🧔🏻", description: "Kort och konkret. Mer direkt när samma misstag upprepas." },
  { id: "leo" as const, name: "Leo", style: "Peppande coach", emoji: "🧑🏼‍🦰", description: "Mer energi och beröm, men samma spelmotor och samma krav." },
] as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* best effort */ }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadSelectedCoach(): CoachId {
  const value = readJson<CoachId>(SELECTED_COACH_KEY, "alma");
  return COACHES.some((coach) => coach.id === value) ? value : "alma";
}

export function saveSelectedCoach(coachId: CoachId) {
  writeJson(SELECTED_COACH_KEY, coachId);
}

function knowledgeEvents() {
  return readJson<KnowledgeEvent[]>(KNOWLEDGE_KEY, []);
}

function recordKnowledgeEvent(topic: string, kind: KnowledgeEvent["kind"], correct?: boolean) {
  const next: KnowledgeEvent = { id: uid("coach-knowledge"), at: new Date().toISOString(), topic, kind, ...(kind === "answered" ? { correct: Boolean(correct) } : {}) };
  writeJson(KNOWLEDGE_KEY, [...knowledgeEvents(), next].slice(-1200));
}

export function recordCoachQuestionAnswer(topic: string, correct: boolean) {
  recordKnowledgeEvent(topic, "answered", correct);
}

type DistanceZone = "short" | "medium" | "long";

const DISTANCE_ZONES: Array<{ id: DistanceZone; base: number; distances: number[]; modelBuckets: string[] }> = [
  { id: "short", base: 0.30, distances: [0.5, 1, 1.5, 2, 2.5, 3], modelBuckets: ["0-2", "3-5"] },
  { id: "medium", base: 0.40, distances: [4, 5, 6, 7], modelBuckets: ["3-5", "6-8"] },
  { id: "long", base: 0.30, distances: [8, 9, 10, 11, 12, 13, 14, 15], modelBuckets: ["6-8", "9-14", "15+"] },
];

function zoneForDistance(distance: number): DistanceZone {
  if (distance <= 3) return "short";
  if (distance <= 7) return "medium";
  return "long";
}

function zoneWeakness(model: ReturnType<typeof loadPlayerEngineModel>, modelBuckets: string[]) {
  const known = modelBuckets.map((id) => model.buckets[`putting:${id}`]).filter((bucket): bucket is NonNullable<typeof bucket> => Boolean(bucket));
  if (!known.length) return 0;
  const confidenceSum = known.reduce((sum, bucket) => sum + Math.max(0.05, bucket.confidence), 0);
  const performance = known.reduce((sum, bucket) => sum + bucket.performance * Math.max(0.05, bucket.confidence), 0) / confidenceSum;
  return Math.max(0, Math.min(0.25, 0.72 - performance));
}

function pickDistance(distances: number[], previous?: number) {
  let candidates = distances;
  if (previous !== undefined) {
    const varied = distances.filter((value) => value !== previous && Math.abs(value - previous) >= 1);
    if (varied.length) candidates = varied;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function nextCoachPuttingDistance(previous?: number) {
  const model = loadPlayerEngineModel();
  const weighted = DISTANCE_ZONES.map((zone) => {
    const weakness = zoneWeakness(model, zone.modelBuckets);
    const weaknessBoost = 1 + Math.min(0.30, weakness * 1.2);
    const repeatPenalty = previous !== undefined && zoneForDistance(previous) === zone.id ? 0.72 : 1;
    return { ...zone, weight: zone.base * weaknessBoost * repeatPenalty };
  });
  const total = weighted.reduce((sum, zone) => sum + zone.weight, 0);
  let roll = Math.random() * total;
  let selected = weighted[0];
  for (const zone of weighted) {
    roll -= zone.weight;
    if (roll <= 0) { selected = zone; break; }
  }
  return pickDistance(selected.distances, previous);
}

export function recordCoachPuttingAttempt(
  coachSessionId: string,
  sequence: number,
  distance: number,
  strokes: 1 | 2 | 3 | 4,
  coachId: CoachId,
): CoachPuttingAttempt {
  const playedAt = new Date().toISOString();
  const attemptSessionId = `${coachSessionId}:putt:${sequence}`;
  recordPuttingSession({
    session_id: attemptSessionId,
    source: "coach-putting",
    activity_type: "game",
    played_at: playedAt,
    attempts: [{
      distance_m: distance,
      first_putt_holed: strokes === 1,
      strokes_to_hole: strokes,
      context: { hcp_eligible: true, independent_attempt: true, progression_format: false, format_id: "coach-putting-infinity-v1", coach_id: coachId, coach_session_id: coachSessionId },
    }],
    session_metadata: { coach_session_id: coachSessionId, coach_id: coachId, infinity_mode: true },
  });
  recordEngineOutcome({ skill: "putting", distance, performance: puttingPerformanceFromStrokes(strokes), context: "game", activityId: "coach-putting" });
  return { id: `${attemptSessionId}:shot:1`, coachSessionId, playedAt, distance, strokes };
}

const LEARNING_LIBRARY: LearningEntry[] = [
  { id: "lag-bad", topic: "lag-goal", condition: (d, s) => d >= 10 && s >= 3, text: "Lite för dyrt där. Nästa långputt vill jag att du tänker stoppunkt först – lämna dig en enkel andraputt." },
  { id: "lag-good", topic: "lag-goal", condition: (d, s) => d >= 10 && s <= 2, text: "Bra fartkontroll. Från den här längden är två puttar precis det vi vill ha." },
  { id: "short-miss", topic: "start-line", condition: (d, s) => d <= 2 && s >= 2, text: "På nästa korta: välj startpunkt och lita på den. Ingen korrigering över bollen." },
  { id: "short-make", topic: "short-routine", condition: (d, s) => d <= 2 && s === 1, text: "Bra. Behåll exakt samma rutin på nästa korta." },
  { id: "mid-bad", topic: "pace", condition: (d, s) => d >= 4 && d <= 8 && s >= 3, text: "Farten kostade där. På nästa mellanputt: bestäm först var du vill att bollen ska stanna." },
  { id: "mid-make", topic: "line-speed", condition: (d, s) => d >= 3 && d <= 8 && s === 1, text: "Snyggt. Den där kombinationen av linje och fart vill vi se igen." },
  { id: "long-focus", topic: "external-focus", condition: (d) => d >= 12, text: "Lång putt nu. Tänk mer på var bollen ska stanna än på själva stroken." },
  { id: "green-read", topic: "green-reading", condition: (d) => d >= 5 && d <= 12, text: "Läs den stora lutningen först, välj sedan startlinje och fart. Håll beslutet enkelt." },
  { id: "quiet-eyes", topic: "visual-routine", condition: (d, s) => d <= 5 && s >= 2, text: "Stå kvar i beslutet. Blicken stilla, en tydlig startpunkt och kör." },
  { id: "reset", topic: "feedback", condition: (_d, s) => s >= 3, text: "Släpp den. Ändra en sak till nästa putt, inte tre." },
  { id: "variation", topic: "transfer", condition: (d) => d >= 6, text: "Bra att längden ändras. Behandla varje putt som en ny putt på banan." },
  { id: "patterns", topic: "patterns", condition: (d) => d >= 8, text: "Jag tittar på mönstret, inte en enskild miss. Fortsätt ge mig rena resultat." },
];

function topicExposure(topic: string) {
  return knowledgeEvents().filter((event) => event.kind === "shown" && event.topic === topic).length;
}

function praise(coachId: CoachId) {
  if (coachId === "axel") return "Bra. Samma beslut nästa gång.";
  if (coachId === "leo") return "Snyggt! Behåll den känslan till nästa.";
  return "Bra. Behåll samma lugna rutin.";
}

export function coachPuttingComment(distance: number, strokes: number, coachId: CoachId, shotNumber: number) {
  if (shotNumber < 2) return null;
  const eligible = LEARNING_LIBRARY.filter((entry) => entry.condition(distance, strokes)).sort((a, b) => topicExposure(a.topic) - topicExposure(b.topic));
  if (!eligible.length) return strokes === 1 && shotNumber % 4 === 0 ? praise(coachId) : null;
  if (strokes === 2 && shotNumber % 3 !== 0) return null;
  const fresh = eligible.filter((entry) => topicExposure(entry.topic) < 3);
  const pool = fresh.length ? fresh : eligible.slice(0, 2);
  const entry = pool[Math.floor(Math.random() * pool.length)];
  recordKnowledgeEvent(entry.topic, "shown");
  return entry.text;
}

export function maybeCoachPuttingQuestion(distance: number, shotNumber: number): CoachQuestion | null {
  if (shotNumber < 5 || shotNumber % 7 !== 0) return null;
  if (distance >= 10) return { topic: "lag-goal", prompt: "Vad är huvudmålet från den här längden?", options: ["Försöka håla till varje pris", "Lämna en enkel andraputt"], correct: 1, feedback: "Rätt fokus är att minimera treputt. Hålar du är det bonus." };
  if (distance <= 2) return { topic: "start-line", prompt: "Vad blir extra viktigt på en kortputt?", options: ["Startlinjen", "Maximal fart"], correct: 0, feedback: "På kortputt blir små fel i startlinjen snabbt avgörande." };
  return null;
}

export function summarizeCoachPutting(attempts: CoachPuttingAttempt[]) {
  if (!attempts.length) return { count: 0, avg: 0, onePuttPct: 0, threePuttPct: 0 };
  const total = attempts.reduce((sum, attempt) => sum + attempt.strokes, 0);
  const one = attempts.filter((attempt) => attempt.strokes === 1).length;
  const threePlus = attempts.filter((attempt) => attempt.strokes >= 3).length;
  return { count: attempts.length, avg: Math.round((total / attempts.length) * 100) / 100, onePuttPct: Math.round((one / attempts.length) * 100), threePuttPct: Math.round((threePlus / attempts.length) * 100) };
}

export function localPuttingDataStatus() {
  const profile = getLocalPuttingProfile(new Date().toISOString());
  return { attempts: profile.eligible_attempts, confidence: profile.confidence };
}
