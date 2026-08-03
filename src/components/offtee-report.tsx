import { CheckCircle2, Target, Trophy, type LucideIcon } from "lucide-react";
import {
  analyseOffTee,
  clubStats,
  handicapLabel,
  scoreBand,
  type OffTeeResult,
} from "@/lib/offtee";
import { TeeDispersion } from "@/components/offtee-visuals";

const GRADE_TEXT: Record<string, string> = { good: "text-primary", poor: "text-destructive" };
const GRADE_SOFT: Record<string, string> = { good: "bg-primary/10", poor: "bg-destructive/10" };

/** Hela analysen för ett genomfört Off the Tee Test. */
export function OffTeeReport({
  result,
  prevScore,
  compact = false,
}: {
  result: OffTeeResult;
  prevScore?: number | null;
  compact?: boolean;
}) {
  const analysis = analyseOffTee(result);
  const clubs = clubStats(result);
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  const maxLandingHoles = result.shots.filter((s) => s.hole.maxLandingDistance !== undefined);
  const doglegHoles = result.shots.filter((s) => s.hole.dogleg);

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Off the Tee Score
        </p>
        <p
          className={`mt-2 font-[family-name:var(--font-display)] text-8xl leading-none ${band.text}`}
        >
          {result.score}
          <span className="ml-1 text-2xl text-muted-foreground">/100</span>
        </p>
        <p
          className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${band.bg} ${band.text}`}
        >
          <span aria-hidden>{band.emoji}</span>
          {band.label}
        </p>
        {delta !== null && (
          <p className={`mt-2 text-sm ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} sedan förra testet
          </p>
        )}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Est. OTT-hcp" value={handicapLabel(result.handicap)} />
          <Stat label="Fairway %" value={`${result.fairwayHitPct}`} />
          <Stat label="Snitt total" value={`${result.avgTotal.toFixed(0)} m`} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Längd</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Snitt totalt" value={`${result.avgTotal.toFixed(0)} m`} />
          <Stat label="Snitt carry" value={`${result.avgCarry.toFixed(0)} m`} />
          <Stat label="Längsta drive" value={`${result.longest.toFixed(0)} m`} />
          <Stat label="Distanskontroll" value={`${result.distanceConsistency}/100`} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Träffsäkerhet</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Fairway-träff" value={`${result.fairwayHitPct} %`} />
          <Stat label="Out of Bounds" value={`${result.obPct} %`} />
          <Stat label="Miss vänster" value={`${result.leftPct} %`} />
          <Stat label="Miss höger" value={`${result.rightPct} %`} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {result.leftPct > result.rightPct + 15
            ? "Missarna är i huvudsak riktningsrelaterade – bollen drar konsekvent åt vänster."
            : result.rightPct > result.leftPct + 15
              ? "Missarna är i huvudsak riktningsrelaterade – bollen drar konsekvent åt höger."
              : "Missarna är relativt jämnt fördelade – snarare en konsistensfråga än en riktningstendens."}
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Spridning</h2>
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <TeeDispersion result={result} />
        </div>
      </section>

      {(maxLandingHoles.length > 0 || doglegHoles.length > 0) && (
        <section>
          <h2 className="font-display text-2xl leading-none">Distanskontroll</h2>
          <div className="mt-4 space-y-2">
            {maxLandingHoles.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-3 text-sm">
                <p className="text-muted-foreground">Hål med maxlandningsavstånd</p>
                <p className="mt-1 font-semibold">
                  {maxLandingHoles.filter((s) => !s.outcome.exceededMax).length} av{" "}
                  {maxLandingHoles.length} inom gränsen
                </p>
              </div>
            )}
            {doglegHoles.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-3 text-sm">
                <p className="text-muted-foreground">Dogleg-hål</p>
                <p className="mt-1 font-semibold">
                  Snitt{" "}
                  {Math.round(doglegHoles.reduce((a, s) => a + s.score, 0) / doglegHoles.length)}
                  /100
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {clubs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl leading-none">Klubbstatistik</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Informativt – klubbvalet påverkar aldrig score.
          </p>
          <div className="mt-4 space-y-2">
            {clubs.map((c) => (
              <div
                key={c.club}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{c.club}</p>
                  <p className="text-xs text-muted-foreground">{c.count} slag</p>
                </div>
                <div className="flex gap-4 text-right text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Snitt</p>
                    <p className="font-semibold">{c.avgTotal.toFixed(0)} m</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Fairway</p>
                    <p className="font-semibold">{c.fairwayHitPct}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight">Analys</h2>
        <Block title="Styrkor" items={analysis.strengths} tone="good" icon={Trophy} />
        {analysis.improvements.length > 0 && (
          <Block
            title="Förbättringsområden"
            items={analysis.improvements}
            tone="poor"
            icon={Target}
          />
        )}
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

function Block({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: "good" | "poor";
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${GRADE_SOFT[tone]}`}
        >
          <Icon className={`h-5 w-5 ${GRADE_TEXT[tone]}`} />
        </span>
        <p className={`text-base font-extrabold uppercase tracking-wide ${GRADE_TEXT[tone]}`}>
          {title}
        </p>
      </div>
      <ul className="mt-4 space-y-4">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[15px] leading-snug">
            <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${GRADE_TEXT[tone]}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
