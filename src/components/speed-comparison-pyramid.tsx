import { Users, Globe2 } from "lucide-react";
import { ballSpeedPercentile } from "@/lib/speed";

export function speedPyramidTier(percentile: number) {
  return percentile >= 99
    ? 0
    : percentile >= 90
      ? 1
      : percentile >= 75
        ? 2
        : percentile >= 50
          ? 3
          : 4;
}

const labels = ["Topp 1 %", "Topp 10 %", "Topp 25 %", "Övre halvan", "Nedre halvan"];

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
    `Riktigt stark fart – du tillhör toppskiktet ${group}.`,
    `Stark bollhastighet – du ligger i den övre fjärdedelen ${group}.`,
    `Du ligger i den övre halvan ${group}.`,
    "Här finns mer fart att upptäcka – utmana ditt eget resultat!",
  ][tier];
  return (
    <section
      className={`rounded-3xl border p-5 ${ageGroup ? "border-sky-200 bg-sky-50" : "border-violet-200 bg-violet-50"}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ageGroup ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"}`}
        >
          {ageGroup ? <Users className="h-6 w-6" /> : <Globe2 className="h-6 w-6" />}
        </span>
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
      </div>
      <svg
        viewBox="0 0 320 208"
        className="mx-auto mt-3 w-full max-w-xs"
        role="img"
        aria-label={`${title}: ${labels[tier]}. Den blå delen visar din nivå.`}
      >
        {labels.map((label, i) => {
          const y1 = 6 + i * 38,
            y2 = y1 + 34;
          const top = i * 17,
            bottom = (i + 1) * 17;
          return (
            <g key={label} data-active={i === tier ? "true" : "false"}>
              <polygon
                points={`${96 - top},${y1} ${96 + top},${y1} ${96 + bottom},${y2} ${96 - bottom},${y2}`}
                fill={i === tier ? "#1558ff" : "#eef1f5"}
                stroke={i === tier ? "#1558ff" : "#dce2ea"}
                strokeWidth="1"
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
      <p className="mt-1 text-base font-bold leading-relaxed text-blue-700">{comment}</p>
    </section>
  );
}
