import { useEffect, useMemo, useRef, useState } from "react";
import type { TempoMode } from "@/lib/tempo-trainer";
import {
  IDLE_MOTION, tempoArc, tempoMotionAt,
  type TempoClock, type TempoCue, type TempoMotionFrame,
} from "@/lib/tempo-visual";

type Props = {
  mode: TempoMode;
  running: boolean;
  finished: boolean;
  haptics: boolean;
  clock: () => TempoClock | null;
};

/** One marker only, travelling backwards, through impact, and all the way to finish. */
export function TempoMotion({ mode, running, finished, haptics, clock }: Props) {
  const [frame, setFrame] = useState<TempoMotionFrame>(IDLE_MOTION);
  const lastVibration = useRef("");
  const arc = useMemo(() => tempoArc(mode), [mode]);

  useEffect(() => {
    if (!running) {
      setFrame(finished ? { ...IDLE_MOTION, phase: "finish", progress: 1 } : IDLE_MOTION);
      lastVibration.current = "";
      return;
    }
    let animationId = 0;
    const update = () => {
      const next = tempoMotionAt(clock());
      setFrame(next);
      if (haptics && next.cue && next.cycle >= 0 &&
        typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        const key = `${next.cycle}:${next.cue}`;
        if (key !== lastVibration.current) {
          lastVibration.current = key;
          const ms: Record<TempoCue, number> = { start: 16, top: 27, impact: 38 };
          try { navigator.vibrate(ms[next.cue]); } catch { /* unsupported browser */ }
        }
      }
      animationId = window.requestAnimationFrame(update);
    };
    animationId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationId);
  }, [running, finished, clock, haptics]);

  const onBack = frame.phase === "back" || frame.phase === "down";
  const onFinish = frame.phase === "through" || frame.phase === "finish" || frame.phase === "rest";
  const point = onBack ? arc.backPoint(frame.progress)
    : onFinish ? arc.throughPoint(frame.progress) : arc.start;
  const backStroke = frame.phase === "back" ? frame.progress
    : frame.phase === "down" ? 1
    : onFinish ? 1 : 0;
  const throughStroke = onFinish ? frame.progress : 0;
  const cueFlash = Boolean(frame.cue === "top" || frame.cue === "impact");
  const radius = cueFlash ? 16 : 12;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full select-none"
      viewBox="0 0 360 480" preserveAspectRatio="xMidYMid meet"
      aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sg4-motion-blue" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#367cff" />
          <stop offset="1" stopColor="#74c7ff" />
        </linearGradient>
      </defs>
      <path d={arc.backPath} fill="none" stroke="#89abdf" strokeOpacity=".23"
        strokeWidth="5" strokeLinecap="round" />
      <path d={arc.throughPath} fill="none" stroke="#89abdf" strokeOpacity=".23"
        strokeWidth="5" strokeLinecap="round" />
      <path d={arc.backPath} fill="none" stroke="url(#sg4-motion-blue)"
        strokeOpacity={onFinish ? .44 : 1} strokeWidth="6" strokeLinecap="round"
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - backStroke} />
      <path d={arc.throughPath} fill="none" stroke="url(#sg4-motion-blue)"
        strokeWidth="6" strokeLinecap="round"
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - throughStroke} />
      <text x={arc.top.x - 8} y={arc.top.y - 24} textAnchor="middle"
        fill="#a3c3ee" fontSize="12" fontWeight="600">TOPP</text>
      <text x={arc.finish.x + 3} y={arc.finish.y - 24} textAnchor="middle"
        fill="#a3c3ee" fontSize="12" fontWeight="600">FINISH</text>
      <text x={arc.start.x} y={arc.start.y + 30} textAnchor="middle"
        fill="#a3c3ee" fontSize="11" fontWeight="600">IMPACT</text>
      <circle cx={point.x} cy={point.y} r={radius}
        fill={cueFlash ? "#ffffff" : "#68b2ff"}
        stroke="none" />
    </svg>
  );
}
