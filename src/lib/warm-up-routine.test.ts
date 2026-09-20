import { describe, it, expect, vi } from "vitest";
vi.mock("./shot-bank/store", () => ({
  loadLocalShotEvents: () => [],
  loadLocalShotSessions: () => [],
}));
import {
  routineDefaults,
  emptyRoutine,
  buildVisits,
  startRoutine,
  completeVisit,
  advanceExercise,
  extendVisit,
  finishRoutine,
  goToVisit,
  parseRoutine,
  applyRoutineChange,
  saveRoutineFeedback,
  routineFollowupDue,
  type RoutineSession,
} from "./warm-up-routine";
import {
  buildWarmProfile,
  puttingObservations,
  readWarmProfile,
  testObservations,
  type WarmObservation,
} from "./warm-up-profile";
import { defaults, emptyWarm, startWarm, finishStation } from "./warm-up";
import type { ShotRecordedEvent, ShotSession } from "./shot-bank/types";
import type { TestSession } from "./sessions/types";
const now = Date.UTC(2026, 8, 20, 12),
  minute = 60000;
describe("warm-up exercise flow and routine memory", () => {
  it("has a physical start, exact putting tasks and a first-tee rehearsal without score input", () => {
    const visits = buildVisits(routineDefaults());
    expect(visits[0].kind).toBe("body");
    expect(
      visits.find((v) => v.kind === "putt")?.exercises.map((e) => [e.distance, e.count]),
    ).toEqual([
      [8, 3],
      [12, 3],
      [10, 3],
      [1, 3],
    ]);
    expect(visits.find((v) => v.kind === "range")?.exercises.at(-1)?.id).toBe("first-tee");
    expect(visits.at(-1)?.kind).toBe("tee");
    expect(visits.reduce((n, v) => n + v.minutes, 5)).toBeCloseTo(30);
  });
  it("keeps two putt visits distinct with different distances, progress and ratings after reload", () => {
    const p = applyRoutineChange(routineDefaults(), "two-putts");
    let s = startRoutine(p, {}, now, "split");
    s = completeVisit(s, now + minute);
    const first = s.visits[s.current];
    expect(first.id).toBe("putt-0");
    expect(first.exercises.map((e) => e.distance)).toEqual([8, 12]);
    s = completeVisit(s, now + 3 * minute, "good");
    const secondIndex = s.visits.findIndex((v) => v.id === "putt-1");
    s = goToVisit(s, secondIndex, now + 5 * minute);
    expect(s.visits[s.current].exercises.map((e) => e.distance)).toEqual([10, 1]);
    const saved = parseRoutine(JSON.stringify({ ...emptyRoutine(), active: s }));
    expect(saved.active?.current).toBe(secondIndex);
    expect(saved.active?.done).toContain("putt-0");
    expect(saved.active?.done).not.toContain("putt-1");
    expect(saved.active?.ratings["putt-0"]).toBe("good");
  });
  it("advances batches, persists the current exercise, then shows the station check", () => {
    let s = startRoutine({ ...routineDefaults(), body: false, order: ["putt"] }, {}, now, "a");
    s = advanceExercise(s, now);
    expect(s.exercise).toBe(1);
    expect(s.phase).toBe("exercise");
    s = parseRoutine(JSON.stringify({ ...emptyRoutine(), active: s })).active!;
    s = advanceExercise(advanceExercise(advanceExercise(s, now), now), now);
    expect(s.phase).toBe("check");
    expect(s.done).toEqual([]);
    s = completeVisit(s, now + 10 * minute, "good");
    expect(s.visits[s.current].kind).toBe("tee");
    expect(advanceExercise(s, now + 11 * minute).finishedAt).toBe(now + 11 * minute);
  });
  it("snooze and early completion never move the tee time or use the protected margin", () => {
    const s = startRoutine(routineDefaults(), {}, now, "a", now + 35 * minute);
    const next = extendVisit(s, s.teeAt - s.reserve * minute - minute);
    expect(next.dueAt).toBe(s.teeAt - s.reserve * minute);
    expect(next.teeAt).toBe(s.teeAt);
    expect(completeVisit(s, now + minute).dueAt).toBeLessThanOrEqual(s.teeAt - s.reserve * minute);
  });
  it("reduces short routines to a useful station while preserving saved preferences", () => {
    const p = { ...routineDefaults(), minutes: 10 };
    const visits = buildVisits(p);
    expect(visits.map((v) => v.kind)).toEqual(["body", "putt", "tee"]);
    expect(p.order).toEqual(["range", "chip", "putt"]);
    expect(() => startRoutine(p, {}, now, "a", now - minute)).toThrow();
  });
  it("saves explicit routine feedback once and restores it for next time", () => {
    const session = finishRoutine(startRoutine(routineDefaults(), {}, now, "a"), now + minute);
    let state = { ...emptyRoutine(), history: [session] };
    state = saveRoutineFeedback(state, "a", "medium", "range-last");
    expect(state.prefs.order).toEqual(["chip", "putt", "range"]);
    expect(saveRoutineFeedback(state, "a", "good", "two-putts")).toEqual(state);
    expect(parseRoutine(JSON.stringify(state)).prefs.order).toEqual(state.prefs.order);
  });
  it("migrates existing preferences, active deadlines and finished history without duplication", () => {
    const old = startWarm(defaults(), now, "old");
    const history = finishStation(
      startWarm({ ...defaults(), order: ["putt"] }, now - 86400000, "done"),
      now - 86000000,
      "good",
    );
    const state = parseRoutine(JSON.stringify({ ...emptyWarm(), active: old, history: [history] }));
    expect(state.active?.teeAt).toBe(old.teeAt);
    expect(state.active?.dueAt).toBe(old.dueAt);
    expect(state.active?.visits[0].kind).toBe("range");
    expect(state.history[0].done).toEqual(["putt-0"]);
    expect(parseRoutine(JSON.stringify(state))).toEqual(state);
  });
  it("treats an early exit as skipped work, not completed work", () => {
    const s = finishRoutine(startRoutine(routineDefaults(), {}, now, "a"), now + minute);
    expect(s.done).toEqual([]);
    expect(new Set(s.skipped).size).toBe(s.visits.length);
    expect(completeVisit(s, now)).toEqual(s);
  });
  it("offers follow-up after nine or eighteen holes, respects deferral and ignores old sessions", () => {
    let s = startRoutine(
      { ...routineDefaults(), body: false, order: ["putt"], holes: 9 },
      {},
      now,
      "a",
    );
    s = completeVisit(s, now + minute, "good");
    s = advanceExercise(s, now + 2 * minute);
    const state = { ...emptyRoutine(), history: [s] };
    expect(routineFollowupDue(state, s.teeAt + 2 * 3600000)?.id).toBe("a");
    expect(
      routineFollowupDue({ ...state, history: [{ ...s, holes: 18 }] }, s.teeAt + 2 * 3600000),
    ).toBeNull();
    expect(
      routineFollowupDue(
        { ...state, history: [{ ...s, deferUntil: s.teeAt + 4 * 3600000 }] },
        s.teeAt + 3 * 3600000,
      ),
    ).toBeNull();
    expect(routineFollowupDue(state, s.teeAt + 49 * 3600000)).toBeNull();
  });
  it("recovers from invalid persisted indices and duplicate visit ids", () => {
    const s = startRoutine(routineDefaults(), {}, now, "a");
    expect(parseRoutine("broken")).toEqual(emptyRoutine());
    expect(
      parseRoutine(JSON.stringify({ ...emptyRoutine(), active: { ...s, exercise: 100 } })).active,
    ).toBeNull();
    expect(
      parseRoutine(
        JSON.stringify({ ...emptyRoutine(), active: { ...s, visits: [s.visits[0], s.visits[0]] } }),
      ).active,
    ).toBeNull();
  });
});
const sample = (kind: WarmObservation["kind"], d: number, values: number[]): WarmObservation[] =>
  values.map((value, i) => ({
    id: `${kind}-${d}-${i}`,
    session: `session-${i % 3}`,
    kind,
    distance: d,
    value,
    at: now - minute,
  }));
