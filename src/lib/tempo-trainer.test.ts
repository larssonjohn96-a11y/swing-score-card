import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPO, normalizeTempo, tempoTiming } from "./tempo-trainer";

describe("SG4 tempoträning", () => {
  it("använder 3:1 och exakt 24/8 för full sving", () => {
    const t = tempoTiming("full", .8);
    expect(t.ratio).toBe(3);
    expect(t.back).toBeCloseTo(.8, 8);
    expect(t.down).toBeCloseTo(8 / 30, 8);
    expect(t.total).toBeCloseTo(32 / 30, 8);
  });
  it("använder 2:1 för närspel och puttning", () => {
    for (const mode of ["short", "putt"] as const) {
      const t = tempoTiming(mode, .7);
      expect(t.ratio).toBe(2);
      expect(t.down).toBeCloseTo(.35, 8);
      expect(t.total).toBeCloseTo(1.05, 8);
    }
  });
  it("normaliserar ofullständiga och ogiltiga sparade inställningar", () => {
    const cfg = normalizeTempo({ mode: "putt", speeds: { putt: 400, full: .6 }, volume: 9,
      sound: "broken", count: 123, delay: 15 });
    expect(cfg.mode).toBe("putt");
    expect(cfg.speeds.putt).toBe(DEFAULT_TEMPO.speeds.putt);
    expect(cfg.speeds.full).toBe(.6);
    expect(cfg.volume).toBe(1);
    expect(cfg.sound).toBe("soft");
    expect(cfg.count).toBe(10);
    expect(cfg.delay).toBe(3);
    expect(cfg.haptics).toBe(false);
  });
  it("sparar haptik endast om den aktiverats uttryckligen", () => {
    expect(normalizeTempo({ haptics: true }).haptics).toBe(true);
    expect(normalizeTempo({ haptics: "true" }).haptics).toBe(false);
  });
  it("ger en separat kopia av standardinställningarna", () => {
    const cfg = normalizeTempo(null);
    cfg.speeds.full = .65;
    expect(DEFAULT_TEMPO.speeds.full).toBe(.8);
  });
});
