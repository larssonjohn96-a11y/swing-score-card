/**
 * Normalfördelningskurva som visar var spelarens Driving HCP ligger jämfört
 * med andra golfare. Populationsparametrarna är en uppskattning (inte
 * exakt uppmätt data), kalibrerad ungefär mot appens egna befintliga
 * HCP-benchmarknivåer (30/20/10/0/+3/Tour) för driving.
 */
const POPULATION_MEAN = 17;
const POPULATION_SD = 8;

/** Abramowitz & Stegun-approximation av felfunktionen erf(x). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(x: number, mean: number, sd: number): number {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

/** Andel golfare (0–100) som har SÄMRE (högre) HCP än `hcp`. */
export function betterThanPct(hcp: number): number {
  const worseFraction = 1 - normalCdf(hcp, POPULATION_MEAN, POPULATION_SD);
  return Math.max(1, Math.min(99, Math.round(worseFraction * 100)));
}

function gaussian(x: number, mean: number, sd: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
}

export function DrivingHcpBellCurve({ hcp }: { hcp: number }) {
  const w = 320;
  const h = 140;
  const padBottom = 22;
  const minX = POPULATION_MEAN - 3.2 * POPULATION_SD;
  const maxX = POPULATION_MEAN + 3.2 * POPULATION_SD;
  const peak = gaussian(POPULATION_MEAN, POPULATION_MEAN, POPULATION_SD);

  const xFor = (v: number) => ((v - minX) / (maxX - minX)) * w;
  const yFor = (density: number) => h - padBottom - (density / peak) * (h - padBottom - 10);

  const points = Array.from({ length: 61 }, (_, i) => {
    const x = minX + (i / 60) * (maxX - minX);
    return { x: xFor(x), y: yFor(gaussian(x, POPULATION_MEAN, POPULATION_SD)) };
  });
  const path =
    `M${points[0].x} ${h - padBottom} ` +
    points.map((p) => `L${p.x} ${p.y}`).join(" ") +
    ` L${points[points.length - 1].x} ${h - padBottom} Z`;

  const clampedHcp = Math.max(minX, Math.min(maxX, hcp));
  const markerX = xFor(clampedHcp);
  const pct = betterThanPct(hcp);

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Var du ligger till
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Bättre än ungefär <span className="font-semibold text-foreground">{pct}%</span> av golfare
        (uppskattning).
      </p>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-3 h-32 w-full"
        role="img"
        aria-label="Fördelning av Driving HCP"
      >
        <line
          x1={0}
          y1={h - padBottom}
          x2={w}
          y2={h - padBottom}
          className="stroke-border"
          strokeWidth="1"
        />
        <path d={path} className="fill-primary/12 stroke-primary/40" strokeWidth="1.5" />

        <line
          x1={markerX}
          y1={10}
          x2={markerX}
          y2={h - padBottom}
          className="stroke-flag"
          strokeWidth="2"
        />
        <circle cx={markerX} cy={10} r="4" className="fill-flag" />
        <text
          x={Math.max(24, Math.min(w - 24, markerX))}
          y={4}
          textAnchor="middle"
          className="fill-flag text-[10px] font-bold"
        >
          Du
        </text>

        <text x={4} y={h - padBottom + 14} className="fill-muted-foreground text-[9px]">
          Bättre
        </text>
        <text
          x={w - 4}
          y={h - padBottom + 14}
          textAnchor="end"
          className="fill-muted-foreground text-[9px]"
        >
          Sämre
        </text>
      </svg>
    </div>
  );
}
