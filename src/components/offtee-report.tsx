import { Sparkles, Trophy } from "lucide-react";
import {
  ALL_GOLFERS_DRIVING_HCP,
  drivingHcpDistributionForAge,
  handicapLabel,
  shotHandicap,
  type OffTeeResult,
} from "@/lib/offtee";
import { HcpComparisonBellCurve } from "@/components/hcp-comparison-bellcurve";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";

/**
 * Analyssida för ett genomfört Off the Tee Test – matchar Approach/
 * Speed/Puttnings minimalism, plus samma sammanslagna alla-golfare/
 * ålders-bellcurve som Speed fick. Ingen "sedan förra testet"-delta
 * (togs bort enligt önskan), varmare och mer firande ton genomgående.
 */
export function OffTeeReport({
  result,
  age,
  onAgeSaved,
}: {
  result: OffTeeResult;
  age?: number;
  onAgeSaved: (age: number) => void;
}) {
  const ageDist = age ? drivingHcpDistributionForAge(age) : undefined;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
        <div
          className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <p className="relative text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Driving HCP
        </p>
        <p className="relative mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <p className="relative mt-2 text-sm font-medium text-primary">Snyggt slaget! 🏌️</p>
      </section>

      <HcpComparisonBellCurve
        hcp={result.handicap}
        allGolfers={{
          label: "Alla golfare",
          mean: ALL_GOLFERS_DRIVING_HCP.mean,
          sd: ALL_GOLFERS_DRIVING_HCP.sd,
        }}
        ageGroup={
          age && ageDist
            ? {
                label: `${age} år`,
                mean: ageDist.mean,
                sd: ageDist.sd,
              }
            : undefined
        }
      />

      {!age && (
        <AgeInlinePrompt
          title="Ange din ålder"
          description="Lägg till din åldersgrupp i jämförelsen ovan"
          onSaved={onAgeSaved}
        />
      )}

      <OffTeeBestShotHighlight shots={result.shots} />
    </div>
  );
}

/** Ego boost: samma princip som Approach/Speed/Putting – lyfter fram
 *  testets bästa enskilda slag. Räknar in BÅDE längd och träffsäkerhet
 *  (shotHandicap) istället för bara längd, så ett långt men vilt slag
 *  aldrig kan slå ut ett kortare, rakare slag som "bäst". */
function OffTeeBestShotHighlight({ shots }: { shots: OffTeeResult["shots"] }) {
  if (!shots.length) return null;

  const best = shots.reduce((a, b) => (shotHandicap(b) < shotHandicap(a) ? b : a));
  const bestHcp = shotHandicap(best);

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
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-flag" />
          {best.total.toFixed(0)} m, rakt och långt – du slog som en spelare med HCP{" "}
          {handicapLabel(bestHcp)}. Snyggt jobbat! 🎉
        </p>
      </div>
    </section>
  );
}
