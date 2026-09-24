import { useEffect, useRef, useState } from "react";
import { ChipCelebration } from "@/components/chip-celebration";
import {
  SPEED_LEVELS,
  TRACKMAN_TOUR_AVERAGES_URL,
  formatAnimatedSpeedValue,
  formatSpeedValue,
  nextLevelMessage,
  speedLevelProgress,
} from "@/lib/speed-levels";
import { startSpeedLevelAnimation } from "@/lib/speed-level-animation";
import type { SpeedUnit } from "@/lib/speed-course";

export function SpeedLevelReveal({ speedMph, unit, active, onComplete }: {
  speedMph: number;
  unit: SpeedUnit;
  active: boolean;
  onComplete: () => void;
}) {
  const validSpeed = Number.isFinite(speedMph) && speedMph > 0 ? speedMph : 0;
  const [displayMph, setDisplayMph] = useState(0);
  const [complete, setComplete] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const completeCallback = useRef(onComplete);
  useEffect(() => { completeCallback.current = onComplete; }, [onComplete]);
  const progress = speedLevelProgress(validSpeed);
  const high = progress?.achieved?.celebration === "high";

  useEffect(() => {
    setComplete(false);
    setShowCelebration(false);
    setDisplayMph(0);
    if (!active) return;
    let celebrationTimer = 0;
    const stop = startSpeedLevelAnimation(validSpeed, {
      onFrame: (value, done) => { setDisplayMph(value); setComplete(done); },
      onMotionChange: (value) => {
        setReduced(value);
        if (value) {
          window.clearTimeout(celebrationTimer);
          setShowCelebration(false);
        }
      },
      onComplete: (allowCelebration) => {
        if (allowCelebration) {
          setShowCelebration(true);
          celebrationTimer = window.setTimeout(() => setShowCelebration(false), high ? 2400 : 1700);
        }
        completeCallback.current();
      },
    }, {
      now: () => performance.now(),
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (handle) => window.cancelAnimationFrame(handle),
      motion: window.matchMedia("(prefers-reduced-motion: reduce)"),
    });
    return () => { stop(); window.clearTimeout(celebrationTimer); };
  }, [active, validSpeed, high]);

  if (!progress) {
    return <section className="my-auto shrink-0 text-center" role="status">
      <p className="text-sm font-bold uppercase tracking-widest text-blue-100">Ditt snabbaste slag</p>
      <h2 className="mt-4 text-3xl font-black">Ingen giltig bollhastighet</h2>
    </section>;
  }

  const visibleProgress = speedLevelProgress(displayMph);
  const current = complete ? progress.achieved : visibleProgress?.achieved;
  const currentIndex = SPEED_LEVELS.findIndex((level) => level.id === current?.id);
  const finalIndex = SPEED_LEVELS.findIndex((level) => level.id === progress.achieved?.id);
  const scaleEnd = Math.max(validSpeed, progress.next?.mph ?? SPEED_LEVELS[SPEED_LEVELS.length - 1].mph) * 1.07;
  const position = (value: number) => Math.max(0, Math.min(100, value / scaleEnd * 100));
  const flapper = !complete && !reduced && currentIndex >= Math.max(0, finalIndex - 2);
  const nextMessage = nextLevelMessage(validSpeed, unit);

  return (
    <section className="relative mx-auto my-auto flex w-full max-w-sm shrink-0 flex-col text-center" data-speed-level-reveal data-complete={complete}>
      {active && showCelebration && !reduced && <ChipCelebration grand={high} confettiOnly={!high} />}
      <style>{`
        @keyframes speedLevelFlap{0%,100%{transform:rotate(0)}45%{transform:rotate(-12deg)}75%{transform:rotate(5deg)}}
        @keyframes speedLevelTick{0%{filter:drop-shadow(0 0 8px white)}100%{filter:none}}
        .speed-level-flap{animation:speedLevelFlap .22s ease-out}
        .speed-level-tick{animation:speedLevelTick .45s ease-out}
        @media(prefers-reduced-motion:reduce){.speed-level-flap,.speed-level-tick{animation:none!important}}
      `}</style>
      <p className="text-xs font-black uppercase tracking-widest text-blue-100">Ditt snabbaste slag</p>
      <h2 className="mt-1 text-2xl font-black">Bollhastighet</h2>
      <div aria-hidden="true" className="mt-3 flex items-baseline justify-center gap-2 whitespace-nowrap font-black leading-none tabular-nums">
        <span className="text-[clamp(44px,16vw,68px)]" data-speed-value>
          {complete ? formatSpeedValue(validSpeed, unit) : formatAnimatedSpeedValue(displayMph, unit)}
        </span>
        <span className="text-lg text-blue-100">{unit}</span>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {complete ? `${formatSpeedValue(validSpeed, unit)} ${unit}. ${current?.label ?? "Din startpunkt"}. ${nextMessage}` : "Jämför din bollhastighet…"}
      </span>

      <div className="relative mx-auto my-4 h-[clamp(170px,28dvh,230px)] w-56" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 rounded-full bg-white/20" />
        <div className="absolute bottom-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-white" style={{ height: `${position(displayMph)}%` }} />
        {SPEED_LEVELS.filter((level) => level.mph <= (progress.next?.mph ?? scaleEnd)).map((level) => {
          const passed = displayMph >= level.mph;
          return <span key={`${level.id}-${passed}`} className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap ${passed ? "text-white" : "text-white/35"} ${passed && !complete && !reduced ? "speed-level-tick" : ""}`} style={{ bottom: `${position(level.mph)}%` }}>
            <span className={`h-1 rounded-full ${passed ? "w-9 bg-white" : "w-6 bg-white/30"}`} />
            <span className="text-[10px] font-bold">{level.label}</span>
          </span>;
        })}
        <span className="absolute left-1/2 z-10" style={{ bottom: `${position(displayMph)}%`, transform: "translate(-50%, 50%)" }}>
          <span key={currentIndex} className={`block h-3 w-8 rounded-full border-2 border-blue-600 bg-white shadow-lg ${flapper ? "speed-level-flap" : ""}`} />
        </span>
      </div>

      <div className="min-h-24">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-100">{complete ? "Uppnådd nivå" : "Du passerar"}</p>
        <p className="mt-1 text-2xl font-black" data-current-level>{current?.label ?? (complete ? "Din startpunkt" : "På väg…")}</p>
        <p className={`mt-2 min-h-10 text-sm font-semibold text-white/90 ${complete ? "visible" : "invisible"}`} aria-hidden={!complete}>
          {complete ? nextMessage : "Nästa mål"}
        </p>
      </div>
    </section>
  );
}
