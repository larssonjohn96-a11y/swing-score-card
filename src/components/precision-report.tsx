import { Trophy } from "lucide-react";
import {
  handicapFromPct,
  handicapLabel,
  precisionResult,
  proximityPct,
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
}: {
  shots: PrecisionShot[];
  prevScore?: number | null;
  compact?: boolean;
}) {
  const result = precisionResult(shots);

  return (
    <div className="space-y-4">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Approach HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
      </section>

      <HcpBellCurve hcp={result.handicap} />

      <BestShotHighlight shots={shots} />
    </div>
  );
}

/** Ego boost: lyfter fram testets enskilt bästa slag med dess motsvarande
 *  HCP-nivå, oavsett hur resten av testet gick. Visuell trofékänsla i
 *  stället för en textrad – stor siffra, glöd, minimalt med ord. */
function BestShotHighlight({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  if (!filled.length) return null;

  const best = filled.reduce((a, b) => (proximityPct(a) < proximityPct(b) ? a : b));
  const bestHcp = handicapFromPct(proximityPct(best));

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
          Bästa slaget
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          HCP-nivå
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
          {handicapLabel(bestHcp)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          På {best.target} m slog du som en spelare med HCP {handicapLabel(bestHcp)}. Snyggt jobbat!
          🎉
        </p>
      </div>
    </section>
  );
}
