import { describe, expect, it } from "vitest";
import { getShotSyncStatus, loadLocalShotEvents, persistShotEventLocally, type ShotStorage } from "./store";
import { canonicalPuttingBucket, puttingRatingContribution, replayPuttingProfile } from "./putting";
import { recordedShotEventId, SHOT_SCHEMA_VERSION, type ShotRecordedEvent, type ShotSession, type ShotVoidedEvent } from "./types";

class MemoryStorage implements ShotStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const asOf = "2026-09-15T12:00:00.000Z";

function session(id: string, source = "clock_putting"): ShotSession {
  return {
    session_id: id,
    schema_version: 1,
    user_id: null,
    source,
    activity_type: "test",
    started_at: "2026-09-14T10:00:00.000Z",
    completed_at: "2026-09-14T10:05:00.000Z",
    status: "completed",
    metadata: {},
  };
}

function putt(id: string, source: string, holed: boolean, context: ShotRecordedEvent["context"] = { independent_attempt: true }): ShotRecordedEvent {
  return {
    event_id: recordedShotEventId(id, 1),
    event_type: "shot_recorded",
    schema_version: SHOT_SCHEMA_VERSION,
    user_id: null,
    session_id: id,
    sequence: 1,
    played_at: "2026-09-14T10:01:00.000Z",
    recorded_at: "2026-09-14T10:06:00.000Z",
    source,
    activity_type: "test",
    skill: "putting",
    payload: { kind: "putting", distance_m: 1, first_putt_holed: holed },
    context,
  };
}

describe("SG4 shot bank putting v1", () => {
  it("gives identical canonical bucket and contribution across eligible sources", () => {
    const clock = putt("a", "clock_putting", true);
    const hcp = putt("b", "short_putting_test", true);
    expect(canonicalPuttingBucket(clock.payload.kind === "putting" ? clock.payload.distance_m : 0)).toBe("1.0m");
    expect(canonicalPuttingBucket(hcp.payload.kind === "putting" ? hcp.payload.distance_m : 0)).toBe("1.0m");
    expect(puttingRatingContribution(clock)).toBe(puttingRatingContribution(hcp));
    const profile = replayPuttingProfile([clock, hcp], [session("a"), session("b", "short_putting_test")], asOf);
    expect(profile.buckets[0]).toMatchObject({ label: "1.0m", attempts: 2, made: 2, rating: 100 });
  });

  it("stores Putting Streak but gives it zero HCP/rating contribution", () => {
    const storage = new MemoryStorage();
    const streak = putt("streak", "putting_streak", true, { independent_attempt: false, progression_format: true, hcp_eligible: false });
    persistShotEventLocally(streak, storage);
    expect(loadLocalShotEvents(storage)).toHaveLength(1);
    const profile = replayPuttingProfile([streak], [session("streak", "putting_streak")], asOf);
    expect(profile.eligible_attempts).toBe(0);
    expect(profile.rating).toBeNull();
  });

  it("void replay equals history where the invalid shot never existed", () => {
    const bad = putt("bad", "clock_putting", false);
    const good = putt("good", "short_putting_test", true);
    const voidEvent: ShotVoidedEvent = {
      event_id: "bad:shot:1:void:1",
      event_type: "shot_voided",
      schema_version: 1,
      user_id: null,
      session_id: "bad",
      sequence: 2,
      played_at: "2026-09-14T10:02:00.000Z",
      recorded_at: "2026-09-14T10:07:00.000Z",
      source: "correction",
      activity_type: "test",
      skill: "putting",
      payload: { kind: "void" },
      context: {},
      target_event_id: bad.event_id,
      reason: "mistyped",
    };
    const replayed = replayPuttingProfile([bad, good, voidEvent], [session("bad"), session("good")], asOf);
    const expected = replayPuttingProfile([good], [session("good")], asOf);
    expect(replayed).toEqual(expected);
  });

  it("is exactly deterministic for the same events and explicit asOf", () => {
    const event = putt("det", "clock_putting", true);
    const sessions = [session("det")];
    expect(replayPuttingProfile([event], sessions, asOf)).toEqual(replayPuttingProfile([event], sessions, asOf));
  });

  it("does not double-count a duplicate event_id", () => {
    const event = putt("dup", "clock_putting", true);
    const profile = replayPuttingProfile([event, { ...event }], [session("dup")], asOf);
    expect(profile.eligible_attempts).toBe(1);
  });

  it("keeps pending events durable across a storage reload", () => {
    const storage = new MemoryStorage();
    const event = putt("offline", "clock_putting", true);
    persistShotEventLocally(event, storage);
    expect(getShotSyncStatus(storage)).toMatchObject({ pending: 1, state: "pending" });
    expect(loadLocalShotEvents(storage).map((row) => row.event_id)).toEqual([event.event_id]);
  });
});
