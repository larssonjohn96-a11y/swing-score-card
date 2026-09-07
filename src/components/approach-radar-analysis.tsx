import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  approachLateralErrorPct,
  approachLengthErrorPct,
  approachProximity,
  approachProximityPct,
  collectApproachShots,
  type ApproachShotRecord,
} from "@/lib/approach-global";
import { handicapFromPct } from "@/lib/precision";
import { ratingFromHandicap } from "@/lib/sg-handicap";

const YARDS_100_M = 91.44;
const RADAR_BLUE = "var(--chart-4)";
const RADAR_RED = "var(--chart-3)";

type BenchmarkKey = "tour" | "hcp0" | "hcp10" | "hcp20";
type MetricKey = "inside100" | "outside100" | "proximity" | "length" | "lateral";

type Metric = { key: MetricKey; subject: string; score: number; raw: string; attempts: number };

const BENCHMARKS: Record<BenchmarkKey, { label: string; hcp: number }> = {
  tour: { label: "PGA Tour", hcp: -5 },
  hcp0: { label: "HCP 0", hcp: 0 },
  hcp10: { label: "HCP 10", hcp: 10 },
  hcp20: { label: "HCP 20", hcp: 20 },
};
const BENCHMARK_ORDER: BenchmarkKey[] = ["tour", "hcp0", "hcp10", "hcp20"];
const avg = (rows: number[]) => rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : 0;
const skillFromPct = (pct: number) => ratingFromHandicap(handicapFromPct(pct));

function proximityMetric(key: MetricKey, subject: string, shots: ApproachShotRecord[]): Metric {
  const avgPct = avg(shots.map(approachProximityPct));
  const avgMeters = avg(shots.map(approachProximity));
  return { key, subject, score: shots.length ? skillFromPct(avgPct) : 0, raw: shots.length ? `${avgMeters.toFixed(1).replace(".", ",")} m` : "–", attempts: shots.length };
}
function errorMetric(key: MetricKey, subject: string, shots: ApproachShotRecord[], getter: (shot: ApproachShotRecord) => number): Metric {
  const pct = avg(shots.map(getter));
  return { key, subject, score: shots.length ? skillFromPct(pct) : 0, raw: shots.length ? `${pct.toFixed(1).replace(".", ",")} % fel` : "–", attempts: shots.length };
}
function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Metric }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg"><p className="font-semibold text-foreground">{row.subject}</p><p className="mt-1 text-muted-foreground">Du: <span className="font-semibold text-foreground">{row.raw}</span></p><p className="text-muted-foreground">{row.attempts} registrerade slag</p></div>;
}

export function ApproachRadarAnalysis({ embedded = false }: { embedded?: boolean }) {
  const [benchmark, setBenchmark] = useState<BenchmarkKey>("hcp10");
  const shots = useMemo(() => collectApproachShots(), []);
  const metrics = useMemo<Metric[]>(() => {
    const inside = shots.filter((shot) => shot.target < YARDS_100_M);
    const outside = shots.filter((shot) => shot.target >= YARDS_100_M);
    return [
      proximityMetric("inside100", "Inom 100 yd", inside),
      proximityMetric("outside100", "Över 100 yd", outside),
      proximityMetric("proximity", "Närhet till hål", shots),
      errorMetric("length", "Längdkontroll", shots, approachLengthErrorPct),
      errorMetric("lateral", "Sidledskontroll", shots, approachLateralErrorPct),
    ];
  }, [shots]);
  if (!shots.length) return <div className="flex h-80 items-center justify-center rounded-3xl border border-border bg-card text-sm text-muted-foreground">Registrera approachslag för att bygga analysen.</div>;
  const selectedBenchmark = BENCHMARKS[benchmark];
  const benchmarkScore = ratingFromHandicap(selectedBenchmark.hcp);
  const data = metrics.map((metric) => ({ ...metric, benchmark: benchmarkScore }));
  const body = <>
    <div className="flex gap-2 overflow-x-auto pb-1">{BENCHMARK_ORDER.map((key) => <button key={key} type="button" onClick={() => setBenchmark(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${benchmark === key ? "border-chart-3 bg-chart-3/10 text-chart-3" : "border-border text-muted-foreground"}`}>{BENCHMARKS[key].label}</button>)}</div>
    <div className="mt-2 h-80 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={data} outerRadius="68%"><PolarGrid stroke="var(--border)"/><PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}/><PolarRadiusAxis angle={90} domain={[0,110]} tick={false} axisLine={false}/><Radar name={selectedBenchmark.label} dataKey="benchmark" stroke={RADAR_RED} fill={RADAR_RED} fillOpacity={0.12} strokeWidth={2}/><Radar name="Du" dataKey="score" stroke={RADAR_BLUE} fill={RADAR_BLUE} fillOpacity={0.28} strokeWidth={2.5} dot={{r:3,fill:RADAR_BLUE}}/><Tooltip content={<RadarTooltip/>}/></RadarChart></ResponsiveContainer></div>
    <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-4"/>Du</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-3"/>{selectedBenchmark.label}</span></div>
  </>;
  if (embedded) return <div>{body}</div>;
  return <section className="rounded-3xl border border-border bg-card p-4"><h2 className="font-display text-3xl">Analys approach</h2><div className="mt-4">{body}</div><div className="mt-4 grid grid-cols-2 gap-2">{metrics.map((metric)=><div key={metric.key} className="rounded-2xl border border-border p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{metric.subject}</p><p className="mt-1 font-display text-2xl">{metric.raw}</p><p className="text-[10px] text-muted-foreground">{metric.attempts} slag</p></div>)}</div></section>;
}
