import { Gauge } from "lucide-react";
import {
  handicapLabel,
  shortGameLevelLabel,
  type ShortGameResult,
  type ShortGameShot,
} from "@/lib/shortgame";
import { ShortGameDispersion } from "@/components/shortgame-visuals";

export function ShortGameReport({
  shots,
  result,
  prevScore,
}: {
  shots: ShortGameShot[];
  result: ShortGameResult;
  prevScore?: number | null;
}) {
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Närspel HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <p className="mt-2 inline-flex items-center rounded-full bg-flag/10 px-3 py-1 text-sm font-semibold text-flag">
          {shortGameLevelLabel(result.score)}
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
            Totalt avstånd
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
            {result.totalProximity.toFixed(2)} <span className="text-sm">m</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Snitt från hål
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
            {result.avgProximity.toFixed(2)} <span className="text-sm">m</span>
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Spridningsbild</p>
        <div className="mt-3">
          <ShortGameDispersion shots={shots} />
        </div>
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            Inom 2 m
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            Över 2 m
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Antal slag</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {result.within50cm}/{result.count}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">inom 50 cm</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {result.within1m}/{result.count}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">inom 1 m</p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {result.within2m}/{result.count}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">inom 2 m</p>
          </div>
        </div>
      </div>

      {result.analysis && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Analys</p>
          <p className="mt-1.5 text-sm leading-relaxed">{result.analysis}</p>
        </div>
      )}
    </div>
  );
}
