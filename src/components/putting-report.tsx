import { Trophy } from "lucide-react";
import { handicapLabel } from "@/lib/offtee";
import { HcpBellCurve } from "@/components/hcp-bell-curve";
import type { ShortPuttSession } from "@/lib/shortputt";
import { handicapFromProximity, intervalMidpoint, type LagPuttSession } from "@/lib/lagputt";
import { INTERVALS } from "@/lib/shortgame";

/**
 * Analys för ett genomfört Putting Test – matchar exakt samma format som
 * Approach/Speed/Off the Tee: sammanslaget Putting HCP som huvudresultat,
 * samma HcpBellCurve-komponent (centrerad, upplyst/grå-delning, glödande
 * puls, "Du är bättre än X%"), en uppmuntrande highlight, inga extra
 * nyckeltal, ingen 'gör om varje vecka'-text. Utöver det – enligt
 * uttrycklig önskan – en tydlig uppdelning i Short Putt-HCP och Lag
 * Putt-HCP var för sig, eftersom det sammanslagna talet annars döljer
 * vilken av de två delarna som drar ner eller upp resultatet.
 */
export function PuttingReport({
  combinedHcp,
  shortSession,
  lagSession,
}: {
  combinedHcp: number;
  shortSession: ShortPuttSession;
  lagSession: LagPuttSession;
}) {
  return (
    <div className="space-y-4">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Putting HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(combinedHcp)}
        </p>
      </section>

      <HcpBellCurve hcp={combinedHcp} />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Short Putt
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
            {handicapLabel(shortSession.handicap)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">1–3 m</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Lag Putt</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
            {handicapLabel(lagSession.handicap)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">8–18 m</p>
        </div>
      </section>

      <BestLagPuttHighlight lagSession={lagSession} />
    </div>
  );
}

/** Ego boost: samma princip som Approach/Speed/Off the Tee – lyfter fram
 *  den bästa enskilda lagputten (naturlig kontinuerlig HCP-omvandling,
 *  till skillnad från korta puttars satt/missad-binäritet). */
function BestLagPuttHighlight({ lagSession }: { lagSession: LagPuttSession }) {
  const withInterval = lagSession.putts.filter((p) => p.interval);
  if (!withInterval.length) return null;

  const best = withInterval.reduce((a, b) =>
    intervalMidpoint(b.interval) < intervalMidpoint(a.interval) ? b : a,
  );
  const bestHcp = handicapFromProximity(intervalMidpoint(best.interval));
  const label = INTERVALS.find((iv) => iv.key === best.interval)?.label ?? "";

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
          Bästa lagputten
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          HCP-nivå
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
          {handicapLabel(bestHcp)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {best.distance} m – la den {label.toLowerCase()} från hål. Snyggt jobbat! 🎉
        </p>
      </div>
    </section>
  );
}
