import { Sparkles } from "lucide-react";
import {
  handicapFromPct,
  handicapLabel,
  precisionResult,
  proximityPct,
  scoreBand,
  type PrecisionShot,
} from "@/lib/precision";
import { HcpBellCurve } from "@/components/hcp-bell-curve";

/**
 * Ännu mer förenklad analys för ett genomfört Approach Test – bara
 * Approach HCP, bellcurven som visar var det placerar dig, och en
 * uppmuntrande highlight av testets bästa enskilda slag. Inga nyckeltal,
 * ingen nivå per avstånd, ingen mät-kontext – matchar samma minimalism
 * som Off the Tee-testets analyssida.
 */
export function PrecisionReport({
  shots,
  prevScore,
  compact = false,
}: {
  shots: PrecisionShot[];
  prevScore?: number | null;
  compact?: boolean;
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
        {delta !== null && (
          <p className={`mt-2 text-sm ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} poäng sedan förra testet
          </p>
        )}
      </section>

      <HcpBellCurve hcp={result.handicap} />

      <BestShotHighlight shots={shots} />

      {!compact && (
        <p className="text-center text-sm text-muted-foreground">
          Gör om testet varje vecka eller månad för att följa utvecklingen.
        </p>
      )}
    </div>
  );
}

/** Ego boost: lyfter fram testets enskilt bästa slag med dess motsvarande
 *  HCP-nivå, oavsett hur resten av testet gick. */
function BestShotHighlight({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  if (!filled.length) return null;

  const best = filled.reduce((a, b) => (proximityPct(a) < proximityPct(b) ? a : b));
  const bestHcp = handicapFromPct(proximityPct(best));

  return (
    <section className="rounded-3xl border border-flag/30 bg-flag/5 p-5 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-flag/15 text-flag">
        <Sparkles className="h-5 w-5" />
      </span>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        Wow, ditt bästa slag – på <span className="font-semibold">{best.target} m</span> – höll{" "}
        <span className="font-semibold text-flag">HCP {handicapLabel(bestHcp)}</span>-nivå. Snyggt
        jobbat!
      </p>
    </section>
  );
}
