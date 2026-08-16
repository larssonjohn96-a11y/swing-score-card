import { Gauge } from "lucide-react";
import { handicapLabel, scoreBand, type OffTeeResult } from "@/lib/offtee";
import type { Device, MeasurementContext } from "@/lib/speed";
import { DrivingHcpBellCurve } from "@/components/offtee-bellcurve";

/**
 * Ännu mer förenklad analys för ett genomfört Off the Tee Test – bara
 * prestations-HCP:et och var det placerar dig jämfört med andra golfare.
 * Ingen spridningsanalys, inga styrkor/förbättringsområden, inga extra
 * nyckeltal – bara resultatet.
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

  return (
    <div className="space-y-4">
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
      </section>

      <DrivingHcpBellCurve hcp={result.handicap} />

      {!compact && (
        <p className="text-center text-sm text-muted-foreground">
          Gör om testet varje vecka eller månad för att följa utvecklingen.
        </p>
      )}
    </div>
  );
}
