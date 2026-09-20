import { describe, it, expect } from "vitest";
import {
  speedSession,
  mergeSpeedRounds,
  reconcileSpeedRounds,
  type SpeedCloudPort,
} from "./speed-cloud";
import { emptyCourse, roundPoints, type CourseRound } from "./speed-course";
const round = (id: string, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  reference: 200,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: [125, 90, 140, 115, 155, 135].map((actualDistance) => [{ ballSpeed: actualDistance }]),
});
describe("speed account persistence", () => {
  it("never contributes a game estimate to official HCP; ids are per account and deterministic", () => {
    expect(speedSession("a", round("r")).testHandicap).toBeNull();
    expect(speedSession("a", round("r")).testType).toBe("training");
    expect(speedSession("a", round("r")).category).toBe("speed");
    expect(speedSession("a", round("r")).score).toBe(roundPoints(round("r")));
    expect(speedSession("a", round("r")).metrics.round).toEqual(round("r"));
    expect(speedSession("a", round("r")).id).toBe(speedSession("a", round("r")).id);
    expect(speedSession("a", round("r")).id).not.toBe(speedSession("b", round("r")).id);
  });
  it("merges both devices without duplicates and keeps active play", () => {
    const local = {
      ...emptyCourse(),
      history: [round("local", 3)],
      active: {
        id: "playing",
        model: 1 as const,
        reference: 200,
        startedAt: 4,
        phase: "play" as const,
        holes: [[]],
      },
    };
    const merged = mergeSpeedRounds(local, [round("remote", 2), round("local", 3)]);
    expect(merged.history.map((r) => r.id)).toEqual(["remote", "local"]);
    expect(merged.active).toEqual(local.active);
  });
  it("preserves and uploads a round completed during the fetch", async () => {
    let local = { ...emptyCourse(), history: [round("old")] };
    const uploaded: string[] = [];
    const port: SpeedCloudPort = {
      currentUser: async () => "a",
      readLocal: () => local,
      writeLocal: (_, s) => {
        local = s;
      },
      upload: async (_, r) => {
        uploaded.push(...r.map((x) => x.id));
      },
      fetch: async () => {
        local = { ...local, history: [...local.history, round("new", 3)] };
        return [round("remote", 2)];
      },
    };
    await reconcileSpeedRounds("a", port);
    expect(uploaded).toEqual(["old", "new"]);
    expect(local.history.map((r) => r.id)).toEqual(["old", "remote", "new"]);
  });
  it("does not write another accounts results after an account switch", async () => {
    let account = "a";
    let writes = 0;
    const port: SpeedCloudPort = {
      currentUser: async () => account,
      readLocal: () => emptyCourse(),
      writeLocal: () => {
        writes++;
      },
      upload: async () => {},
      fetch: async () => {
        account = "b";
        return [round("remote")];
      },
    };
    await expect(reconcileSpeedRounds("a", port)).rejects.toThrow("Kontot");
    expect(writes).toBe(0);
  });
  it("keeps local history on network failure", async () => {
    const local = { ...emptyCourse(), history: [round("offline")] };
    let writes = 0;
    const port: SpeedCloudPort = {
      currentUser: async () => "a",
      readLocal: () => local,
      writeLocal: () => {
        writes++;
      },
      upload: async () => {
        throw Error("offline");
      },
      fetch: async () => [],
    };
    await expect(reconcileSpeedRounds("a", port)).rejects.toThrow("offline");
    expect(writes).toBe(0);
    expect(local.history).toHaveLength(1);
  });
});
