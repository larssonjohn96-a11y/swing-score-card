import { beforeEach, describe, expect, it } from "vitest";
import { loadSpeedSessions, type SpeedSession } from "@/lib/speed";

const KEY = "golf-speed-sessions-v2";

function session(id: string, date: string, handicap: number, testHandicap?: number): SpeedSession {
  return {
    id,
    date,
    context: "range",
    device: "Toptracer Range",
    shots: [],
    avgBallSpeed: 140,
    topBallSpeed: 145,
    handicap,
    ...(testHandicap !== undefined ? { testHandicap } : {}),
    score: 50,
  };
}

describe("loadSpeedSessions", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    // Minimal localStorage/window-stub så modulen kan läsa lagrad historik i node.
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
  });

  it("returnerar råa testvärden utan egen stabilisering", () => {
    const rows = [
      session("a", "2026-01-01T00:00:00.000Z", 22, 22),
      session("b", "2026-02-01T00:00:00.000Z", 12, 12),
      session("c", "2026-03-01T00:00:00.000Z", 24, 24),
    ];
    window.localStorage.setItem(KEY, JSON.stringify(rows));
    expect(loadSpeedSessions().map((s) => s.handicap)).toEqual([22, 12, 24]);
  });

  it("läser äldre historik utan testHandicap utan att skriva om data", () => {
    const raw = JSON.stringify([session("old", "2025-05-01T00:00:00.000Z", 17)]);
    window.localStorage.setItem(KEY, raw);
    const loaded = loadSpeedSessions();
    expect(loaded[0].handicap).toBe(17);
    expect(loaded[0].testHandicap).toBe(17);
    expect(window.localStorage.getItem(KEY)).toBe(raw);
  });
});
