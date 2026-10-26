import { useEffect, useMemo, useRef, useState } from "react";
import type { TempoMode } from "@/lib/tempo-trainer";
import {
  IDLE_MOTION, tempoArc, tempoMotionAt,
  type TempoClock, type TempoCue, type TempoMotionFrame,
} from "@/lib/tempo-visual";

type Props = {
  mode: TempoMode;
  ratio: number;
  total: number;
  running: boolean;
  haptics: boolean;
  clock: () => TempoClock | null;
};

const phaseText: Record<TempoMotionFrame["phase"], string> = {
  idle: "Redo", countdown: "Förbered", back: "Baksving",
  down: "Nedsving", impact: "Träff", rest: "Nästa slag",
};

/**
 * Visual and audible cues read the same AudioContext timeline.
 * Vibration is best-effort: browser support varies and haptics are not sample-accurate.
 */
export function TempoMotion({ mode, ratio, total, running, haptics, clock }: Props) {
  const [frame, setFrame] = useState<TempoMotionFrame>(IDLE_MOTION);
  const lastVibration = useRef("");
  const arc = useMemo(() => tempoArc(mode), [mode]);

  useEffect(() => {
    if (!running) {
      setFrame(IDLE_MOTION);
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
          const durations: Record<TempoCue, number> = { start: 15, top: 24, impact: 38 };
          try { navigator.vibrate(durations[next.cue]); } catch { /* unsupported device */ }
        }
      }
      animationId = window.requestAnimationFrame(update);
    };
    animationId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationId);
  }, [running, clock, haptics]);

  const dot = arc.point(frame.progress);
  const atTop = frame.phase === "down" && frame.pulse > 0;
  const impact = frame.phase === "impact";
  const isMoving = frame.phase === "back" || frame.phase === "down";
  const showPulse = atTop || impact || (frame.phase === "back" && frame.pulse > 0);
  const ringCenter = atTop ? arc.top : impact ? arc.start : dot;
  const ringRadius = 18 + 25 * frame.pulse;
  const progressText = frame.phase === "countdown" ? String(frame.countdown) : `${ratio}:1`;
  const subText = frame.phase === "countdown" ? "STARTAR SNART" : phaseText[frame.phase];

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full select-none"
      viewBox="0 0 360 440" preserveAspectRatio="xMidYMid meet"
      aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="sg4-tempo-halo" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#174a91" stopOpacity=".5" />
          <stop offset="1" stopColor="#081832" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sg4-tempo-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2f7dff" />
          <stop offset="1" stopColor="#76c6ff" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="214" r="176" fill="url(#sg4-tempo-halo)" />
      <circle cx="180" cy="214" r="109" fill="#102a50" fillOpacity=".54" stroke="#7aabeb" strokeOpacity=".12" />
      <circle cx="180" cy="214" r="83" fill="none" stroke="#7aabeb" strokeOpacity=".09" />
      {mode === "putt" ? (
        <>
          <path d={`M ${arc.center.x} ${arc.center.y} L ${arc.start.x} ${arc.start.y}`}
            fill="none" stroke="#c5ddff" strokeWidth="2" strokeDasharray="4 9" strokeOpacity=".2" />
          <path d={`M ${arc.center.x} ${arc.center.y} L ${dot.x} ${dot.y}`}
            fill="none" stroke="#a7d8ff" strokeWidth="3.5" strokeOpacity=".83" strokeLinecap="round" />
          <circle cx={arc.center.x} cy={arc.center.y} r="8" fill="#8cbaff" fillOpacity=".6" />
        </>
      ) : (
        <path d={`M ${arc.center.x} ${arc.center.y} L ${arc.start.x} ${arc.start.y}`}
          stroke="#7aabeb" strokeOpacity=".13" strokeDasharray="4 9" />
      )}
      <path d={arc.path} fill="none" stroke="#8eb7ef" strokeOpacity=".16"
        strokeWidth="11" strokeLinecap="round" />
      <path d={arc.path} fill="none" stroke="url(#sg4-tempo-stroke)"
        pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - frame.progress}
        strokeWidth="11" strokeLinecap="round" />
      <circle cx={arc.top.x} cy={arc.top.y} r="6" fill="#d2e7ff" fillOpacity=".48" />
      <circle cx={arc.start.x} cy={arc.start.y} r="6" fill="#d2e7ff" fillOpacity=".48" />
      {showPulse ? (
        <circle cx={ringCenter.x} cy={ringCenter.y} r={ringRadius}
          fill="none" stroke={impact ? "#ffffff" : "#6cb6ff"}
          strokeWidth={impact ? 6 : 4} strokeOpacity={Math.min(.8, frame.pulse * .75)} />
      ) : null}
      <circle cx={dot.x} cy={dot.y} r={isMoving ? 17 : 13} fill="#3e97ff" opacity=".23" />
      <circle cx={dot.x} cy={dot.y} r="9" fill="#e9f6ff" />
      <circle cx={dot.x} cy={dot.y} r="4" fill="#2d89ff" />
      <text x="194" y="206" textAnchor="middle" fill="#f8fbff" fontSize="69"
        fontWeight="750" letterSpacing="-3">{progressText}</text>
      <text x="194" y="237" textAnchor="middle" fill="#a9c9f8" fontSize="12"
        letterSpacing="2.1" fontWeight="700">{subText.toUpperCase()}</text>
      <text x="194" y="263" textAnchor="middle" fill="#729bce" fontSize="12">{total.toFixed(2).replace(".", ",")} s</text>
      <text x={arc.top.x - (mode === "putt" ? 10 : 0)} y={arc.top.y - 21}
        textAnchor="middle" fill="#96b8e6" fontSize="10" letterSpacing="1.5">TOPP</text>
      <text x={arc.start.x + (mode === "putt" ? 30 : 0)} y={arc.start.y + 29}
        textAnchor="middle" fill="#96b8e6" fontSize="10" letterSpacing="1.2">TRÄFF</text>
    </svg>
  );
}
