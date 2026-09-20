import { describe, it, expect } from "vitest";
import {
  driverSession,
  mergeDriverRounds,
  reconcileDriverRounds,
  type DriverCloudPort,
} from "./driver-cloud";
import { emptyCourse, roundPoints, type CourseRound } from "./driver-course";
const round = (id: string, finishedAt = 1): CourseRound => ({
  id,
  model: 1,
  reference: 200,
  startedAt: 0,
  finishedAt,
  status: "full",
  holes: [125, 90, 140, 115, 155, 135].map((actualDistance) => [
    { actualDistance, lateral: 0, side: "center" as const },
  ]),
});
describe("driver account persistence", () => {
  it("never contributes a game estimate to official HCP; ids are per account and deterministic", () => {
    expect(driverSession("a", round("r")).testHandicap).toBeNull();
    expect(driverSession("a", round("r")).testType).toBe("training");
    expect(driverSession("a", round("r")).category).toBe("driving");
    expect(driverSession("a", round("r")).score).toBe(roundPoints(round("r")));
    expect(driverSession("a", round("r")).metrics.round).toEqual(round("r"));
    expect(driverSession("a", round("r")).id).toBe(driverSession("a", round("r")).id);
    expect(driverSession("a", round("r")).id).not.toBe(driverSession("b", round("r")).id);
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
    const merged = mergeDriverRounds(local, [round("remote", 2), round("local", 3)]);
    expect(merged.history.map((r) => r.id)).toEqual(["remote", "local"]);
    expect(merged.active).toEqual(local.active);
  });
  it("preserves and uploads a round completed during the fetch", async () => {
    let local = { ...emptyCourse(), history: [round("old")] };
    const uploaded: string[] = [];
    const port: DriverCloudPort = {
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
    await reconcileDriverRounds("a", port);
    expect(uploaded).toEqual(["old", "new"]);
    expect(local.history.map((r) => r.id)).toEqual(["old", "remote", "new"]);
  });
  it("does not write another accounts results after an account switch", async () => {
    let account = "a";
    let writes = 0;
    const port: DriverCloudPort = {
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
    await expect(reconcileDriverRounds("a", port)).rejects.toThrow("Kontot");
    expect(writes).toBe(0);
  });
  it("keeps local history on network failure", async () => {
    const local = { ...emptyCourse(), history: [round("offline")] };
    let writes = 0;
    const port: DriverCloudPort = {
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
    await expect(reconcileDriverRounds("a", port)).rejects.toThrow("offline");
    expect(writes).toBe(0);
    expect(local.history).toHaveLength(1);
  });
});
