import { describe, expect, it } from "vitest";
import { tempoArc, tempoMotionAt } from "./tempo-visual";

const clock = { first: 100, now: 100, back: .8, total: .8 + .8 / 3,
  follow: .48, period: .8 + .8 / 3 + .48 + 5 };
describe("SG4 – obruten tempoanimation", () => {
  it("visar nedräkning före första ljudsignalen", () => {
    expect(tempoMotionAt({ ...clock, now: 98.2 }).countdown).toBe(2);
    expect(tempoMotionAt({ ...clock, now: 98.2 }).phase).toBe("countdown");
  });
  it("når toppen samtidigt med toppsignalen", () => {
    expect(tempoMotionAt({ ...clock, now: 100.4 }).progress).toBeCloseTo(.5);
    const top = tempoMotionAt({ ...clock, now: 100.8 });
    expect(top.phase).toBe("down");
    expect(top.progress).toBeCloseTo(1);
    expect(top.cue).toBe("top");
  });
  it("når impact samtidigt med träffljudet och fortsätter sedan mot finish", () => {
    const down = tempoMotionAt({ ...clock, now: 100.8 + .8 / 6 });
    expect(down.progress).toBeCloseTo(.5);
    const impact = tempoMotionAt({ ...clock, now: 100 + clock.total });
    expect(impact.phase).toBe("through");
    expect(impact.progress).toBe(0);
    expect(impact.cue).toBe("impact");
    const afterImpact = tempoMotionAt({ ...clock, now: 100 + clock.total + .24 });
    expect(afterImpact.phase).toBe("through");
    expect(afterImpact.progress).toBeCloseTo(.5);
    expect(afterImpact.cue).toBeNull();
  });
  it("når finish och stannar kvar där innan nästa sekvens", () => {
    const finish = tempoMotionAt({ ...clock, now: 100 + clock.total + clock.follow });
    expect(finish.phase).toBe("finish");
    expect(finish.progress).toBe(1);
    expect(tempoMotionAt({ ...clock, now: 103 }).phase).toBe("rest");
    expect(tempoMotionAt({ ...clock, now: 103 }).progress).toBe(1);
    const next = tempoMotionAt({ ...clock, now: 100 + clock.period });
    expect(next.cycle).toBe(1);
    expect(next.phase).toBe("back");
    expect(next.cue).toBe("start");
  });
  it("har speglad finishbåge och mindre båge för chip och putt", () => {
    const full = tempoArc("full"), chip = tempoArc("short"), putt = tempoArc("putt");
    expect(full.radius).toBeGreaterThan(chip.radius);
    expect(putt.top.y).toBeGreaterThan(full.top.y);
    expect(full.top.x).toBeLessThan(full.start.x);
    expect(full.finish.x).toBeGreaterThan(full.start.x);
    expect(chip.finish.x).toBeGreaterThan(chip.start.x);
    expect(putt.finish.x).toBeGreaterThan(putt.start.x);
  });
});
