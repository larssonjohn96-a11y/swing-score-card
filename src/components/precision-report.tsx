import { Compass, Gauge, Target, Trophy, type LucideIcon } from "lucide-react";
import {
  COMPARE_LEVELS,
  dispersionStats,
  dispersionVerdict,
  groupScores,
  handicapFromScore,
  handicapLabel,
  pctForHandicap,
  precisionInsights,
  precisionResult,
  scoreBand,
  type PrecisionInsight,
  type PrecisionShot,
} from "@/lib/precision";
import type { Device, MeasurementContext } from "@/lib/speed";
import { DispersionGreen } from "@/components/precision-visuals";

const nf = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

const INSIGHT_STYLE: Record<
  PrecisionInsight["kind"],
  { icon: LucideIcon; label: string; text: string; bg: string }
> = {
  strength: { icon: Trophy, label: "Största styrka", text: "text-primary", bg: "bg-primary/10" },
  improvement: {
    icon: Target,
    label: "Största förbättringsområde",
    text: "text-destructive",
    bg: "bg-destructive/10",
  },
  pattern: { icon: Compass, label: "Missmönster", text: "text-flag", bg: "bg-flag/10" },
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
  const groups = groupScores(result);
  const withData = groups.filter((g) => g.count > 0);
  const bestGroup = [...withData].sort((a, b) => b.score - a.score)[0];
  const band = scoreBand(result.score);
  const delta = typeof prevScore === "number" ? result.score - prevScore : null;
  const stats = dispersionStats(shots);
  const verdict = dispersionVerdict(shots);
  const insights = precisionInsights(shots, result);

  return (
    <div className="space-y-10">
      {/* 1. Huvudresultat – Approach HCP är det primära */}
      <section className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Approach HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Approach Score</span>
          <span className={`font-semibold ${band.text}`}>{result.score}/100</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${band.bg} ${band.text}`}>
            {band.label}
          </span>
        </div>
        {delta !== null && (
          <p className={`mt-1 text-xs ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
            {delta > 0 ? "+" : ""}
            {delta} poäng sedan förra testet
          </p>
        )}
        {device && (
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            {context === "simulator" ? "Simulator" : "Range"} · {device}
          </p>
        )}

        {/* 2. De tre viktigaste nyckeltalen */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Snitt till flagg" value={`${nf(result.avgProximity)} m`} />
          <Stat label="Greenträffar" value={`${stats.greens}/${stats.count}`} />
          <Stat label="Bästa avstånd" value={bestGroup ? bestGroup.label.replace(" m", "") : "–"} />
        </div>
      </section>

      {/* 3. Din nivå per avstånd */}
      <section>
        <h2 className="font-display text-2xl leading-none">Din nivå per avstånd</h2>
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
                  className={`w-10 shrink-0 text-right text-sm font-semibold ${g.count ? b.text : "text-muted-foreground"}`}
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

      {/* 4. Spridningskarta + 5. kort tolkning */}
      <section>
        <h2 className="font-display text-2xl leading-none">Spridning</h2>
        <div className="mt-4 rounded-3xl border border-border bg-card p-4">
          <DispersionGreen shots={shots} />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
            <Verdict label="Längdkontroll" value={verdict.lengthControl} />
            <Verdict label="Sidled" value={verdict.side} />
            <Verdict label="Spridning" value={verdict.spread} />
          </div>
        </div>
      </section>

      {/* 6. SG4 Analys */}
      {insights.length > 0 && (
        <section>
          <h2 className="font-display text-2xl leading-none">SG4 Analys</h2>
          <div className="mt-4 space-y-3">
            {insights.map((i) => {
              const s = INSIGHT_STYLE[i.kind];
              return (
                <div
                  key={i.title}
                  className="flex items-start gap-3 rounded-[24px] border border-border bg-card p-4"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.bg}`}
                  >
                    <s.icon className={`h-5 w-5 ${s.text}`} />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-[10px] font-bold uppercase tracking-[0.2em] ${s.text}`}
                    >
                      {i.kind === "pattern" ? "Missmönster" : s.label}
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold leading-snug">{i.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{i.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. Jämför din approach */}
      <section>
        <h2 className="font-display text-2xl leading-none">Jämför din approach</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Snittavstånd till flaggan i procent av slaglängden.
        </p>
        <div className="mt-3 space-y-1.5 rounded-2xl border border-border bg-card p-4">
          <CompareRow label="Du" value={result.avgProximityPct} highlight />
          {COMPARE_LEVELS.map((h) => (
            <CompareRow key={h} label={`HCP ${h}`} value={pctForHandicap(h)} />
          ))}
        </div>
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
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">{value}</p>
    </div>
  );
}

function Verdict({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

function CompareRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const width = Math.max(4, Math.min(100, (value / 20) * 100));
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-12 shrink-0 text-xs ${highlight ? "font-bold text-primary" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${highlight ? "bg-primary" : "bg-muted-foreground/40"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={`w-12 shrink-0 text-right text-xs ${highlight ? "font-bold text-primary" : "text-muted-foreground"}`}
      >
        {nf(value)} %
      </span>
    </div>
  );
}
