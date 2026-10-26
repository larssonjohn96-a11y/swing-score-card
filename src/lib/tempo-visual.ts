import type { TempoMode } from "./tempo-trainer";

/** The same AudioContext clock that schedules the three audible cues drives the animation. */
export type TempoClock = {
  now: number;
  first: number;
  back: number;
  total: number;
  period: number;
};
export type TempoCue = "start" | "top" | "impact";
export type TempoMotionFrame = {
  phase: "idle" | "countdown" | "back" | "down" | "impact" | "rest";
  progress: number;
  countdown: number;
  cycle: number;
  cue: TempoCue | null;
  pulse: number;
};
export const IDLE_MOTION: TempoMotionFrame = {
  phase: "idle", progress: 0, countdown: 0, cycle: -1, cue: null, pulse: 0,
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Pure projection of scheduled cue times onto the visible stroke. No independent animation timer. */
export function tempoMotionAt(clock: TempoClock | null): TempoMotionFrame {
  if (!clock) return IDLE_MOTION;
  const elapsed = clock.now - clock.first;
  if (elapsed < 0) return {
    phase: "countdown", progress: 0, countdown: Math.max(1, Math.ceil(-elapsed)),
    cycle: -1, cue: null, pulse: 0,
  };
  // Absorb floating-point rounding at exact cue boundaries (e.g. 100.8 - 100).
  const cycle = Math.floor((elapsed + 1e-9) / clock.period);
  const t = Math.max(0, elapsed - cycle * clock.period);
  if (t < clock.back - 1e-9) return {
    phase: "back", progress: clamp01(t / clock.back), countdown: 0, cycle,
    cue: t < .085 ? "start" : null, pulse: clamp01(1 - t / .16),
  };
  if (t < clock.total - 1e-9) {
    const fromTop = t - clock.back;
    return {
      phase: "down", progress: 1 - clamp01(fromTop / (clock.total - clock.back)),
      countdown: 0, cycle, cue: fromTop < .085 ? "top" : null,
      pulse: clamp01(1 - fromTop / .16),
    };
  }
  const fromImpact = t - clock.total;
  if (fromImpact < .18) return {
    phase: "impact", progress: 0, countdown: 0, cycle,
    cue: fromImpact < .085 ? "impact" : null, pulse: clamp01(1 - fromImpact / .18),
  };
  return { phase: "rest", progress: 0, countdown: 0, cycle, cue: null, pulse: 0 };
}

export type TempoPoint = { x: number; y: number };
export function tempoArc(mode: TempoMode) {
  // 6 o'clock (address) to 11 o'clock (full swing); smaller arc for chips.
  const center: TempoPoint = mode === "putt" ? { x: 180, y: 94 } : { x: 180, y: 214 };
  const radius = mode === "full" ? 147 : mode === "short" ? 123 : 176;
  const start = 90;
  const end = mode === "full" ? 244 : mode === "short" ? 216 : 126;
  const point = (progress: number): TempoPoint => {
    const radians = (start + (end - start) * clamp01(progress)) * Math.PI / 180;
    return { x: center.x + radius * Math.cos(radians), y: center.y + radius * Math.sin(radians) };
  };
  const a = point(0), b = point(1);
  return {
    center, radius, point, start: a, top: b,
    path: `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`,
  };
}
