import { Target, Trophy } from "lucide-react";
import {
  dispersionStats,
  handicapFromPct,
  handicapLabel,
  precisionResult,
  proximityPct,
  type PrecisionShot,
} from "@/lib/precision";
import { HcpBellCurve } from "@/components/hcp-bell-curve";

export function PrecisionReport({
  shots,
}: {
  shots: PrecisionShot[];
  prevScore?: number | null;
  compact?: boolean;
}) {
  const result = precisionResult(shots);
  const dispersion = dispersionStats(shots);
  const isStandard = shots.length === 18;
  const strongest = result.perTarget.filter((item) => item.count > 0).sort((a, b) => b.score - a.score)[0];
  const weakest = result.perTarget.filter((item) => item.count > 0).sort((a, b) => a.score - b.score)[0];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {isStandard ? "Standard · 18 slag" : "Snabbtest · 5 slag"}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Approach HCP</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
              {handicapLabel(result.handicap)}
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Score</p>
            <p className="font-[family-name:var(--font-display)] text-4xl leading-none text-primary">{result.score}</p>
            <p className="text-[10px] text-muted-foreground">/100</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-border border-t border-border pt-4 text-center">
          <Metric label="Snitt till flagg" value={`${result.avgProximity.toFixed(1).replace(".", ",")} m`} />
          <Metric label="Greenträff" value={`${Math.round((dispersion.greens / Math.max(1, dispersion.count)) * 100)} %`} />
          <Metric label="Konsistens" value={`${result.consistency}/100`} />
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Jämförelse</p>
            <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-xl">Din HCP-nivå</h3>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">Lägre är bättre</span>
        </div>
        <HcpBellCurve hcp={result.handicap} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <InsightCard
          eyebrow="Starkast"
          title={strongest ? `${strongest.target} m` : "–"}
          text={strongest ? `${strongest.avgProximity.toFixed(1).replace(".", ",")} m i snitt · ${strongest.score}/100` : "Gör testet för analys."}
          positive
        />
        <InsightCard
          eyebrow="Störst potential"
          title={weakest ? `${weakest.target} m` : "–"}
          text={weakest
            ? isStandard
              ? `${weakest.avgProximity.toFixed(1).replace(".", ",")} m i snitt · ${weakest.score}/100`
              : "Snabbtestet ger en första indikation – bekräfta med standardtestet."
            : "Gör testet för analys."}
        />
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Avståndsprofil</p>
            <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-xl">Var vinner och tappar du?</h3>
          </div>
          {!isStandard && <span className="text-[10px] font-semibold text-muted-foreground">Indikation</span>}
        </div>

        <div className="mt-3 divide-y divide-border">
          {result.perTarget.filter((item) => item.count > 0).map((item) => (
            <div key={item.target} className="grid grid-cols-[54px_1fr_auto] items-center gap-3 py-3">
              <div>
                <p className="font-[family-name:var(--font-display)] text-xl leading-none">{item.target}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">meter</p>
              </div>
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, item.score)}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {item.avgProximity.toFixed(1).replace(".", ",")} m till flagg
                </p>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-display)] text-xl leading-none text-primary">{item.score}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">HCP {handicapLabel(item.handicap)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BestShotHighlight shots={shots} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2">
      <p className="font-[family-name:var(--font-display)] text-xl leading-none">{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

function InsightCard({
  eyebrow,
  title,
  text,
  positive = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  positive?: boolean;
}) {
  return (
    <div className={`rounded-3xl border p-4 ${positive ? "border-primary/25 bg-primary/5" : "border-border bg-card"}`}>
      <Target className={`h-4 w-4 ${positive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.75} />
      <p className={`mt-3 text-[9px] font-bold uppercase tracking-[0.18em] ${positive ? "text-primary" : "text-muted-foreground"}`}>{eyebrow}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">{title}</p>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{text}</p>
    </div>
  );
}

function BestShotHighlight({ shots }: { shots: PrecisionShot[] }) {
  const filled = shots.filter((s) => s.filled);
  if (!filled.length) return null;

  const best = filled.reduce((a, b) => (proximityPct(a) < proximityPct(b) ? a : b));
  const bestHcp = handicapFromPct(proximityPct(best));

  return (
    <section className="flex items-center gap-4 rounded-3xl border border-flag/25 bg-flag/5 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flag/15 text-flag">
        <Trophy className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-flag">Bästa slaget</p>
        <p className="mt-0.5 text-sm font-semibold">{best.target} m · HCP-nivå {handicapLabel(bestHcp)}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{Math.sqrt((best.carry - best.target) ** 2 + best.offline ** 2).toFixed(1).replace(".", ",")} m från flaggan</p>
      </div>
    </section>
  );
}
