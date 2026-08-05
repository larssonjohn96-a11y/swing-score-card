import { CheckCircle2, Target, Trophy, type LucideIcon } from "lucide-react";
import {
  PGA_TOUR_AVERAGE_METERS,
  AVERAGE_GOLFER_METERS,
  analyseOffTee,
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
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;
  const vsAverage = result.avgTotal - AVERAGE_GOLFER_METERS;

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
          <Stat label="Driving HCP" value={handicapLabel(result.handicap)} />
          <Stat label="Fairway %" value={`${result.fairwayHitPct}`} />
          <Stat label="Snitt total" value={`${result.avgTotal.toFixed(0)} m`} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Vad resultatet betyder</h2>
        <div className="mt-4 space-y-2">
          <MeaningRow
            label="Längd"
            hcp={result.breakdown.distanceHcp}
            detail={`${result.avgTotal.toFixed(0)} m i snitt`}
          />
          <MeaningRow
            label="Out of Bounds (OB)"
            hcp={result.breakdown.waywardHcp}
            detail={`${result.waywardPct} % av slagen`}
          />
          <MeaningRow
            label="Fairway-träff"
            hcp={result.breakdown.fairwayHcp}
            detail={`${result.fairwayHitPct} % av slagen`}
          />
          <MeaningRow
            label="Jämnhet"
            hcp={result.breakdown.evennessHcp}
            detail={`±${result.distanceSpread.toFixed(0)} m längd, ±${result.lateralSpread.toFixed(0)} m sidled`}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Längd</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Snitt totalt" value={`${result.avgTotal.toFixed(0)} m`} />
          <Stat label="Snitt carry" value={`${result.avgCarry.toFixed(0)} m`} />
          <Stat label="Längsta drive" value={`${result.longest.toFixed(0)} m`} />
          <Stat label="Spridning" value={`±${result.distanceSpread.toFixed(0)} m`} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {vsAverage >= 0
            ? `${vsAverage.toFixed(0)} m längre än en snittgolfare (${AVERAGE_GOLFER_METERS.toFixed(0)} m).`
            : `${Math.abs(vsAverage).toFixed(0)} m kortare än en snittgolfare (${AVERAGE_GOLFER_METERS.toFixed(0)} m).`}{" "}
          Till jämförelse ligger PGA Tour-snittet på {PGA_TOUR_AVERAGE_METERS.toFixed(0)} m.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Träffsäkerhet</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Fairway-träff" value={`${result.fairwayHitPct} %`} />
          <Stat label="OB" value={`${result.waywardPct} %`} />
          <Stat label="Miss vänster" value={`${result.leftPct} %`} />
          <Stat label="Miss höger" value={`${result.rightPct} %`} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {result.waywardPct <= 15
            ? "Låg OB-andel – nära scratch-nivå."
            : result.leftPct > result.rightPct + 15
              ? "Missarna är i huvudsak riktningsrelaterade – bollen drar konsekvent åt vänster."
              : result.rightPct > result.leftPct + 15
                ? "Missarna är i huvudsak riktningsrelaterade – bollen drar konsekvent åt höger."
                : "OB-andelen är den tydligaste skiljelinjen mot lägre handicap – den väger tyngst efter längd."}
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Spridning</h2>
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <TeeDispersion result={result} />
        </div>
      </section>

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

function MeaningRow({ label, hcp, detail }: { label: string; hcp: number; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="font-[family-name:var(--font-display)] text-xl leading-none text-flag">
        HCP {handicapLabel(hcp)}
      </span>
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
