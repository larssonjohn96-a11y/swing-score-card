import { describe, expect, it } from "vitest";
import {
  CHIP_STATIONS,
  bestAt,
  chipStorageKey,
  emptyChipProgress,
  goalAt,
  masteryAt,
  starsAt,
  parseChipProgress,
  pointsForLeave,
  recentAt,
  recommendStation,
  reduceChipProgress,
  roundTotal,
  sessionRounds,
  unlockedDistances,
  type ChipPoints,
  type ChipProgress,
} from "./chip-stations";
let sequence = 0;
const start = () =>
  reduceChipProgress(emptyChipProgress(), {
    type: "start",
    id: `session-${sequence++}`,
    lies: ["Fairway", "Ruff"],
    at: 1,
  });
function play(state: ChipProgress, distance: number, shots: ChipPoints[]) {
  let next = reduceChipProgress(state, {
    type: "begin",
    id: `round-${sequence++}`,
    distance,
    lie: "Fairway",
    at: sequence,
  });
  for (const points of shots) next = reduceChipProgress(next, { type: "score", points });
  return next;
}
function unlockAll() {
  let p = start();
  for (const station of CHIP_STATIONS) p = play(p, station.distance, [3, 3, 3]);
  return p;
}

describe("chipping station scoring", () => {
  it("uses mutually exclusive 4/3/2/1/0 zones with inclusive boundaries", () => {
    expect(pointsForLeave(0, true)).toBe(4);
    expect(pointsForLeave(0.01)).toBe(3);
    expect(pointsForLeave(1)).toBe(3);
    expect(pointsForLeave(1.001)).toBe(2);
    expect(pointsForLeave(2)).toBe(2);
    expect(pointsForLeave(2.001)).toBe(1);
    expect(pointsForLeave(3)).toBe(1);
    expect(pointsForLeave(3.001)).toBe(0);
  });
  it("rejects invalid measured leave distances", () => {
    for (const value of [-1, NaN, Infinity]) expect(() => pointsForLeave(value)).toThrow();
  });
  it("keeps distance and lie unchanged until all three balls are registered", () => {
    let p = play(start(), 8, [3, 2]);
    expect(p.rounds).toHaveLength(0);
    expect(p.session?.phase).toBe("play");
    expect(p.session?.current?.distance).toBe(8);
    expect(p.session?.current?.lie).toBe("Fairway");
    p = reduceChipProgress(p, { type: "score", points: 3 });
    expect(p.rounds).toHaveLength(1);
    expect(roundTotal(p.rounds[0])).toBe(8);
    expect(p.session?.phase).toBe("result");
  });
  it("cannot record a fourth ball, a duplicate completion, or a legacy five-point score", () => {
    const p = play(start(), 8, [4, 4, 4]);
    expect(reduceChipProgress(p, { type: "score", points: 4 })).toBe(p);
    expect(roundTotal(p.rounds[0])).toBe(12);
    const draft = play(start(), 8, []);
    expect(reduceChipProgress(draft, { type: "score", points: 5 as ChipPoints })).toBe(draft);
  });
});

