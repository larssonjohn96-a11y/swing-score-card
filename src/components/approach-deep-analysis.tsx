import { useMemo, useState } from "react";
import { AlertCircle, Target, TrendingUp } from "lucide-react";
import { loadPrecisionSessions } from "@/lib/precision-store";
import {
  PRECISION_TARGETS,
  handicapFromPct,
  handicapLabel,
  lengthError,
  missPattern,
  proximity,
  proximityPct,
  type PrecisionShot,
} from "@/lib/precision";

type Period = 5 | 10 | "all";

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 5, label: "Senaste 5" },
  { key: 10, label: "Senaste 10" },
  { key: "all", label: "Alla tester" },
];

/** Tre avståndsintervall som täcker alla nio testdistanser jämnt. */
const DISTANCE_BUCKETS: { label: string; targets: readonly number[] }[] = [
  { label: "55–73 m", targets: [55, 64, 73] },
  { label: "82–110 m", targets: [82, 91, 110] },
  { label: "128–165 m", targets: [128, 146, 165] },
];

/** HCP per avståndsintervall – snittet av proximity SOM ANDEL AV
 *  slaglängden (inte råa meter), så korta och långa inspel blir rättvist
 *  jämförbara, omvandlat via samma handicapFromPct-skala som huvud-HCP:et. */
function aggregateByBucket(shots: PrecisionShot[]) {
  return DISTANCE_BUCKETS.map((bucket) => {
    const inBucket = shots.filter((s) => bucket.targets.includes(s.target));
    if (!inBucket.length) return { ...bucket, hcp: undefined, count: 0 };
    const avgPct = inBucket.reduce((a, s) => a + proximityPct(s), 0) / inBucket.length;
    return { ...bucket, hcp: handicapFromPct(avgPct), count: inBucket.length };
  });
}

/** Snitt-proximity per målavstånd, korrekt aggregerat över FLERA sessioner
 *  (till skillnad från precision.ts:s statsByTarget, som bara är byggd för
 *  en enskild sessions 18 slag och därför bara plockar ett slag per
 *  avstånd/varv via .find() – skulle tyst kasta bort data här). */
function aggregateByTarget(shots: PrecisionShot[]) {
  return PRECISION_TARGETS.map((target) => {
    const atTarget = shots.filter((s) => s.target === target);
    const avg = atTarget.length
      ? atTarget.reduce((a, s) => a + proximity(s), 0) / atTarget.length
      : 0;
    return { target, shots: atTarget, avg, count: atTarget.length };
  });
}

