import {
  HANDICAP_SCALE,
  analysePrecision,
  benchmarkLabel,
  handicapLabel,
  precisionResult,
  scoreGrade,
  type PrecisionShot,
} from "@/lib/precision";
import { DispersionGreen } from "@/components/precision-visuals";

const GRADE_BAR: Record<string, string> = {
  good: "bg-primary",
  mid: "bg-flag",
  poor: "bg-destructive",
};
const GRADE_TEXT: Record<string, string> = {
  good: "text-primary",
  mid: "text-flag",
  poor: "text-destructive",
};

/** Hela analysen för ett genomfört Approach Precision Test. */
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
  const analysis = analysePrecision(shots, result);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Approach Precision Score
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-8xl leading-none">
          {result.score}
          <span className="ml-1 text-2xl text-muted-foreground">/100</span>
        </p>
        {delta !== null && (
          <p className={`mt-1 text-sm ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} sedan förra testet
          </p>
        )}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Est. handicap" value={handicapLabel(result.handicap)} />
          <Stat label="Till flaggan" value={`${result.avgProximity.toFixed(1)} m`} />
          <Stat label="Av slaglängd" value={`${result.avgProximityPct.toFixed(1)} %`} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Din precision motsvarar {benchmarkLabel(result.avgProximityPct).toLowerCase()}.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Så uppskattas handicap</h2>
        <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
          {HANDICAP_SCALE.map((row) => (
            <div
              key={row.pct}
              className="grid grid-cols-3 gap-2 border-b border-border/50 px-4 py-3 text-sm last:border-0"
            >
              <span className="text-muted-foreground">{row.pct}</span>
              <span className="text-center font-semibold">{row.hcp}</span>
              <span className="text-right text-xs text-muted-foreground">{row.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Score per avstånd</h2>
        <div className="mt-4 space-y-3">
          {result.perTarget.map((t) => {
            const grade = scoreGrade(t.score);
            return (
              <div key={t.target} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-sm text-muted-foreground">{t.target} m</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${t.count ? GRADE_BAR[grade] : "bg-muted"}`}
                    style={{ width: `${t.count ? t.score : 0}%` }}
                  />
                </div>
                <span
                  className={`w-12 shrink-0 text-right text-sm font-semibold ${t.count ? GRADE_TEXT[grade] : "text-muted-foreground"}`}
                >
                  {t.count ? t.score : "–"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Grön 70+ · gul 45–69 · röd under 45
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl leading-none">Spridning</h2>
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <DispersionGreen shots={shots} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl leading-none">Analys</h2>
        <Block title="Styrkor" items={analysis.strengths} tone="good" />
        <Block title="Förbättringsområden" items={analysis.improvements} tone="poor" />
        <Block title="Nästa fokus i träningen" items={analysis.focus} tone="mid" />
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
}: {
  title: string;
  items: string[];
  tone: "good" | "mid" | "poor";
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className={`text-xs uppercase tracking-[0.2em] ${GRADE_TEXT[tone]}`}>{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-sm leading-relaxed">
            <span className={GRADE_TEXT[tone]}>•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
