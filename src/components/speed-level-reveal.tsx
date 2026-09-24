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
  const achievedIndex = Math.max(0, SPEED_LEVELS.findIndex((level) => level.id === progress.achieved?.id));
  const firstVisibleIndex = Math.max(0, achievedIndex - 3);
  const lastVisibleIndex = Math.min(SPEED_LEVELS.length - 1, Math.max(achievedIndex + 1, firstVisibleIndex + 4));
  const visibleLevels = SPEED_LEVELS.slice(firstVisibleIndex, lastVisibleIndex + 1).filter((level) => level.id !== "lpga-average");
  const lowerAnchor = firstVisibleIndex === 0 ? 0 : Math.max(0, visibleLevels[0].mph - 10);
  const upperAnchor = Math.max(validSpeed, visibleLevels.at(-1)?.mph ?? validSpeed) + 8;
  const position = (value: number) =>
    Math.max(0, Math.min(100, ((value - lowerAnchor) / Math.max(1, upperAnchor - lowerAnchor)) * 100));
  const achievedCount = SPEED_LEVELS.filter((level) => validSpeed >= level.mph).length;
  const previousLevel = progress.achieved;
  const nextLevel = progress.next;
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

      <div className="mx-auto my-4 grid h-[clamp(190px,30dvh,250px)] w-full max-w-xs grid-cols-[1fr_44px_1fr] gap-3" aria-hidden="true">
        <div className="relative">
          {visibleLevels.map((level) => {
            const passed = displayMph >= level.mph;
            const finalPassed = validSpeed >= level.mph;
            return (
              <div
                key={level.id}
                className="absolute right-0 flex -translate-y-1/2 items-center justify-end gap-2"
                style={{ bottom: `calc(${position(level.mph)}% - 10px)` }}
              >
                <span className={`max-w-[180px] text-right text-[11px] font-bold leading-tight ${passed ? "text-white" : "text-white/45"}`}>
                  {level.id === "pga-average" ? "PGA-snitt" : level.label}
                </span>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${passed ? "border-emerald-400 bg-emerald-400 text-white" : "border-white/35 text-transparent"}`}>
                  {passed && finalPassed ? "✓" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mx-auto h-full w-8 overflow-hidden rounded-full border-2 border-white/55 bg-white/10 shadow-inner">
          <div
            className="absolute inset-x-0 bottom-0 rounded-b-full bg-white transition-[height] duration-75 motion-reduce:transition-none"
            style={{ height: `${position(displayMph)}%` }}
          />
          <span
            className="absolute left-1/2 z-10 h-3 w-10 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white shadow-lg"
            style={{ bottom: `calc(${position(displayMph)}% - 6px)` }}
          />
        </div>
        <div aria-hidden="true" />
      </div>

      <div className="min-h-24 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-100">
          {complete ? "Din nivå" : "Du passerar"}
        </p>
        <p className="mt-1 text-2xl font-black" data-current-level>
          {current?.id === "pga-average" ? "PGA-snitt" : current?.label ?? (complete ? "Din startpunkt" : "På väg…")}
        </p>
        {complete && (
          <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-white/90">
            {previousLevel
              ? `Du är förbi ${achievedCount} ${achievedCount === 1 ? "nivå" : "nivåer"} – senast ${previousLevel.id === "pga-average" ? "PGA-snitt" : previousLevel.label}.`
              : "Du är på väg mot din första nivå."}
            {nextLevel ? ` Nästa är ${nextLevel.id === "pga-average" ? "PGA-snitt" : nextLevel.label} · ${nextLevelMessage(validSpeed, unit)?.replace(/^Bara /, "").replace(/^Nästa mål · /, "")}.` : " Du har passerat alla nivåer."}
          </p>
        )}
      </div>
    </section>
  );
}
