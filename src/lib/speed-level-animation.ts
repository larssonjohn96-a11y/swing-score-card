export const SPEED_LEVEL_REVEAL_MS = 3600;

type MotionPreference = {
  readonly matches: boolean;
  addEventListener: (type: "change", listener: () => void) => void;
  removeEventListener: (type: "change", listener: () => void) => void;
};
export type SpeedAnimationEnvironment = {
  now: () => number;
  requestFrame: (callback: (time: number) => void) => number;
  cancelFrame: (handle: number) => void;
  motion: MotionPreference;
};
export type SpeedAnimationCallbacks = {
  onFrame: (speed: number, complete: boolean) => void;
  onComplete: (allowCelebration: boolean) => void;
  onMotionChange: (reduced: boolean) => void;
};

/** One cancellable reveal; deterministic clock injection also supports regression tests. */
export function startSpeedLevelAnimation(
  targetMph: number,
  callbacks: SpeedAnimationCallbacks,
  environment: SpeedAnimationEnvironment,
): () => void {
  const target = Number.isFinite(targetMph) && targetMph > 0 ? targetMph : 0;
  const { motion, now, requestFrame, cancelFrame } = environment;
  const started = now();
  let frame = 0;
  let disposed = false;
  let finished = false;
  let last = 0;
  const finish = (reduced: boolean) => {
    if (disposed || finished) return;
    finished = true;
    cancelFrame(frame);
    callbacks.onFrame(target, true);
    callbacks.onComplete(!reduced && target > 0);
  };
  const changeMotion = () => {
    if (disposed) return;
    callbacks.onMotionChange(motion.matches);
    if (motion.matches) finish(true);
  };
  const tick = (time: number) => {
    if (disposed || finished) return;
    const fraction = Math.min(1, Math.max(0, (time - started) / SPEED_LEVEL_REVEAL_MS));
    if (fraction >= 1) {
      finish(motion.matches);
      return;
    }
    // Prevent floating-point rounding from reaching the endpoint before completion.
    const ceiling = Math.max(0, target - Math.max(target * Number.EPSILON * 4, 1e-9));
    last = Math.max(last, Math.min(ceiling, target * (1 - Math.pow(1 - fraction, 4))));
    callbacks.onFrame(last, false);
    frame = requestFrame(tick);
  };
  motion.addEventListener("change", changeMotion);
  callbacks.onMotionChange(motion.matches);
  if (motion.matches || target === 0) finish(true);
  else {
    callbacks.onFrame(0, false);
    frame = requestFrame(tick);
  }
  return () => {
    disposed = true;
    cancelFrame(frame);
    motion.removeEventListener("change", changeMotion);
  };
}
