import type { OffTeeResult } from "@/lib/offtee";

/**
 * Visuell spridningskarta – sex prickar på en förenklad fairwayremsa
 * istället för bias/dispersion/standardavvikelse som siffror. Medvetet
 * minimal: inga axlar, inga koordinater, inga tal runtomkring – bara en
 * bild man förstår på en sekund ("fem var bra, en förstörde"). Ersätter
 * INTE den mer detaljerade TeeDispersion-komponenten som togs bort
 * tidigare i sessionen just för att förenkla – bygger inte tillbaka den
 * komplexiteten.
 */
export function OffTeeDispersionMap({ shots }: { shots: OffTeeResult["shots"] }) {
  if (!shots.length) return null;

  const W = 320;
  const H = 130;
  const midY = H / 2;
  // Bredden på den ritade remsan motsvarar ±40 m sidled (ruff+OB-marginal),
  // så prickarna alltid ryms även vid extrema missar.
  const maxSidled = 40;

  const longest = Math.max(...shots.map((s) => s.total));
  const shortest = Math.min(...shots.map((s) => s.total));
  const range = Math.max(1, longest - shortest);

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Dina 6 slag
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto mt-3 block w-full"
        role="img"
        aria-label="Var dina sex slag landade"
      >
        <rect
          x={0}
          y={midY - (16 / maxSidled) * (H / 2) - 14}
          width={W}
          height={2 * ((16 / maxSidled) * (H / 2) + 14)}
          className="fill-primary/10"
          rx={10}
        />
        <rect
          x={0}
          y={midY - (16 / maxSidled) * (H / 2)}
          width={W}
          height={2 * (16 / maxSidled) * (H / 2)}
          className="fill-primary/20"
          rx={8}
        />
        <line
          x1={0}
          y1={midY}
          x2={W}
          y2={midY}
          className="stroke-primary/40"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {shots.map((s, i) => {
          const t = range ? (s.total - shortest) / range : 0.5;
          const x = 24 + t * (W - 48);
          const sign = s.direction === "left" ? -1 : 1;
          const y = midY + sign * Math.min(1, s.sidled / maxSidled) * (H / 2 - 10);
          const color = s.outcome.isOB
            ? "fill-destructive"
            : s.outcome.inFairway
              ? "fill-primary"
              : "fill-sand";
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={7}
              className={`${color} stroke-card`}
              strokeWidth={2}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Fairway
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sand" />
          Ruff
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          OB
        </span>
      </div>
    </div>
  );
}
