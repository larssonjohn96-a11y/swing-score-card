import { CheckCircle2, Gauge, Target, Trophy, type LucideIcon } from "lucide-react";
import {
  analysePrecision,
  groupScores,
  handicapFromScore,
  handicapLabel,
  precisionResult,
  scoreBand,
  type PrecisionShot,
} from "@/lib/precision";
import type { Device, MeasurementContext } from "@/lib/speed";
import { DispersionGreen } from "@/components/precision-visuals";

const GRADE_TEXT: Record<string, string> = {
  good: "text-primary",
  poor: "text-destructive",
};
const GRADE_SOFT: Record<string, string> = {
  good: "bg-primary/10",
  poor: "bg-destructive/10",
};

/** Hela analysen för ett genomfört Approach Precision Test. */
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
  const analysis = analysePrecision(shots, result);
  const groups = groupScores(result);
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Approach Precision Score
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
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Est. handicap" value={handicapLabel(result.handicap)} />
          <Stat label="Score" value={`${result.score}`} />
          <Stat label="Snitt från mål" value={`${result.avgProximity.toFixed(1)} m`} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Score per avstånd</h2>
        <div className="mt-4 space-y-3">
          {groups.map((g) => {
            const b = scoreBand(g.score);
            return (
              <div key={g.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm text-muted-foreground">{g.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${g.count ? b.bar : "bg-muted"}`}
                    style={{ width: `${g.count ? g.score : 0}%` }}
                  />
                </div>
                <span
                  className={`w-12 shrink-0 text-right text-sm font-semibold ${g.count ? b.text : "text-muted-foreground"}`}
                >
                  {g.count ? g.score : "–"}
                </span>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                  {g.count ? `HCP ${handicapLabel(handicapFromScore(g.score))}` : "–"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Spridning</h2>
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <DispersionGreen shots={shots} />
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
