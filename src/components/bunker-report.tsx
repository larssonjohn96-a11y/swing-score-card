import { Gauge } from "lucide-react";
import {
  BUNKER_INTERVALS,
  bunkerLevelLabel,
  handicapLabel,
  type BunkerResult,
  type BunkerShot,
} from "@/lib/bunker";

function dispersionTone(proximity: number): string {
  if (proximity <= 1) return "fill-primary";
  if (proximity <= 2) return "fill-chart-4";
  if (proximity <= 3) return "fill-sand";
  return "fill-destructive";
}

function BunkerDispersion({ shots }: { shots: BunkerShot[] }) {
  const size = 260;
  const c = size / 2;
  const maxRadius = c - 24;
  const maxProximity = 10; // "Kom inte upp ur bunker"-alternativets värde

  const played = shots.filter((s) => s.interval);
  const angleStep = (2 * Math.PI) / Math.max(1, played.length);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full"
      role="img"
      aria-label="Spridningsbild för bunkerslagen"
    >
      <circle cx={c} cy={c} r={maxRadius} className="fill-sand/40" />
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle
          key={f}
          cx={c}
          cy={c}
          r={maxRadius * f}
          fill="none"
          className="stroke-background/40"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      {played.map((s, i) => {
        const interval = BUNKER_INTERVALS.find((iv) => iv.key === s.interval);
        const proximity = interval?.midpoint ?? 0;
        const notOut = s.interval === "not-out";
        const r = Math.min(maxRadius, (proximity / maxProximity) * maxRadius);
        const angle = i * angleStep - Math.PI / 2;
        const x = c + r * Math.cos(angle);
        const y = c + r * Math.sin(angle);
        return (
          <circle
            key={s.index}
            cx={x}
            cy={y}
            r={notOut ? 7 : 6}
            className={notOut ? "fill-destructive" : dispersionTone(proximity)}
            stroke="black"
            strokeOpacity="0.25"
          />
        );
      })}
      <circle cx={c} cy={c} r="4" className="fill-foreground" />
    </svg>
  );
}

export function BunkerReport({
  shots,
  result,
  prevScore,
}: {
  shots: BunkerShot[];
  result: BunkerResult;
  prevScore?: number | null;
}) {
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Bunker HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <p className="mt-2 inline-flex items-center rounded-full bg-flag/10 px-3 py-1 text-sm font-semibold text-flag">
          {bunkerLevelLabel(result.score)}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          Score {result.score}/100
        </p>
        {delta !== null && (
          <p className={`mt-2 text-sm ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} sedan förra testet
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Snitt från hål
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
            {result.avgProximity.toFixed(2)} <span className="text-sm">m</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Kom inte upp
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
            {result.notOutCount}/{result.count}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Spridningsbild</p>
        <div className="mt-3">
          <BunkerDispersion shots={shots} />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            Inom 1 m
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />
            Inom 2 m
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sand" />
            Inom 3 m
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            Utanför 3 m / kom inte upp
          </span>
        </div>
      </div>

      {(result.bestLie || result.worstLie) && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Per läge</p>
          <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
            {result.bestLie && (
              <p>
                Bäst: <span className="text-foreground">{result.bestLie}</span>
              </p>
            )}
            {result.worstLie && (
              <p>
                Svagast: <span className="text-foreground">{result.worstLie}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {result.analysis && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Analys</p>
          <p className="mt-1.5 text-sm leading-relaxed">{result.analysis}</p>
        </div>
      )}
    </div>
  );
}
