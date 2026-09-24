import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { SPEED_LEVEL_REVEAL_MS, startSpeedLevelAnimation, type SpeedAnimationEnvironment } from "./speed-level-animation";

function clock(reduced = false) {
  let time = 0;
  let handle = 0;
  const frames = new Map<number, (time: number) => void>();
  const listeners = new Set<() => void>();
  const motion = {
    matches: reduced,
    addEventListener: (_: "change", listener: () => void) => { listeners.add(listener); },
    removeEventListener: (_: "change", listener: () => void) => { listeners.delete(listener); },
  };
  const environment: SpeedAnimationEnvironment = {
    motion,
    now: () => time,
    requestFrame: (callback) => { frames.set(++handle, callback); return handle; },
    cancelFrame: (id) => { frames.delete(id); },
  };
  return {
    environment, frames, listeners,
    advance: (nextTime: number) => {
      time = nextTime;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(time));
    },
    reduce: (value: boolean) => { motion.matches = value; [...listeners].forEach((listener) => listener()); },
  };
}
function reveal(target: number, reduced = false) {
  const timer = clock(reduced);
  const frames: { value: number; complete: boolean }[] = [];
  const completions: boolean[] = [];
  const motions: boolean[] = [];
  const stop = startSpeedLevelAnimation(target, {
    onFrame: (value, complete) => { frames.push({ value, complete }); },
    onComplete: (celebrate) => { completions.push(celebrate); },
    onMotionChange: (value) => { motions.push(value); },
  }, timer.environment);
  return { timer, frames, completions, motions, stop };
}

describe("speed level reveal lifecycle", () => {
  for (const target of [0.01, 60, 90, 170.9, 171, 220, 250]) {
    it(`reveals ${target} monotonically from zero without overshoot`, () => {
      const r = reveal(target);
      assert.equal(r.frames[0].value, 0);
      for (let time = 16; time < SPEED_LEVEL_REVEAL_MS; time += 16) r.timer.advance(time);
      assert.equal(r.completions.length, 0);
      for (let i = 1; i < r.frames.length; i += 1) {
        assert.ok(r.frames[i].value >= r.frames[i - 1].value);
        assert.ok(r.frames[i].value < target);
      }
      r.timer.advance(SPEED_LEVEL_REVEAL_MS);
      assert.deepEqual(r.frames.at(-1), { value: target, complete: true });
      assert.deepEqual(r.completions, [true]);
      assert.equal(r.timer.frames.size, 0);
      r.stop();
    });
  }
  it("slows down toward the end of the reveal", () => {
    const r = reveal(180);
    r.timer.advance(900); const a = r.frames.at(-1)!.value;
    r.timer.advance(1800); const b = r.frames.at(-1)!.value;
    r.timer.advance(2700); const c = r.frames.at(-1)!.value;
    assert.ok(a > b - a); assert.ok(b - a > c - b);
    r.stop();
  });
  it("stops callbacks and removes listeners when closed before completion", () => {
    const r = reveal(171);
    r.timer.advance(1000);
    const queued = [...r.timer.frames.values()];
    const count = r.frames.length;
    r.stop();
    queued.forEach((callback) => callback(5000));
    r.timer.reduce(true);
    assert.equal(r.frames.length, count);
    assert.equal(r.completions.length, 0);
    assert.equal(r.timer.frames.size, 0);
    assert.equal(r.timer.listeners.size, 0);
  });
  it("finishes immediately with reduced motion and never celebrates", () => {
    const r = reveal(171, true);
    assert.deepEqual(r.frames, [{ value: 171, complete: true }]);
    assert.deepEqual(r.completions, [false]);
    assert.equal(r.timer.frames.size, 0);
    r.stop();
  });
  it("responds to reduced motion during the reveal exactly once", () => {
    const r = reveal(200);
    r.timer.advance(1000);
    r.timer.reduce(true);
    assert.deepEqual(r.frames.at(-1), { value: 200, complete: true });
    assert.deepEqual(r.completions, [false]);
    r.timer.reduce(false); r.timer.reduce(true); r.timer.advance(10000);
    assert.deepEqual(r.completions, [false]);
    assert.equal(r.timer.frames.size, 0);
    r.stop();
  });
  it("does not repeat completion when motion settings change after finishing", () => {
    const r = reveal(171);
    r.timer.advance(3600);
    r.timer.reduce(true); r.timer.reduce(false);
    assert.deepEqual(r.completions, [true]);
    assert.deepEqual(r.motions, [false, true, false]);
    r.stop();
  });
  it("supports a fresh reveal after leaving and re-entering", () => {
    const first = reveal(171);
    first.timer.advance(3600); first.stop();
    const second = reveal(171);
    assert.deepEqual(second.frames[0], { value: 0, complete: false });
    assert.equal(second.completions.length, 0);
    second.timer.advance(3600);
    assert.deepEqual(second.completions, [true]);
    second.stop();
  });
  it("finishes invalid input without animation, celebration or a navigation lock", () => {
    for (const target of [0, -1, NaN, Infinity]) {
      const r = reveal(target);
      assert.deepEqual(r.frames, [{ value: 0, complete: true }]);
      assert.deepEqual(r.completions, [false]);
      assert.equal(r.timer.frames.size, 0);
      r.stop();
    }
  });
  it("does not go backwards when the injected clock regresses", () => {
    const r = reveal(170.9);
    r.timer.advance(2000); const value = r.frames.at(-1)!.value;
    r.timer.advance(1000); assert.equal(r.frames.at(-1)!.value, value);
    r.stop();
  });
  it("keeps completion stable when the latest callback reference changes", () => {
    const timer = clock();
    const called: string[] = [];
    const ref = { current: () => { called.push("old"); } };
    const stop = startSpeedLevelAnimation(171, {
      onFrame: () => {}, onMotionChange: () => {}, onComplete: () => ref.current(),
    }, timer.environment);
    timer.advance(1000);
    ref.current = () => { called.push("new"); };
    timer.advance(3600); timer.advance(7200);
    assert.deepEqual(called, ["new"]);
    stop();
  });
});
