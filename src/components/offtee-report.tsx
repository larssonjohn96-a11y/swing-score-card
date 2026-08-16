import { Trophy } from "lucide-react";
import { distanceToHandicap, handicapLabel, type OffTeeResult } from "@/lib/offtee";
import { DrivingHcpBellCurve } from "@/components/offtee-bellcurve";

/**
 * Ännu mer förenklad analys för ett genomfört Off the Tee Test – bara
 * Driving HCP, bellcurven som visar var det placerar dig, och en
 * uppmuntrande highlight av testets längsta slag i fairway. Inga
 * nyckeltal, ingen spridningsanalys, ingen mät-kontext – matchar exakt
 * samma minimalism som Approach- och Speed-testens analyssidor.
 */
export function OffTeeReport({
  result,
  prevScore,
  compact = false,
}: {
  result: OffTeeResult;
  prevScore?: number | null;
  compact?: boolean;
}) {
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  return (
    <div className="space-y-4">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Driving HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        {delta !== null && (
          <p className={`mt-2 text-sm ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} sedan förra testet
          </p>
        )}
      </section>

      <DrivingHcpBellCurve hcp={result.handicap} />

      <OffTeeBestShotHighlight shots={result.shots} />

      {!compact && (
        <p className="text-center text-sm text-muted-foreground">
          Gör om testet varje vecka eller månad för att följa utvecklingen.
        </p>
      )}
    </div>
  );
}

/** Ego boost: samma princip som Approach/Speed – lyfter fram testets
 *  längsta slag i fairway (eller längsta slag om inget stannade i
 *  fairway) med dess motsvarande HCP-nivå. */
function OffTeeBestShotHighlight({ shots }: { shots: OffTeeResult["shots"] }) {
  if (!shots.length) return null;

  const inFairway = shots.filter((s) => s.outcome.inFairway);
  const pool = inFairway.length ? inFairway : shots;
  const best = pool.reduce((a, b) => (b.total > a.total ? b : a));
  const bestHcp = distanceToHandicap(best.total);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-flag/30 bg-flag/5 p-5 text-center">
      <div
        className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-flag/25 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-flag/20 text-flag">
          <Trophy className="h-5 w-5" strokeWidth={2} />
        </span>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-flag">
          Längsta slaget i fairway
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          HCP-nivå
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
          {handicapLabel(bestHcp)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {best.total.toFixed(0)} m – du slog som en spelare med HCP {handicapLabel(bestHcp)}.
          Snyggt jobbat! 🎉
        </p>
      </div>
    </section>
  );
}
