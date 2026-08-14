import { useMemo, useState } from "react";
import { AlertCircle, Target, TrendingUp } from "lucide-react";
import { loadPrecisionSessions } from "@/lib/precision-store";
import {
  PRECISION_TARGETS,
  handicapFromPct,
  handicapLabel,
  missPattern,
  proximity,
  proximityPct,
  scoreFromPct,
  type PrecisionShot,
} from "@/lib/precision";

type Period = 5 | 10 | "all";

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 5, label: "Senaste 5" },
  { key: 10, label: "Senaste 10" },
  { key: "all", label: "Alla tester" },
];

/** Fast, kategorisk niofärgspalett – en färg per målavstånd, oberoende av
 *  ljust/mörkt tema, samma princip som i referensbilderna. */
const DISTANCE_COLORS: Record<number, string> = {
  55: "#dc2626",
  64: "#2563eb",
  73: "#059669",
  82: "#ea580c",
  91: "#7c3aed",
  110: "#0891b2",
  128: "#ca8a04",
  146: "#db2777",
  165: "#4338ca",
};

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
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);

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
            onClick={() => {
              setPeriod(o.key);
              setSelectedTarget(null);
            }}
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

      {/* Kombinerad spridningskarta – alla avstånd i en vy, färgkodade,
          klickbara för att filtrera till ett enda avstånd. */}
      <CombinedDispersionMap
        targetStats={targetStats}
        selectedTarget={selectedTarget}
        onSelectTarget={setSelectedTarget}
      />
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

/**
 * En enda kombinerad spridningskarta: alla nio avstånden i samma vy,
 * plottade efter slagens FAKTISKA carry (inte relativt sitt eget mål), så
 * hela banan ses på en gång – samma princip som referensbilderna. Varje
 * avstånd har en egen fast färg och en egen ellips (medel ± en std.avv. i
 * carry/sidled). Klick på ett avstånd filtrerar till bara det avståndet
 * och visar dess Score + HCP.
 */
function CombinedDispersionMap({
  targetStats,
  selectedTarget,
  onSelectTarget,
}: {
  targetStats: ReturnType<typeof aggregateByTarget>;
  selectedTarget: number | null;
  onSelectTarget: (t: number | null) => void;
}) {
  const w = 300;
  const h = 380;
  const padTop = 24;
  const padBottom = 24;
  const minCarry = 40;
  const maxCarry = 180;

  const yFor = (carry: number) =>
    h - padBottom - ((carry - minCarry) / (maxCarry - minCarry)) * (h - padTop - padBottom);
  const xScale = 4.2; // px per meter sidled
  const xFor = (offline: number) => w / 2 + offline * xScale;

  const gridLines = [60, 80, 100, 120, 140, 160];

  const selected = targetStats.find((t) => t.target === selectedTarget);
  const selectedScore =
    selected && selected.count > 0
      ? Math.round(
          selected.shots.reduce((a, s) => a + scoreFromPct(proximityPct(s)), 0) / selected.count,
        )
      : undefined;
  const selectedHcp =
    selected && selected.count > 0
      ? handicapFromPct(selected.shots.reduce((a, s) => a + proximityPct(s), 0) / selected.count)
      : undefined;

  return (
    <div className="mt-4 rounded-3xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Spridningskarta</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tryck på ett avstånd för att se bara de slagen – Score och HCP för just det avståndet.
      </p>

      {/* Avståndsväljare */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRECISION_TARGETS.map((t) => {
          const stat = targetStats.find((s) => s.target === t);
          const hasData = (stat?.count ?? 0) > 0;
          const isSelected = selectedTarget === t;
          return (
            <button
              key={t}
              type="button"
              disabled={!hasData}
              onClick={() => onSelectTarget(isSelected ? null : t)}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all disabled:opacity-30"
              style={{
                borderColor: DISTANCE_COLORS[t],
                backgroundColor: isSelected ? DISTANCE_COLORS[t] : "transparent",
                color: isSelected ? "white" : DISTANCE_COLORS[t],
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: isSelected ? "white" : DISTANCE_COLORS[t] }}
              />
              {t}m
            </button>
          );
        })}
      </div>

      {selected && selectedScore !== undefined && selectedHcp !== undefined && (
        <div
          className="mt-3 flex items-center justify-around rounded-2xl border p-3"
          style={{
            borderColor: DISTANCE_COLORS[selectedTarget ?? 0],
            backgroundColor: `${DISTANCE_COLORS[selectedTarget ?? 0]}14`,
          }}
        >
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {selectedTarget}m · Score
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {selectedScore}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">HCP</p>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {handicapLabel(selectedHcp)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Slag</p>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {selected.count}
            </p>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-4 h-[420px] w-full"
        role="img"
        aria-label="Kombinerad spridningskarta för alla avstånd"
      >
        {/* Avståndslinjer + etiketter */}
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={16}
              y1={yFor(g)}
              x2={w - 16}
              y2={yFor(g)}
              className="stroke-foreground/10"
              strokeWidth="1"
            />
            <text
              x={10}
              y={yFor(g) + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[8px]"
            >
              {g}
            </text>
          </g>
        ))}
        {/* Mittlinje */}
        <line
          x1={w / 2}
          y1={padTop}
          x2={w / 2}
          y2={h - padBottom}
          className="stroke-foreground/15"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {targetStats
          .filter((t) => t.count > 0)
          .map((t) => {
            const color = DISTANCE_COLORS[t.target];
            const dimmed = selectedTarget !== null && selectedTarget !== t.target;
            const offlines = t.shots.map((s) => s.offline);
            const carries = t.shots.map((s) => s.carry);
            const meanOff = offlines.reduce((a, b) => a + b, 0) / offlines.length;
            const meanCarry = carries.reduce((a, b) => a + b, 0) / carries.length;
            const stdOff =
              t.count > 1
                ? Math.sqrt(offlines.reduce((a, v) => a + (v - meanOff) ** 2, 0) / t.count)
                : 1.5;
            const stdCarry =
              t.count > 1
                ? Math.sqrt(carries.reduce((a, v) => a + (v - meanCarry) ** 2, 0) / t.count)
                : 1.5;
            const ellipseRy = Math.max(
              5,
              Math.min(60, (stdCarry / (maxCarry - minCarry)) * (h - padTop - padBottom)),
            );
            const ellipseRx = Math.max(5, Math.min(80, stdOff * xScale));

            return (
              <g key={t.target} opacity={dimmed ? 0.12 : 1} style={{ transition: "opacity 200ms" }}>
                <ellipse
                  cx={xFor(meanOff)}
                  cy={yFor(meanCarry)}
                  rx={ellipseRx}
                  ry={ellipseRy}
                  fill={color}
                  fillOpacity={0.12}
                  stroke={color}
                  strokeOpacity={0.5}
                  strokeWidth="1"
                />
                {t.shots.map((s, i) => (
                  <circle
                    key={i}
                    cx={Math.max(8, Math.min(w - 8, xFor(s.offline)))}
                    cy={Math.max(8, Math.min(h - 8, yFor(s.carry)))}
                    r="4"
                    fill={color}
                    className="cursor-pointer"
                    onClick={() => onSelectTarget(selectedTarget === t.target ? null : t.target)}
                  />
                ))}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