describe("unlocks, mastery and recommendations", () => {
  it("starts with only 8m unlocked and no preselected lie", () => {
    expect(unlockedDistances(emptyChipProgress())).toEqual([8]);
    expect(emptyChipProgress().session).toBeNull();
    const empty = emptyChipProgress();
    expect(reduceChipProgress(empty, { type: "start", id: "x", at: 0, lies: [] })).toBe(empty);
  });
  it("does not introduce long distances after low short-distance scores", () => {
    const p = play(start(), 8, [1, 1, 1]);
    expect(unlockedDistances(p)).toEqual([8]);
    expect(recommendStation(p).distance).toBe(8);
  });
  it("unlocks only the next distance, without requiring three chip-ins", () => {
    const p = play(start(), 8, [3, 3, 2]);
    expect(unlockedDistances(p)).toEqual([8, 12]);
    expect(recommendStation(p).distance).toBe(12);
    expect(goalAt(p, 8)).toEqual({ points: 10, label: "Ta stjärna 2" });
  });
  it("uses distance-dependent unlock thresholds", () => {
    expect(CHIP_STATIONS.map((s) => s.unlock)).toEqual([8, 7, 6, 5, 4, 3]);
    let p = play(start(), 8, [3, 3, 2]);
    p = play(p, 12, [3, 2, 2]);
    p = play(p, 16, [2, 2, 2]);
    p = play(p, 20, [2, 2, 1]);
    expect(unlockedDistances(p)).toEqual([8, 12, 16, 20, 25]);
    p = play(p, 25, [2, 1, 1]);
    expect(unlockedDistances(p)).toEqual([8, 12, 16, 20, 25, 30]);
  });
  it("does not let a direct selection bypass a lock or abandon a partial round", () => {
    let p = start();
    expect(
      reduceChipProgress(p, { type: "begin", id: "no", distance: 30, lie: "Fairway", at: 0 }),
    ).toBe(p);
    p = play(p, 8, [2]);
    expect(reduceChipProgress(p, { type: "stations" })).toBe(p);
    expect(
      reduceChipProgress(p, { type: "begin", id: "no", distance: 8, lie: "Fairway", at: 0 }),
    ).toBe(p);
  });
  it("retains unlocks, best scores and medals after a poor retry", () => {
    let p = play(start(), 8, [3, 3, 2]);
    p = play(p, 8, [0, 0, 0]);
    expect(unlockedDistances(p)).toEqual([8, 12]);
    expect(bestAt(p, 8)).toBe(8);
    expect(recentAt(p, 8)).toBe(4);
  });
  it("distinguishes raw score from distance-relative mastery", () => {
    expect(masteryAt(8, 7)).toBeNull();
    expect(masteryAt(20, 7)).toBe("Gold");
    expect(masteryAt(8, 10)).toBe("Gold");
    for (const s of CHIP_STATIONS) expect(masteryAt(s.distance, 12)).toBe("Perfect");
  });
  it("always leaves shorter stations available and offers short precision refreshes", () => {
    const p = unlockAll();
    expect(unlockedDistances(p)).toEqual([8, 12, 16, 20, 25, 30]);
    expect(recommendStation(p).distance).toBeLessThan(20);
    expect(play(p, 8, []).session?.current?.distance).toBe(8);
  });
  it("has strictly increasing mastery targets with no chip-in required for unlock", () => {
    for (const s of CHIP_STATIONS) {
      expect(s.unlock).toBeLessThanOrEqual(9);
      for (let i = 1; i < s.tiers.length; i++)
        expect(s.tiers[i].points).toBeGreaterThan(s.tiers[i - 1].points);
    }
  });
});

describe("undo, persistence and pass boundaries", () => {
  it("corrects the latest ball without double-counting the round", () => {
    let p = play(start(), 8, [3, 3, 2]);
    p = reduceChipProgress(p, { type: "undo" });
    expect(p.rounds).toHaveLength(0);
    expect(p.session?.current?.shots).toEqual([3, 3]);
    expect(unlockedDistances(p)).toEqual([8]);
    p = reduceChipProgress(p, { type: "score", points: 3 });
    expect(p.rounds).toHaveLength(1);
    expect(roundTotal(p.rounds[0])).toBe(9);
  });
  it("restores an unfinished attempt and its completed history on reload", () => {
    let p = play(start(), 8, [3, 3, 2]);
    p = play(p, 12, [2, 3]);
    const restored = parseChipProgress(JSON.stringify(p));
    expect(restored).toEqual(p);
    expect(restored.session?.current?.shots).toEqual([2, 3]);
  });
  it("restores a result screen without counting completion again", () => {
    const p = play(start(), 8, [3, 3, 2]);
    const restored = parseChipProgress(JSON.stringify(p));
    expect(restored.rounds).toHaveLength(1);
    expect(reduceChipProgress(restored, { type: "score", points: 4 })).toBe(restored);
  });
  it("deduplicates persisted rounds and ignores broken or legacy 0–5 data", () => {
    const p = play(start(), 8, [3, 3, 2]);
    const bad = { ...p.rounds[0], id: "legacy", shots: [5, 5, 5] };
    const restored = parseChipProgress(
      JSON.stringify({ ...p, rounds: [...p.rounds, p.rounds[0], bad] }),
    );
    expect(restored.rounds).toHaveLength(1);
    expect(parseChipProgress("broken")).toEqual(emptyChipProgress());
    expect(parseChipProgress('{"version":0,"rounds":[]}')).toEqual(emptyChipProgress());
  });
  it("keeps guest and account data in separate namespaces", () => {
    expect(chipStorageKey(null)).not.toBe(chipStorageKey("user-1"));
    expect(chipStorageKey("user-1")).not.toBe(chipStorageKey("user-2"));
  });
  it("ends a pass with only complete rounds and keeps permanent progress for the next pass", () => {
    let p = play(start(), 8, [3, 3, 2]);
    p = play(p, 12, [3]);
    p = reduceChipProgress(p, { type: "finish" });
    expect(p.session?.phase).toBe("summary");
    expect(p.session?.current).toBeNull();
    expect(sessionRounds(p)).toHaveLength(1);
    p = reduceChipProgress(p, { type: "start", id: "next-session", lies: ["Ruff"], at: 5 });
    expect(sessionRounds(p)).toHaveLength(0);
    expect(unlockedDistances(p)).toEqual([8, 12]);
    expect(recommendStation(p).distance).toBe(8);
  });
});