function bestWorst(stats: ReturnType<typeof aggregateByTarget>) {
  const withData = stats.filter((s) => s.count > 0);
  if (!withData.length) return { best: undefined, worst: undefined };
  const sorted = [...withData].sort((a, b) => a.avg - b.avg);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

/**
 * Approach-pilotens djupanalys på kategorisidan: allt beräknat ur riktig
 * slagdata från de senaste N testerna (valbar period), inte bara det
 * absolut senaste. Fokus på avstånd i meter och faktiska mönster,
 * INTE på score 0–100 – score visas inte alls här.
 */
export function ApproachDeepAnalysis() {
  const [period, setPeriod] = useState<Period>(10);

  const shots = useMemo<PrecisionShot[]>(() => {
    const sessions = loadPrecisionSessions();
    const window = period === "all" ? sessions : sessions.slice(-period);
    return window.flatMap((s) => s.shots.filter((sh) => sh.filled));
  }, [period]);

  const targetStats = useMemo(() => aggregateByTarget(shots), [shots]);
  const { best, worst } = useMemo(() => bestWorst(targetStats), [targetStats]);
  const bucketStats = useMemo(() => aggregateByBucket(shots), [shots]);
  const pattern = useMemo(() => missPattern(shots), [shots]);
  const testCount = useMemo(() => {
    const sessions = loadPrecisionSessions();
    return period === "all" ? sessions.length : Math.min(period, sessions.length);
  }, [period]);

  const bucketWithData = bucketStats.filter((b) => b.hcp !== undefined);
  const worstBucket =
    bucketWithData.length > 1
      ? [...bucketWithData].sort((a, b) => (b.hcp ?? 0) - (a.hcp ?? 0))[0]
      : undefined;
  const bestBucket =
    bucketWithData.length > 1
      ? [...bucketWithData].sort((a, b) => (a.hcp ?? 0) - (b.hcp ?? 0))[0]
      : undefined;
  const bucketGap =
    worstBucket && bestBucket && worstBucket.label !== bestBucket.label
      ? Math.round(((worstBucket.hcp ?? 0) - (bestBucket.hcp ?? 0)) * 10) / 10
      : undefined;

  if (!shots.length) return null;

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Djupanalys per avstånd
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Baserat på {testCount} test{testCount === 1 ? "" : "er"} · {shots.length} registrerade
        inspel.
      </p>

      <div className="mt-3 flex gap-2">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setPeriod(o.key)}
            className={`flex-1 rounded-full border py-2 text-xs font-semibold transition-colors ${
              period === o.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Framträdande insight-box: pekar ut VAR störst potential finns –
          rent diagnostiskt, inga tekniska råd om hur man åtgärdar det. */}
      {worstBucket && bestBucket && bucketGap !== undefined && bucketGap > 0.5 && (
        <div className="mt-4 rounded-3xl border-2 border-flag/40 bg-flag/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flag/15 text-flag">
              <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-flag">
                Störst potential att sänka HCP
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                Dina inspel på <strong>{worstBucket.label}</strong> ligger på HCP{" "}
                {handicapLabel(worstBucket.hcp ?? 0)} – {bucketGap} HCP sämre än ditt starkaste
                intervall (<strong>{bestBucket.label}</strong>, HCP{" "}
                {handicapLabel(bestBucket.hcp ?? 0)}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HCP per avståndsintervall */}
      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          HCP per avståndsintervall
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {bucketStats.map((b) => (
            <div
              key={b.label}
              className={`rounded-2xl border p-3 text-center ${
                worstBucket?.label === b.label
                  ? "border-flag/40 bg-flag/5"
                  : bestBucket?.label === b.label
                    ? "border-primary/40 bg-primary/5"
                    : "border-border"
              }`}
            >
              <p className="text-[10px] font-semibold text-muted-foreground">{b.label}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-none">
                {b.hcp !== undefined ? handicapLabel(b.hcp) : "–"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{b.count} slag</p>
            </div>
          ))}
        </div>
      </div>

      {/* Smarta insikter – rena fakta ur riktig data, ingen rådgivning */}
      <div className="mt-4 space-y-2">
        {best && (
          <InsightRow
            icon={TrendingUp}
            tone="primary"
            text={
              <>
                Starkast på <strong>{best.target} m</strong>, snitt {best.avg.toFixed(1)} m från
                flaggan.
              </>
            }
          />
        )}
        {worst && worst.target !== best?.target && (
          <InsightRow
            icon={Target}
            tone="muted"
            text={
              <>
                Störst spridning på <strong>{worst.target} m</strong>, snitt {worst.avg.toFixed(1)}{" "}
                m från flaggan.
              </>
            }
          />
        )}
        {pattern.lengthBias && (
          <InsightRow
            icon={Target}
            tone="muted"
            text={
              <>
                {pattern.lengthBias === "kort" ? pattern.shortPct : pattern.longPct}% av dina inspel
                missar <strong>{pattern.lengthBias}</strong>.
              </>
            }
          />
        )}
        {pattern.sideBias && (
          <InsightRow
            icon={Target}
            tone="muted"
            text={
              <>
                {pattern.sideBias === "vänster" ? pattern.leftPct : pattern.rightPct}% av dina
                inspel missar åt <strong>{pattern.sideBias}</strong>.
              </>
            }
          />
        )}
      </div>

      {/* Per avstånd: snittproximity i meter, inte score */}
      <div className="mt-5 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Snittavstånd per målavstånd
        </p>
        <div className="mt-3 space-y-2.5">
          {targetStats.map((t) => {
            const hasData = t.count > 0;
            const pct = hasData ? Math.max(4, Math.min(100, 100 - (t.avg / 12) * 100)) : 0;
            const isBest = best?.target === t.target;
            const isWorst = worst?.target === t.target && worst.target !== best?.target;
            return (
              <div key={t.target} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground">
                  {t.target}m
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isBest ? "bg-primary" : isWorst ? "bg-flag" : "bg-primary/50"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-semibold">
                  {hasData ? `${t.avg.toFixed(1)} m` : "–"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spridningskarta med en ellips per avstånd */}
      <div className="mt-4 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Spridning per avstånd
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Varje ellips visar din typiska spridning kring flaggan på det avståndet.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {targetStats
            .filter((t) => t.count > 0)
            .map((t) => (
              <DispersionMiniCard key={t.target} target={t.target} shots={t.shots} />
            ))}
        </div>
      </div>
    </section>
  );
}

function InsightRow({
  icon: Icon,
  tone,
  text,
}: {
  icon: typeof Target;
  tone: "primary" | "muted";
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-primary/5 p-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          tone === "primary" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-sm leading-snug text-foreground">{text}</p>
    </div>
  );
}

/** Litet spridningskort: green + flagga i mitten, en ellips (± en std.avv.
 *  i längd/sidled) plus enskilda slagpunkter, för ETT målavstånd. */
function DispersionMiniCard({ target, shots }: { target: number; shots: PrecisionShot[] }) {
  const filled = shots;
  const w = 100;
  const h = 100;
  const cx = 50;
  const cy = 50;
  const maxRangeM = 12; // meter som mappas till kortets kant
  const scale = 38 / maxRangeM;

  const offlines = filled.map((s) => s.offline);
  const lengths = filled.map((s) => lengthError(s));
  const meanOff = offlines.reduce((a, b) => a + b, 0) / (offlines.length || 1);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const stdOff =
    filled.length > 1
      ? Math.sqrt(offlines.reduce((a, v) => a + (v - meanOff) ** 2, 0) / filled.length)
      : 1.5;
  const stdLen =
    filled.length > 1
      ? Math.sqrt(lengths.reduce((a, v) => a + (v - meanLen) ** 2, 0) / filled.length)
      : 1.5;

  const avgProx = filled.length ? filled.reduce((a, s) => a + proximity(s), 0) / filled.length : 0;

  return (
    <div className="rounded-2xl bg-primary/[0.04] p-2 text-center">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-20 w-full"
        role="img"
        aria-label={`Spridning ${target} m`}
      >
        <ellipse cx={cx} cy={cy} rx="40" ry="34" className="fill-primary/8" />
        <ellipse
          cx={cx - meanOff * scale}
          cy={cy - meanLen * scale}
          rx={Math.max(4, Math.min(38, stdOff * scale))}
          ry={Math.max(4, Math.min(34, stdLen * scale))}
          className="fill-primary/20 stroke-primary/40"
          strokeWidth="1"
        />
        {filled.map((s, i) => (
          <circle
            key={i}
            cx={Math.max(3, Math.min(w - 3, cx - s.offline * scale))}
            cy={Math.max(3, Math.min(h - 3, cy - lengthError(s) * scale))}
            r="2.5"
            className="fill-flag"
          />
        ))}
        <circle cx={cx} cy={cy} r="2" className="fill-foreground" />
      </svg>
      <p className="mt-1 text-[11px] font-semibold">{target} m</p>
      <p className="text-[10px] text-muted-foreground">
        {avgProx > 0 ? `${avgProx.toFixed(1)} m snitt` : "–"}
      </p>
    </div>
  );
}
