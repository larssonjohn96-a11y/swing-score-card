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

const labels = ["Topp 1 %", "Topp 10 %", "Topp 25 %", "Övre halvan", "Din startnivå"];

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
    "Din startnivå är satt. Nu har du ett eget resultat att utmana!",
  ][tier];
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
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
