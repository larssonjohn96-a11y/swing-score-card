import { useEffect, useState } from "react";
import { ChipCelebration } from "@/components/chip-celebration";
import { Users, Globe2 } from "lucide-react";
import { ballSpeedPercentile } from "@/lib/speed";

export function speedPyramidTier(percentile: number) {
  const thresholds = [99, 97, 95, 90, 75, 50, 25, 10];
  const tier = thresholds.findIndex((threshold) => percentile >= threshold);
  return tier === -1 ? thresholds.length : tier;
}

const labels = ["Topp 1 %", "Topp 3 %", "Topp 5 %", "Topp 10 %", "Topp 25 %", "Övre halvan", "Topp 75 %", "Topp 90 %", "Bas"];

export function SpeedComparisonPyramid({
  title,
  ballSpeed,
  mean,
  sd,
  ageGroup = false,
}: {
  title: string;
  ballSpeed: number;
  mean: number;
  sd: number;
  ageGroup?: boolean;
}) {
  const tier = speedPyramidTier(ballSpeedPercentile(ballSpeed, mean, sd));
  const group = ageGroup ? "i din åldersgrupp" : "bland alla golfare";
  const comment = [
    `Du är i den absoluta toppen ${group}!`,
    `Exceptionell bollhastighet – du tillhör topp 3 % ${group}.`,
    `Mycket stark bollhastighet – du tillhör topp 5 % ${group}.`,
    `Riktigt stark fart – du tillhör toppskiktet ${group}.`,
    `Stark bollhastighet – du ligger i den övre fjärdedelen ${group}.`,
    `Snyggt jobbat! Du ligger i den övre halvan ${group}.`,
    ageGroup
      ? "Bra jobbat! Du är en bit på vägen i din åldersgrupp. Fortsätt så!"
      : "Bra jobbat! Du är en bit på vägen – fortsätt så!",
    ageGroup
      ? "Bra kämpat! Det finns mer fart att upptäcka i din åldersgrupp. Fortsätt träna i din takt!"
      : "Bra kämpat! Fortsätt träna i din takt och upptäck din fart!",
    "Bra att du testar! Varje försök är en chans att lära känna din sving. Fortsätt så!",
  ][tier];
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const start = performance.now();
    setVisibleCharacters(motion.matches ? comment.length : 0);
    const tick = (now: number) => {
      const count = Math.min(comment.length, Math.max(0, Math.floor((now - start - 200) / 28)));
      setVisibleCharacters(count);
      if (count < comment.length) frame = requestAnimationFrame(tick);
    };
    if (!motion.matches) frame = requestAnimationFrame(tick);
    const stopAnimation = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        setVisibleCharacters(comment.length);
      }
    };
    motion.addEventListener("change", stopAnimation);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", stopAnimation);
    };
  }, [comment]);
  return (
    <section
      className={`rounded-3xl border p-5 ${ageGroup ? "border-sky-200 bg-sky-50" : "border-violet-200 bg-violet-50"}`}
    >
      {tier <= 5 && <ChipCelebration key={`${ageGroup}-${tier}`} grand={tier <= 3} subtle={tier > 3} />}
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ageGroup ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}
        >
          {ageGroup ? <Users className="h-6 w-6" /> : <Globe2 className="h-6 w-6" />}
        </span>
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
      </div>
      <style>{`@keyframes speed-tier-glow { from { opacity: .35; } to { opacity: 1; } } .speed-tier-glow { animation: speed-tier-glow 1.2s ease-out both; } @media (prefers-reduced-motion: reduce) { .speed-tier-glow { animation: none; } }`}</style>
      <svg
        viewBox={`0 0 340 ${labels.length * 36 + 12}`}
        className="mx-auto mt-3 w-full max-w-xs"
        role="img"
        aria-label={`${title}: ${labels[tier]}. Den blå delen visar din nivå.`}
      >
        {labels.map((label, i) => {
          const y1 = 6 + i * 36,
            y2 = y1 + 32;
          const top = i * (84 / labels.length),
            bottom = (i + 1) * (84 / labels.length);
          return (
            <g key={label} data-active={i === tier ? "true" : "false"}>
              <polygon
                points={`${96 - top},${y1} ${96 + top},${y1} ${96 + bottom},${y2} ${96 - bottom},${y2}`}
                fill={i === tier ? "#1558ff" : "#eef1f5"}
                stroke={i === tier ? "#1558ff" : "#dce2ea"}
                strokeWidth="1"
                className={i === tier && tier > 5 ? "speed-tier-glow" : undefined}
              />
              <text
                x="198"
                y={y1 + 23}
                fontSize="14"
                fontWeight={i === tier ? "800" : "500"}
                fill={i === tier ? "#1558ff" : "#64748b"}
              >
                {label}
                {i === tier ? " · Du" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="relative mt-1 text-base font-bold leading-relaxed text-blue-700">
        <span className="sr-only">{comment}</span>
        <span aria-hidden="true" className="invisible block">
          {comment}
        </span>
        <span aria-hidden="true" className="absolute inset-0">
          {comment.slice(0, visibleCharacters)}
        </span>
      </p>
    </section>
  );
}
