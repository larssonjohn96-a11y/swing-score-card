import type { PuttingShotPayload, ShotEvent, ShotRecordedEvent, ShotSession } from "./types";
import { loadLocalShotEvents, loadLocalShotSessions } from "./store";

export const PUTTING_ELIGIBILITY_VERSION = 1;
export const PUTTING_SCORING_VERSION = 1;
export const PUTTING_RECENT_SAMPLE = 200;

export type PuttingBucket = {
  distance_m: number;
  label: string;
  attempts: number;
  made: number;
  make_rate: number;
  rating: number;
};

export type PuttingProfile = {
  as_of: string;
  eligibility_version: number;
  scoring_version: number;
  eligible_attempts: number;
  rating: number | null;
  confidence: number;
  stale_days: number | null;
  buckets: PuttingBucket[];
};

function parseTime(value: string) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`Invalid ISO timestamp: ${value}`);
  return ms;
}

export function canonicalPuttingDistance(distanceM: number) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) throw new Error("Putting distance must be positive");
  return Math.round(distanceM * 10) / 10;
}

export function canonicalPuttingBucket(distanceM: number) {
  const distance = canonicalPuttingDistance(distanceM);
  return `${distance.toFixed(1)}m`;
}

export function puttingRatingContribution(event: ShotRecordedEvent) {
  if (event.payload.kind !== "putting") return 0;
  return event.payload.first_putt_holed ? 1 : 0;
}

export function isPuttingHcpEligible(event: ShotRecordedEvent, session?: ShotSession) {
  if (event.skill !== "putting" || event.payload.kind !== "putting") return false;
  if (!session || session.status !== "completed") return false;
  if (event.context.hcp_eligible === false) return false;
  if (event.context.independent_attempt === false) return false;
  if (event.context.progression_format === true) return false;
  return true;
}

function uniqueEvents(events: ShotEvent[]) {
  const map = new Map<string, ShotEvent>();
  for (const event of events) if (!map.has(event.event_id)) map.set(event.event_id, event);
  return [...map.values()];
}

export function replayPuttingProfile(events: ShotEvent[], sessions: ShotSession[], asOf: string): PuttingProfile {
  const asOfMs = parseTime(asOf);
  const sessionMap = new Map(sessions.map((session) => [session.session_id, session]));
  const all = uniqueEvents(events).filter((event) => parseTime(event.played_at) <= asOfMs);
  const voided = new Set(all.filter((event) => event.event_type === "shot_voided").map((event) => event.target_event_id));
  const eligible = all
    .filter((event): event is ShotRecordedEvent => event.event_type === "shot_recorded")
    .filter((event) => !voided.has(event.event_id))
    .filter((event) => isPuttingHcpEligible(event, sessionMap.get(event.session_id)))
    .sort((a, b) => parseTime(a.played_at) - parseTime(b.played_at) || a.event_id.localeCompare(b.event_id))
    .slice(-PUTTING_RECENT_SAMPLE);

  const grouped = new Map<number, { attempts: number; made: number }>();
  for (const event of eligible) {
    const payload = event.payload as PuttingShotPayload;
    const distance = canonicalPuttingDistance(payload.distance_m);
    const row = grouped.get(distance) ?? { attempts: 0, made: 0 };
    row.attempts += 1;
    row.made += puttingRatingContribution(event);
    grouped.set(distance, row);
  }

  const buckets = [...grouped.entries()].map(([distance_m, row]) => {
    const makeRate = row.attempts ? row.made / row.attempts : 0;
    return {
      distance_m,
      label: canonicalPuttingBucket(distance_m),
      attempts: row.attempts,
      made: row.made,
      make_rate: makeRate,
      rating: makeRate * 100,
    };
  }).sort((a, b) => a.distance_m - b.distance_m);

  const made = eligible.reduce((sum, event) => sum + puttingRatingContribution(event), 0);
  const rating = eligible.length ? (made / eligible.length) * 100 : null;
  const latestMs = eligible.length ? Math.max(...eligible.map((event) => parseTime(event.played_at))) : null;
  const staleDays = latestMs === null ? null : Math.max(0, (asOfMs - latestMs) / 86_400_000);
  const sampleConfidence = Math.min(1, eligible.length / 100);
  const freshness = staleDays === null ? 0 : staleDays <= 30 ? 1 : staleDays <= 180 ? 1 - ((staleDays - 30) / 150) * 0.4 : 0.6;

  return {
    as_of: asOf,
    eligibility_version: PUTTING_ELIGIBILITY_VERSION,
    scoring_version: PUTTING_SCORING_VERSION,
    eligible_attempts: eligible.length,
    rating,
    confidence: sampleConfidence * freshness,
    stale_days: staleDays,
    buckets,
  };
}

/** UI/service boundary: components can read the profile, never raw events. */
export function getLocalPuttingProfile(asOf: string) {
  return replayPuttingProfile(loadLocalShotEvents(), loadLocalShotSessions(), asOf);
}
