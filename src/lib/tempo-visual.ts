import type { TempoMode } from "./tempo-trainer";

/** Visual sampling comes from exactly the AudioContext clock used for audio cue scheduling. */
export type TempoClock = {
  now: number;
  first: number;
  back: number;
  total: number; // Start to impact; tempo ratio and speed are independent.
  follow: number; // Visible travel from impact to finish.
  period: number;
};
export type TempoCue = "start" | "top" | "impact";
export type TempoMotionFrame = {
  phase: "idle" | "countdown" | "back" | "down" | "through" | "finish" | "rest";
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
const EPS = 1e-9;

/** Motion is calculated from timestamps; no separate setTimeout/CSS timing drift. */
export function tempoMotionAt(clock: TempoClock | null): TempoMotionFrame {
  if (!clock) return IDLE_MOTION;
  const elapsed = clock.now - clock.first;
  if (elapsed < 0) return {
    phase: "countdown", progress: 0,
    countdown: Math.max(1, Math.ceil(-elapsed)), cycle: -1, cue: null, pulse: 0,
  };
  const cycle = Math.floor((elapsed + EPS) / clock.period);
  const t = Math.max(0, elapsed - cycle * clock.period);
  if (t < clock.back - EPS) return {
    phase: "back", progress: clamp01(t / clock.back), countdown: 0, cycle,
    cue: t < .09 ? "start" : null, pulse: clamp01(1 - t / .14),
  };
  if (t < clock.total - EPS) {
    const sinceTop = t - clock.back;
    return {
      phase: "down", progress: 1 - clamp01(sinceTop / (clock.total - clock.back)),
      countdown: 0, cycle, cue: sinceTop < .09 ? "top" : null,
      pulse: clamp01(1 - sinceTop / .14),
    };
  }
  const sinceImpact = t - clock.total;
  if (sinceImpact < clock.follow - EPS) return {
    phase: "through", progress: clamp01(sinceImpact / clock.follow),
    countdown: 0, cycle, cue: sinceImpact < .09 ? "impact" : null,
    pulse: clamp01(1 - sinceImpact / .14),
  };
  if (sinceImpact < clock.follow + .28) return {
    phase: "finish", progress: 1, countdown: 0, cycle, cue: null, pulse: 0,
  };
  return { phase: "rest", progress: 1, countdown: 0, cycle, cue: null, pulse: 0 };
}
export type TempoPoint = { x: number; y: number };
function anglePoint(cx: number, cy: number, radius: number, degrees: number): TempoPoint {
  const rad = degrees * Math.PI / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}
export function tempoArc(mode: TempoMode) {
  const center: TempoPoint = mode === "putt" ? { x: 180, y: 174 } : { x: 180, y: 208 };
  const radius = mode === "full" ? 154 : mode === "short" ? 120 : 124;
  const topAngle = mode === "full" ? 242 : mode === "short" ? 220 : 150;
  const finishAngle = mode === "full" ? 298 : mode === "short" ? 320 : 30;
  const backPoint = (progress: number) =>
    anglePoint(center.x, center.y, radius, 90 + (topAngle - 90) * clamp01(progress));
  const throughPoint = (progress: number) =>
    anglePoint(center.x, center.y, radius, 90 + ((finishAngle - 360) - 90) * clamp01(progress));
  const start = backPoint(0), top = backPoint(1), finish = throughPoint(1);
  return {
    center, radius, start, top, finish, backPoint, throughPoint,
    backPath: `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${top.x} ${top.y}`,
    throughPath: `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 0 ${finish.x} ${finish.y}`,
  };
}
