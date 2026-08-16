import { Gauge } from "lucide-react";
import {
  dispersionStats,
  groupScores,
  handicapLabel,
  precisionResult,
  scoreBand,
  type PrecisionShot,
} from "@/lib/precision";
import type { Device, MeasurementContext } from "@/lib/speed";
import { HcpBellCurve } from "@/components/hcp-bell-curve";

const nf = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/**
 * Förenklad analys för ett genomfört Approach Test: Approach HCP är hela
 * poängen, bellcurven visar var man ligger, och därunder bara tre nyckeltal
 * och nivån per avstånd.
 */
export function PrecisionReport({
  shots,
  prevScore,
  compact = false,
  context,
  device,
}: {
  shots: PrecisionShot[];
  prevScore?: number | null;
  compact?: boolean;
  context?: MeasurementContext;
  device?: Device;
}) {
  const result = precisionResult(shots);
  const groups = groupScores(result).filter((g) => g.count > 0);
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;
  const stats = dispersionStats(shots);

  return (
    <div className="space-y-8">
      {/* 1. Huvudresultat – Approach HCP */}
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Approach HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Approach Score</span>
          <span className={`font-semibold ${band.text}`}>{result.score}/100</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${band.bg} ${band.text}`}>
            {band.label}
          </span>
        </div>
        {delta !== null && (
          <p className={`mt-1 text-xs ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} poäng sedan förra testet
          </p>
        )}
        {device && (
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            {context === "simulator" ? "Simulator" : "Range"} · {device}
          </p>
        )}
      </section>

      {/* 2. Bellcurve – var ligger du */}
      <section>
        <HcpBellCurve hcp={result.handicap} />
      </section>

      {/* 3. Tre nyckeltal */}
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Snitt till flagg" value={`${nf(result.avgProximity)} m`} />
        <Stat label="Greenträffar" value={`${stats.greens}/${stats.count}`} />
        <Stat label="Snitt i %" value={`${nf(result.avgProximityPct)} %`} />
      </section>

      {/* 4. Nivå per avstånd – kompakt */}
      {groups.length > 0 && (
        <section>
          <h2 className="font-display text-2xl leading-none">Per avstånd</h2>
          <div className="mt-4 space-y-2.5">
            {groups.map((g) => {
              const b = scoreBand(g.score);
              return (
                <div key={g.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-sm text-muted-foreground">{g.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${g.score}%` }} />
                  </div>
                  <span className={`w-16 shrink-0 text-right text-sm font-semibold ${b.text}`}>
                    {nf(g.avgProximity)} m
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!compact && (
        <p className="text-center text-sm text-muted-foreground">
          Gör om testet varje vecka eller månad för att följa utvecklingen.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">{value}</p>
    </div>
  );
}
