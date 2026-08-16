import { Gauge } from "lucide-react";
import {
  PGA_TOUR_AVERAGE_METERS,
  AVERAGE_GOLFER_METERS,
  handicapLabel,
  scoreBand,
  type OffTeeResult,
} from "@/lib/offtee";
import type { Device, MeasurementContext } from "@/lib/speed";

/**
 * Förenklad analys för ett genomfört Off the Tee Test – fokuserar bara på
 * prestations-HCP:et. Spridningsanalys och styrkor/förbättringsområden
 * borttagna medvetet, enligt önskemål.
 */
export function OffTeeReport({
  result,
  prevScore,
  compact = false,
  context,
  device,
}: {
  result: OffTeeResult;
  prevScore?: number | null;
  compact?: boolean;
  context?: MeasurementContext;
  device?: Device;
}) {
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;
  const vsAverage = result.avgTotal - AVERAGE_GOLFER_METERS;

  return (
    <div className="space-y-8">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Driving HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <p
          className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${band.bg} ${band.text}`}
        >
          <span aria-hidden>{band.emoji}</span>
          {band.label}
        </p>
        {device && (
          <p className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            {context === "simulator" ? "Simulator" : "Range"} · {device}
          </p>
        )}
        {delta !== null && (
          <p className={`mt-2 text-sm ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} sedan förra testet
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Off the Tee Score" value={`${result.score}/100`} />
          <Stat label="Snitt totalt" value={`${result.avgTotal.toFixed(0)} m`} />
          <Stat label="Fairway %" value={`${result.fairwayHitPct}`} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {vsAverage >= 0
            ? `${vsAverage.toFixed(0)} m längre än en snittgolfare (${AVERAGE_GOLFER_METERS.toFixed(0)} m).`
            : `${Math.abs(vsAverage).toFixed(0)} m kortare än en snittgolfare (${AVERAGE_GOLFER_METERS.toFixed(0)} m).`}{" "}
          PGA Tour-snittet ligger på {PGA_TOUR_AVERAGE_METERS.toFixed(0)} m.
        </p>
      </section>

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
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">{value}</p>
    </div>
  );
}
