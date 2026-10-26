import { describe, expect, it } from "vitest";
import { tempoArc, tempoMotionAt } from "./tempo-visual";

const clock = { first: 100, now: 100, back: .8, total: .8 + .8 / 3, period: .8 + .8 / 3 + 5 };
describe("SG4 – tempoanimation", () => {
  it("visar nedräkning före första ljudsignalen", () => {
    expect(tempoMotionAt({ ...clock, now: 98.2 }).countdown).toBe(2);
    expect(tempoMotionAt({ ...clock, now: 98.2 }).phase).toBe("countdown");
  });
  it("är på toppen vid exakt samma tid som toppsignalen", () => {
    expect(tempoMotionAt({ ...clock, now: 100.4 }).progress).toBeCloseTo(.5);
    const top = tempoMotionAt({ ...clock, now: 100.8 });
    expect(top.progress).toBeCloseTo(1);
    expect(top.cue).toBe("top");
  });
  it("rör sig ner tre gånger snabbare och träffar vid impact-signalen", () => {
    const down = tempoMotionAt({ ...clock, now: 100.8 + .8 / 6 });
    expect(down.progress).toBeCloseTo(.5);
    const impact = tempoMotionAt({ ...clock, now: 100 + clock.total });
    expect(impact.phase).toBe("impact");
    expect(impact.progress).toBe(0);
    expect(impact.cue).toBe("impact");
  });
  it("återgår till adress efter impact och växlar cykel", () => {
    expect(tempoMotionAt({ ...clock, now: 102 }).phase).toBe("rest");
    const next = tempoMotionAt({ ...clock, now: 100 + clock.period });
    expect(next.cycle).toBe(1);
    expect(next.cue).toBe("start");
  });
  it("ger stor svingbåge, mindre närspelsbåge och en pendel för puttning", () => {
    const full = tempoArc("full"), chip = tempoArc("short"), putt = tempoArc("putt");
    expect(full.radius).toBeGreaterThan(chip.radius);
    expect(putt.center.y).toBeLessThan(chip.center.y);
    expect(full.top.y).toBeLessThan(full.start.y);
    expect(putt.top.x).toBeLessThan(putt.start.x);
  });
});
