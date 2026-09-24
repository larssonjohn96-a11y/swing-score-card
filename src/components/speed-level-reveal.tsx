import { useEffect, useMemo, useRef, useState } from "react";
import { ChipCelebration } from "@/components/chip-celebration";
import {
  SPEED_LEVELS,
  TRACKMAN_TOUR_AVERAGES_URL,
  formatSpeedValue,
  nextLevelMessage,
  speedLevelProgress,
} from "@/lib/speed-levels";
import type { SpeedUnit } from "@/lib/speed-course";

const DURATION_MS = 3600;
const TRACK_MIN = 90;
const TRACK_MAX = 205;

function trackPosition(speedMph: number) {
  return Math.max(0, Math.min(100, ((speedMph - TRACK_MIN) / (TRACK_MAX - TRACK_MIN)) * 100));
}

export function SpeedLevelReveal({
  speedMph,
  unit,
  active,
  onComplete,
}: {
  speedMph: number;
  unit: SpeedUnit;
  active: boolean;
  onComplete: () => void;
}) {
  const validSpeed = Number.isFinite(speedMph) && speedMph > 0 ? speedMph : 0;
  const startSpeed = Math.max(0, Math.min(TRACK_MIN, validSpeed));
  const [displayMph, setDisplayMph] = useState(startSpeed);
  const [complete, setComplete] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const completedRef = useRef(false);
  const progress = speedLevelProgress(validSpeed);
  const achievedIndex = progress?.achieved
    ? SPEED_LEVELS.findIndex((level) => level.id === progress.achieved?.id)
    : -1;
  const displayIndex = useMemo(
    () => SPEED_LEVELS.reduce((last, level, index) => (displayMph >= level.mph ? index : last), -1),
    [displayMph],
  );
  const markerShouldBounce = !complete && displayIndex >= Math.max(0, achievedIndex - 2);

  useEffect(() => {
    if (!active) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let celebrationTimer = 0;
    let alive = true;
    const finish = (allowCelebration: boolean) => {
      if (!alive || completedRef.current) return;
      completedRef.current = true;
      cancelAnimationFrame(frame);
      setDisplayMph(validSpeed);
      setComplete(true);
      setReduced(!allowCelebration);
      onComplete();
      if (allowCelebration && validSpeed > 0) {
        setShowCelebration(true);
        celebrationTimer = window.setTimeout(() => {
          if (alive) setShowCelebration(false);
        }, progress?.achieved?.celebration === "high" ? 2400 : 1700);
      }
    };
    const onMotionChange = () => {
      if (media.matches) finish(false);
      setReduced(media.matches);
    };
    completedRef.current = false;
    setComplete(false);
    setShowCelebration(false);
    setReduced(media.matches);
    setDisplayMph(media.matches ? validSpeed : startSpeed);
    media.addEventListener("change", onMotionChange);
    if (media.matches || validSpeed <= 0) {
      finish(false);
    } else {
      const startedAt = performance.now();
      const tick = (now: number) => {
        if (!alive) return;
        const elapsed = Math.max(0, now - startedAt);
        const fraction = Math.min(1, elapsed / DURATION_MS);
        const eased = 1 - Math.pow(1 - fraction, 4);
        setDisplayMph(Math.min(validSpeed, startSpeed + (validSpeed - startSpeed) * eased));
        if (fraction < 1) frame = requestAnimationFrame(tick);
        else finish(true);
      };
      frame = requestAnimationFrame(tick);
    }
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(celebrationTimer);
      media.removeEventListener("change", onMotionChange);
    };
  }, [active, onComplete, progress?.achieved?.celebration, startSpeed, validSpeed]);

  if (!progress) {
    return (
      <section className="text-center" aria-live="polite">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-100">Ditt snabbaste slag</p>
        <h2 className="mt-4 text-3xl font-black">Ingen giltig bollhastighet</h2>
      </section>
    );
  }

  return (
    <section className="relative mx-auto flex w-full max-w-sm flex-col text-center" aria-live="polite">
      {showCelebration && !reduced && (
        <ChipCelebration
          key={`${speedMph}-${progress.achieved?.id ?? "start"}`}
          grand={progress.achieved?.celebration === "high"}
          confettiOnly={progress.achieved?.celebration !== "high"}
        />
      )}
      <style>{`@keyframes speedLevelFlap{0%,100%{transform:translate(-50%,-50%) rotate(0)}45%{transform:translate(-50%,-50%) rotate(-9deg)}75%{transform:translate(-50%,-50%) rotate(4deg)}}`}</style>
      <p className="text-xs font-black uppercase tracking-widest text-blue-100">Ditt snabbaste slag</p>
      <h2 className="mt-2 text-2xl font-black">Bollhastighet</h2>
      <div className="mt-3 text-[clamp(52px,18vw,76px)] font-black leading-none tabular-nums">
        {formatSpeedValue(displayMph, unit)}
        <span className="ml-2 text-xl text-blue-100">{unit}</span>
      </div>

      <div className="relative mx-auto my-5 h-48 w-28" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 rounded-full bg-white/20" />
        <div
          className="absolute bottom-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-white transition-[height] duration-75 motion-reduce:transition-none"
          style={{ height: `${trackPosition(displayMph)}%` }}
        />
        {SPEED_LEVELS.map((level, index) => {
          const passed = displayMph >= level.mph;
          return (
            <span
              key={level.id}
              className={`absolute left-1/2 h-1.5 -translate-x-1/2 rounded-full transition-all duration-200 ${passed ? "w-9 bg-white shadow-[0_0_12px_currentColor]" : "w-5 bg-white/30"}`}
              style={{ bottom: `${trackPosition(level.mph)}%` }}
            />
          );
        })}
        <span
          key={displayIndex}
          className="absolute left-1/2 h-7 w-7 rounded-full border-4 border-blue-600 bg-white shadow-lg"
          style={{
            bottom: `${trackPosition(displayMph)}%`,
            transform: "translate(-50%, 50%)",
            animation: markerShouldBounce ? "speedLevelFlap 180ms ease-out" : undefined,
          }}
        />
      </div>

      <div className={`min-h-24 transition-opacity duration-300 ${complete ? "opacity-100" : "opacity-0"}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Uppnådd nivå</p>
        <p className="mt-1 text-2xl font-black">{progress.achieved?.label ?? "Din startpunkt"}</p>
        <p className="mt-2 text-sm font-semibold text-white/90">{nextLevelMessage(validSpeed, unit)}</p>
      </div>

      <details className="mx-auto mt-1 max-w-xs text-left text-xs text-blue-100">
        <summary className="cursor-pointer py-2 text-center font-semibold underline underline-offset-4">Om nivåerna</summary>
        <p className="leading-relaxed">
          Klubbgolf, Låg-HCP-fart, Scratch-fart och hastighetsklubbarna är SG4-riktmärken – inte handicap eller officiella kvalgränser.
        </p>
        <p className="mt-2 leading-relaxed">
          LPGA 143 mph och PGA 171 mph jämför ditt bästa slag med tourernas genomsnitt för driverbollhastighet 2023.
        </p>
        <a
          href={TRACKMAN_TOUR_AVERAGES_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-semibold text-white underline underline-offset-4"
        >
          Källa: Trackman Tour Averages, publicerad 2 maj 2024
        </a>
      </details>
    </section>
  );
}