describe("warm-up personalization from actual results", () => {
  it("locates a supported increase in three-putts and retains distance variation", () => {
    const rows = [
      ...sample("putt", 8, [2, 2, 2, 2, 2, 2]),
      ...sample("putt", 12, [2, 3, 3, 3, 2, 3]),
    ];
    const profile = buildWarmProfile(rows, now);
    expect(profile.putt?.distance).toBe(12);
    expect(profile.putt?.samples).toBe(6);
    expect(profile.putt?.detail).toContain("högre");
    expect(
      buildVisits(routineDefaults(), profile)
        .find((v) => v.kind === "putt")
        ?.exercises.map((e) => e.distance),
    ).toEqual([10, 14, 12, 1]);
  });
  it("does not invent a breakpoint from stale, future, duplicated or single-session data", () => {
    const rows = sample("putt", 12, [3, 3, 3, 3, 3, 3]);
    expect(
      buildWarmProfile(
        rows.map((r) => ({ ...r, at: now - 91 * 86400000 })),
        now,
      ),
    ).toEqual({});
    expect(
      buildWarmProfile(
        rows.map((r) => ({ ...r, at: now + minute })),
        now,
      ),
    ).toEqual({});
    expect(
      buildWarmProfile(
        rows.map((r) => ({ ...r, session: "only-one" })),
        now,
      ),
    ).toEqual({});
    expect(buildWarmProfile(Array(9).fill(rows[0]), now)).toEqual({});
  });
  it("uses chip and relative approach dispersion with sufficient samples and supports opting out", () => {
    const profile = buildWarmProfile(
      [
        ...sample("chip", 18, [0, 0, 0, 0, 0, 1, 2, 3, 3]),
        ...sample("approach", 140, [30, 25, 20, 20, 25, 30]),
      ],
      now,
    );
    expect(profile.chip?.distance).toBe(18);
    expect(profile.approach?.distance).toBe(140);
    const visits = buildVisits({ ...routineDefaults(), useStats: false }, profile);
    expect(visits.every((v) => !v.focus)).toBe(true);
    expect(visits.find((v) => v.kind === "chip")?.exercises.map((e) => e.distance)).toEqual([
      8, 14,
    ]);
  });
  it("uses explicitly chosen par-3 distances rather than pretending to know the course", () => {
    const p = { ...routineDefaults(), minutes: 45, par3: [100, 140, 160] };
    const range = buildVisits(p).find((v) => v.kind === "range")!;
    expect(range.exercises.filter((e) => e.distance).map((e) => e.distance)).toEqual([
      100, 140, 160,
    ]);
  });
  it("excludes other accounts, voided shots, streaks, bots, and make/miss-only records", () => {
    const session: ShotSession = {
      session_id: "s",
      user_id: "me",
      schema_version: 1,
      source: "coach",
      activity_type: "training",
      status: "completed",
      started_at: new Date(now).toISOString(),
      completed_at: new Date(now).toISOString(),
      metadata: {},
    };
    const e: ShotRecordedEvent = {
      event_id: "e",
      event_type: "shot_recorded",
      schema_version: 1,
      user_id: "me",
      session_id: "s",
      sequence: 1,
      played_at: new Date(now).toISOString(),
      recorded_at: new Date(now).toISOString(),
      source: "coach",
      activity_type: "training",
      skill: "putting",
      payload: { kind: "putting", distance_m: 12, first_putt_holed: false, strokes_to_hole: 3 },
      context: {},
    };
    expect(puttingObservations([e, e], [session], "me", now)).toHaveLength(1);
    expect(puttingObservations([e], [session], "someone-else", now)).toEqual([]);
    expect(
      puttingObservations([{ ...e, context: { progression_format: true } }], [session], "me", now),
    ).toEqual([]);
    expect(puttingObservations([{ ...e, source: "bot" }], [session], "me", now)).toEqual([]);
    expect(
      puttingObservations(
        [{ ...e, payload: { kind: "putting", distance_m: 12, first_putt_holed: false } }],
        [session],
        "me",
        now,
      ),
    ).toEqual([]);
    expect(
      puttingObservations(
        [
          e,
          {
            ...e,
            event_id: "void",
            event_type: "shot_voided",
            payload: { kind: "void" },
            target_event_id: "e",
            reason: "undo",
          },
        ],
        [session],
        "me",
        now,
      ),
    ).toEqual([]);
  });
  it("reads account-scoped course history and deduplicates its cloud mirror", () => {
    const history = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`,
      model: 1,
      status: "full",
      startedAt: now - 2 * minute,
      finishedAt: now - minute,
      holes: [[2], [2], [2], [3], [3], [3]],
    }));
    const local = JSON.stringify({ version: 1, active: null, history });
    const storage = { getItem: (k: string) => (k === "sg4-putt-course-v1:me" ? local : null) };
    const remote = history.map(
      (r) =>
        ({
          id: r.id,
          testId: "putt-course-round",
          category: "puttning",
          testType: "training",
          playedAt: new Date(r.finishedAt).toISOString(),
          score: 0,
          testHandicap: null,
          metrics: { round: r },
          shots: r.holes,
          testVersion: 1,
          scoringVersion: 1,
        }) as TestSession,
    );
    const profile = readWarmProfile("me", storage, now, remote);
    expect(profile.putt?.samples).toBe(6);
    expect(readWarmProfile("other", storage, now)).toEqual({});
  });
  it("uses valid measured approach test shots and rejects unfilled shots or proximity putt scores", () => {
    const s: TestSession = {
      id: "t",
      testId: "approach-precision",
      category: "approach",
      testType: "hcp",
      playedAt: new Date(now).toISOString(),
      score: 0,
      testHandicap: null,
      metrics: {},
      shots: [
        { filled: true, target: 140, carry: 130, offline: 0 },
        { filled: false, target: 140, carry: 0, offline: 0 },
      ],
      testVersion: 1,
      scoringVersion: 1,
    };
    expect(testObservations([s]).map((r) => [r.distance, r.value])).toEqual([[140, 10]]);
    expect(testObservations([{ ...s, testId: "lag-putt-18", shots: [0, 1, 2, 3] }])).toEqual([]);
  });
});