describe("guided rounds and independent lie progression", () => {
  it("keeps fairway stars and unlocks out of rough", () => {
    const p = play(start(), 8, [3, 3, 3]);
    expect(starsAt(p, 8, "Fairway")).toBe(1);
    expect(starsAt(p, 8, "Ruff")).toBe(0);
    expect(bestAt(p, 8, "Ruff")).toBeNull();
    expect(unlockedDistances(p, "Ruff")).toEqual([8]);
    expect(
      reduceChipProgress(p, {
        type: "begin",
        id: "rough-locked",
        distance: 12,
        lie: "Ruff",
        at: 2,
      }),
    ).toBe(p);
  });
  it("caps a guided round at nine shots, then permits a new standalone attempt", () => {
    let p = reduceChipProgress(emptyChipProgress(), {
      type: "start",
      id: "guided",
      lies: ["Fairway"],
      at: 1,
      mode: "guided",
    });
    p = play(p, 8, [3, 3, 2]);
    expect(recommendStation(p).distance).toBe(12);
    p = play(p, 12, [3, 2, 2]);
    p = play(p, 16, [2, 2, 2]);
    expect(sessionRounds(p).flatMap((r) => r.shots)).toHaveLength(9);
    expect(play(p, 8, [4, 4, 4])).toBe(p);
    p = reduceChipProgress(p, { type: "finish" });
    p = reduceChipProgress(p, {
      type: "start",
      id: "single",
      lies: ["Fairway"],
      at: 2,
      mode: "single",
    });
    p = play(p, 8, [3, 3, 3]);
    expect(sessionRounds(p)).toHaveLength(1);
    expect(play(p, 8, [3, 3, 3])).toBe(p);
    expect(parseChipProgress(JSON.stringify(p))).toEqual(p);
  });
  it("allows undo at the ninth shot without duplicating completion", () => {
    let p = reduceChipProgress(emptyChipProgress(), {
      type: "start",
      id: "guided",
      lies: ["Fairway"],
      at: 1,
      mode: "guided",
    });
    for (let i = 0; i < 3; i++) p = play(p, 8, [1, 1, 1]);
    p = reduceChipProgress(p, { type: "undo" });
    expect(sessionRounds(p)).toHaveLength(2);
    p = reduceChipProgress(p, { type: "score", points: 2 });
    expect(sessionRounds(p)).toHaveLength(3);
    expect(roundTotal(p.rounds[2])).toBe(4);
  });
  it("retains known historical lie records and clears finished navigation", () => {
    const p = play(start(), 8, [3, 3, 2]);
    const restored = parseChipProgress(JSON.stringify(p));
    const home = reduceChipProgress(restored, { type: "home" });
    expect(home.session).toBeNull();
    expect(bestAt(home, 8, "Fairway")).toBe(8);
    expect(bestAt(home, 8, "Ruff")).toBeNull();
  });
});

it("migrates external v2 records without losing lie-specific progress", () => {
  const saved = {
    version: 2,
    lie: "Ruff",
    rounds: [
      {
        id: "v2",
        sessionId: "old",
        mode: "standalone",
        distance: 8,
        lie: "Ruff",
        shots: [3, 2, 2],
        at: 1,
      },
    ],
    session: null,
  };
  const p = parseChipProgress(JSON.stringify(saved));
  expect(bestAt(p, 8, "Ruff")).toBe(7);
  expect(unlockedDistances(p, "Ruff")).toEqual([8, 12]);
  expect(unlockedDistances(p, "Fairway")).toEqual([8]);
});
