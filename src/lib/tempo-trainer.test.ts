import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPO, normalizeTempo, tempoTiming } from "./tempo-trainer";

describe("SG4 tempoträning", () => {
  it("skiljer tempo (3:1) från hastighet (total tid) för full sving", () => {
    const t = tempoTiming("full", 1.2, 3);
    expect(t.ratio).toBe(3);
    expect(t.back).toBeCloseTo(.9, 8);
    expect(t.down).toBeCloseTo(.3, 8);
    expect(t.total).toBeCloseTo(1.2, 8);
  });
  it("tempoändring bibehåller total svingtid", () => {
    const slowTransition = tempoTiming("full", 1.07, 2);
    const traditional = tempoTiming("full", 1.07, 3);
    const fastTransition = tempoTiming("full", 1.07, 4);
    expect(slowTransition.total).toBe(traditional.total);
    expect(fastTransition.total).toBe(traditional.total);
    expect(slowTransition.down).toBeGreaterThan(fastTransition.down);
  });
  it("hastighetsändring behåller tempoförhållandet", () => {
    const a = tempoTiming("putt", 1.35, 2);
    const b = tempoTiming("putt", .85, 2);
    expect(a.ratio).toBe(b.ratio);
    expect(a.back / a.down).toBeCloseTo(2, 8);
    expect(b.back / b.down).toBeCloseTo(2, 8);
  });
  it("har visuell follow-through efter impact", () => {
    const t = tempoTiming("full", 1.07);
    expect(t.follow).toBeGreaterThan(0);
    expect(t.total + t.follow).toBeGreaterThan(t.total);
  });
  it("migrerar v1 baksvingstider till total tid utan att tappa inställningarna", () => {
    const cfg = normalizeTempo({ mode: "putt", speeds: { putt: .7, full: .8 }, sound: "click", volume: .5 });
    expect(cfg.mode).toBe("putt");
    expect(cfg.durations.full).toBe(1.07);
    expect(cfg.durations.putt).toBe(1.05);
    expect(cfg.ratios.full).toBe(3);
    expect(cfg.ratios.putt).toBe(2);
    expect(cfg.sound).toBe("click");
    expect(cfg.volume).toBe(.5);
  });
  it("normaliserar ofullständiga och ogiltiga inställningar", () => {
    const cfg = normalizeTempo({ mode: "putt", durations: { putt: 400, full: .8 },
      ratios: { full: 99, putt: 2.5 }, volume: 9, sound: "broken", count: 123, delay: 15 });
    expect(cfg.durations.putt).toBe(DEFAULT_TEMPO.durations.putt);
    expect(cfg.durations.full).toBe(.8);
    expect(cfg.ratios.putt).toBe(2.5);
    expect(cfg.ratios.full).toBe(3);
    expect(cfg.volume).toBe(1);
    expect(cfg.sound).toBe("soft");
    expect(cfg.count).toBe(10);
    expect(cfg.delay).toBe(3);
    expect(cfg.haptics).toBe(false);
  });
  it("ger separata kopior av standardinställningarna", () => {
    const cfg = normalizeTempo(null);
    cfg.durations.full = .8;
    cfg.ratios.full = 2;
    expect(DEFAULT_TEMPO.durations.full).toBe(1.07);
    expect(DEFAULT_TEMPO.ratios.full).toBe(3);
  });
});
