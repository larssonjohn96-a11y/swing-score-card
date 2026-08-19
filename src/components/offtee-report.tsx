import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Star, Trophy } from "lucide-react";
import {
  ALL_GOLFERS_DRIVING_HCP,
  drivingHcpDistributionForAge,
  drivingHcpPercentile,
  handicapLabel,
  shotHandicap,
  type OffTeeResult,
} from "@/lib/offtee";
import { CATEGORY_LABELS, nextMilestone, type CategorySlug } from "@/lib/sg-handicap";
import { HcpComparisonBellCurve } from "@/components/hcp-comparison-bellcurve";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { OffTeeDispersionMap } from "@/components/offtee-dispersion-map";

/**
 * Analyssida för ett genomfört Off the Tee Test. Sju byggstenar, i den
 * ordning de efterfrågades:
 * 1. Driving HCP som hjälte, med en tröskelbaserad prestationskommentar
 *    (eller en personbästa-banner om det är relevant – den vinner alltid
 *    över den vanliga kommentaren, mer sällsynt och mer värd att fira).
 * 2. Bellcurve med konkret "X av 100 golfare" istället för procent.
 * 3. Bästa slaget – oförändrad, redan byggd tidigare i sessionen.
 * 4. Visuell spridningskarta – sex prickar, inga siffror.
 * 5. Nästa mål – nästa milstolpe nedåt i HCP.
 * 6. Personbästa – hero-bannern i punkt 1.
 * 7. Progression till nästa kategori i SG4-profilen.
 */
export function OffTeeReport({
  result,
  age,
  onAgeSaved,
  isPersonalBest,
  previousBestHcp,
}: {
  result: OffTeeResult;
  age?: number;
  onAgeSaved: (age: number) => void;
  isPersonalBest?: boolean;
  previousBestHcp?: number;
}) {
  const ageDist = age ? drivingHcpDistributionForAge(age) : undefined;
  const goal = nextMilestone(result.handicap);

  return (
    <div className="space-y-4">
      <OffTeeHero
        hcp={result.handicap}
        age={age}
        ageDist={ageDist}
        isPersonalBest={isPersonalBest}
        previousBestHcp={previousBestHcp}
      />

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

      <OffTeeDispersionMap shots={result.shots} />

      {goal !== result.handicap && (
        <section className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Nästa mål</p>
          <p className="mt-1 text-sm">
            Driving HCP under{" "}
            <span className="font-[family-name:var(--font-display)] text-xl text-primary">
              {handicapLabel(goal)}
            </span>
          </p>
        </section>
      )}

      <OffTeeNextCategory />
    </div>
  );
}

/**
 * Hero: stor Driving HCP-siffra + antingen en personbästa-banner (vinner
 * alltid, mer sällsynt) eller en tröskelbaserad prestationskommentar mot
 * åldersgruppen (eller alla golfare om ålder saknas). Under normal
 * prestation (< 80:e percentilen) visas ingen extra kommentar alls – bara
 * ett tomrum, medvetet, för att inte låta varje test kännas som ett betyg.
 */
function OffTeeHero({
  hcp,
  age,
  ageDist,
  isPersonalBest,
  previousBestHcp,
}: {
  hcp: number;
  age?: number;
  ageDist?: { mean: number; sd: number };
  isPersonalBest?: boolean;
  previousBestHcp?: number;
}) {
  const group = ageDist ?? ALL_GOLFERS_DRIVING_HCP;
  const pct = drivingHcpPercentile(hcp, group.mean, group.sd);
  const tier = pct >= 95 ? "elite" : pct >= 90 ? "great" : pct >= 80 ? "strong" : "none";
  const suffix = age ? "för din ålder" : "";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/5 p-6 text-center">
      <div
        className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 rounded-full blur-3xl ${
          isPersonalBest || tier === "elite"
            ? "h-52 w-52 bg-flag/25"
            : tier === "great"
              ? "h-44 w-44 bg-primary/25"
              : "h-40 w-40 bg-primary/20"
        }`}
        aria-hidden
      />
      <p className="relative text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Driving HCP
      </p>
      <p className="relative mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
        {handicapLabel(hcp)}
      </p>

      {isPersonalBest ? (
        <div className="relative mt-3 inline-flex flex-col items-center gap-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-flag/15 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-flag">
            <Trophy className="h-4 w-4" />
            Nytt personbästa
          </span>
          {previousBestHcp !== undefined && (
            <span className="text-xs text-muted-foreground">
              Tidigare bästa: HCP {handicapLabel(previousBestHcp)}
            </span>
          )}
        </div>
      ) : tier === "elite" ? (
        <p className="relative mt-2 flex items-center justify-center gap-1.5 text-base font-bold text-flag">
          <Star className="h-4 w-4 fill-flag" />
          Exceptionell driving {suffix}!
          <Star className="h-4 w-4 fill-flag" />
        </p>
      ) : tier === "great" ? (
        <p className="relative mt-2 text-sm font-semibold text-primary">
          Riktigt stark driving {suffix} 💪
        </p>
      ) : tier === "strong" ? (
        <p className="relative mt-2 text-sm font-medium text-primary">Stark {suffix}</p>
      ) : null}
    </section>
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

/** Kategori-loop: håller testet från att kännas som en återvändsgränd.
 *  Fast rotationsordning, hoppar alltid till nästa efter Off the Tee.
 *  Statiska <Link to="..."> per gren (inte en dynamisk sträng) så
 *  TanStack Routers typade routes fortfarande kan verifiera varje länk. */
const CATEGORY_ORDER: CategorySlug[] = [
  "approach",
  "driving",
  "around-the-green",
  "puttning",
  "speed",
];

function OffTeeNextCategory() {
  const currentIndex = CATEGORY_ORDER.indexOf("driving");
  const next = CATEGORY_ORDER[(currentIndex + 1) % CATEGORY_ORDER.length];
  const progress = `Off the Tee klar · ${currentIndex + 1} av ${CATEGORY_ORDER.length}`;

  const inner = (
    <>
      <span>
        <span className="block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {progress}
        </span>
        <span className="mt-0.5 block text-sm font-semibold">Nästa: {CATEGORY_LABELS[next]}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  const className =
    "flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary";

  if (next === "approach") {
    return (
      <Link to="/approach" className={className}>
        {inner}
      </Link>
    );
  }
  if (next === "puttning") {
    return (
      <Link to="/putting" className={className}>
        {inner}
      </Link>
    );
  }
  if (next === "speed") {
    return (
      <Link to="/speed-test" className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/kategori/$slug" params={{ slug: next }} className={className}>
      {inner}
    </Link>
  );
}
