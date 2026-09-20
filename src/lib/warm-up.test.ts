import { describe, it, expect } from "vitest";
import {
  defaults,
  emptyWarm,
  startWarm,
  plan,
  snooze,
  finishStation,
  switchStation,
  followupDue,
  parseWarm,
} from "./warm-up";
const minute = 60000,
  now = 1000000;
describe("warm-up scheduling without shot data", () => {
  it("splits 30 minutes into 15 range, 5 chip, 7 putt, protecting three for tee", () => {
    const s = startWarm(defaults(), now, "a");
    expect(plan(s, now)).toEqual({ range: 15, chip: 5, putt: 7 });
    expect(s.teeAt).toBe(now + 30 * minute);
    expect(s.dueAt).toBe(now + 15 * minute);
  });
  it("snooze never moves tee time or extends into the protected margin", () => {
    const s = startWarm(defaults(), now, "a"),
      next = snooze(s, now + 26 * minute);
    expect(next.teeAt).toBe(s.teeAt);
    expect(next.dueAt).toBe(s.teeAt - 3 * minute);
    expect(plan(next, now + 29 * minute)).toEqual({ range: 0, chip: 0, putt: 0 });
  });
  it("manual completion redistributes actual remaining time and records only optional feelings", () => {
    let s = startWarm(defaults(), now, "a");
    s = finishStation(s, now + 18 * minute, "medium");
    expect(s.current).toBe("chip");
    expect(s.done).toEqual(["range"]);
    expect(s.ratings.range).toBe("medium");
    expect(plan(s, now + 18 * minute)).toEqual({ chip: 3.75, putt: 5.25 });
    s = finishStation(s, now + 20 * minute, undefined, true);
    expect(s.skipped).toEqual(["chip"]);
    expect(s.current).toBe("putt");
    s = finishStation(s, now + 26 * minute, "good");
    expect(s.finishedAt).toBe(now + 26 * minute);
    expect(s.done).toEqual(["range", "putt"]);
    expect(s).not.toHaveProperty("shots");
  });
  it("switching a station keeps previous work available and restores the deadline after reload", () => {
    const s = startWarm(defaults(), now, "a");
    const next = switchStation(s, "putt", now + 5 * minute);
    expect(next.current).toBe("putt");
    expect(next.done).toEqual([]);
    const restored = parseWarm(
      JSON.stringify({ ...emptyWarm(), active: { ...next, manual: true } }),
    );
    expect(restored.active?.teeAt).toBe(s.teeAt);
    expect(restored.active?.dueAt).toBe(next.dueAt);
    expect(restored.active?.manual).toBe(true);
  });
  it("honors custom order and weights", () => {
    const p = { ...defaults(), minutes: 10, order: ["putt", "range"] as const };
    const s = startWarm({ ...p, order: [...p.order] }, now, "a");
    expect(s.current).toBe("putt");
    expect(s.reserve).toBe(1);
    expect(Object.values(plan(s, now)).reduce((a, b) => a + b, 0)).toBe(9);
  });
  it("only prompts after the round within 48 hours; never during active play, twice, or for old backlog", () => {
    let s = finishStation(startWarm({ ...defaults(), order: ["putt"] }, now, "a"), now + minute);
    let state = { ...emptyWarm(), history: [s] };
    expect(followupDue(state, s.teeAt + 4 * 3600000)).toBeNull();
    expect(followupDue(state, s.teeAt + 5 * 3600000)?.id).toBe("a");
    expect(followupDue(state, s.teeAt + 49 * 3600000)).toBeNull();
    expect(
      followupDue({ ...state, active: startWarm(defaults(), now, "b") }, s.teeAt + 6 * 3600000),
    ).toBeNull();
    expect(
      followupDue({ ...state, history: [{ ...s, followup: "done" }] }, s.teeAt + 6 * 3600000),
    ).toBeNull();
    expect(
      followupDue(
        { ...state, history: [s, { ...s, id: "new", startedAt: now + 1, followup: "dismissed" }] },
        s.teeAt + 6 * 3600000,
      ),
    ).toBeNull();
    expect(
      followupDue(
        { ...state, history: [{ ...s, deferUntil: s.teeAt + 8 * 3600000 }] },
        s.teeAt + 6 * 3600000,
      ),
    ).toBeNull();
  });
  it("rejects corrupt settings, duplicated stations and invalid feedback", () => {
    expect(parseWarm("bad")).toEqual(emptyWarm());
    const p = { ...defaults(), order: ["range", "range"] };
    expect(parseWarm(JSON.stringify({ ...emptyWarm(), prefs: p })).prefs).toEqual(defaults());
    const s = { ...startWarm(defaults(), now, "a"), more: "unknown", finishedAt: now + minute };
    expect(parseWarm(JSON.stringify({ ...emptyWarm(), history: [s] })).history).toEqual([]);
  });
});
