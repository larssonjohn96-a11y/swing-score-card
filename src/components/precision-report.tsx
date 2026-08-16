import { Gauge } from "lucide-react";
import { handicapLabel, precisionResult, scoreBand, type PrecisionShot } from "@/lib/precision";
import type { Device, MeasurementContext } from "@/lib/speed";
import { HcpBellCurve } from "@/components/hcp-bell-curve";

/**
 * Ännu mer förenklad analys för ett genomfört Approach Test – bara
 * Approach HCP och bellcurven som visar var det placerar dig. Inga
 * nyckeltal, ingen nivå per avstånd – matchar samma minimalism som
 * Off the Tee-testets analyssida.
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
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  return (
    <div className="space-y-4">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Approach HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <p
          className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${band.bg} ${band.text}`}
        >
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
            {delta} poäng sedan förra testet
          </p>
        )}
      </section>

      <HcpBellCurve hcp={result.handicap} />

      {!compact && (
        <p className="text-center text-sm text-muted-foreground">
          Gör om testet varje vecka eller månad för att följa utvecklingen.
        </p>
      )}
    </div>
  );
}
