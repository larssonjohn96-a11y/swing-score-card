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
  bunkerShots,
  collectAroundGreenShots,
  expectedScramblingPct,
  outside30Yards,
  type AroundGreenBenchmarkKey,
} from "@/lib/around-green-global";

const RADAR_BLUE = "var(--chart-4)";
const RADAR_RED = "var(--chart-3)";

type MetricKey = "scrambling" | "outside30" | "sandSave";
type Metric = {
  key: MetricKey;
  subject: string;
  raw: number;
  benchmark: number;
  attempts: number;
};

const BENCHMARKS: Record<AroundGreenBenchmarkKey, { label: string }> = {
  tour: { label: "PGA Tour" },
  hcp0: { label: "HCP 0" },
  hcp10: { label: "HCP 10" },
  hcp20: { label: "HCP 20" },
};

const BENCHMARK_ORDER: AroundGreenBenchmarkKey[] = ["tour", "hcp0", "hcp10", "hcp20"];

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Metric & { benchmarkLabel?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{row.subject}</p>
      <p className="mt-1 text-muted-foreground">
        Du: <span className="font-semibold text-foreground">{Math.round(row.raw)}%</span>
      </p>
      <p className="text-muted-foreground">
        {row.benchmarkLabel}: <span className="font-semibold text-foreground">{Math.round(row.benchmark)}%</span>
      </p>
      <p className="text-muted-foreground">{row.attempts} registrerade slag</p>
    </div>
  );
}

export function AroundGreenRadarAnalysis() {
  const [benchmark, setBenchmark] = useState<AroundGreenBenchmarkKey>("hcp10");
  const shots = useMemo(() => collectAroundGreenShots(), []);

  const metrics = useMemo<Metric[]>(() => {
    const outside = outside30Yards(shots);
    const sand = bunkerShots(shots);
    return [
      {
        key: "scrambling",
        subject: "Scrambling",
        raw: expectedScramblingPct(shots),
        benchmark: expectedScramblingPct(shots, benchmark),
        attempts: shots.length,
      },
      {
        key: "outside30",
        subject: "Utanför 30 yd",
        raw: expectedScramblingPct(outside),
        benchmark: expectedScramblingPct(outside, benchmark),
        attempts: outside.length,
      },
      {
        key: "sandSave",
        subject: "Sand save",
        raw: expectedScramblingPct(sand),
        benchmark: expectedScramblingPct(sand, benchmark),
        attempts: sand.length,
      },
    ];
  }, [benchmark, shots]);

  if (!shots.length) return null;

  const data = metrics.map((metric) => ({
    ...metric,
    benchmarkLabel: BENCHMARKS[benchmark].label,
  }));

  return (
    <section className="rounded-3xl border border-border bg-card p-4">
      <h2 className="font-display text-3xl">Analys around the green</h2>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {BENCHMARK_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBenchmark(key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              benchmark === key
                ? "border-chart-3 bg-chart-3/10 text-chart-3"
                : "border-border text-muted-foreground"
            }`}
          >
            {BENCHMARKS[key].label}
          </button>
        ))}
      </div>

      <div className="mt-2 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="65%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <PolarRadiusAxis angle={90} domain={[0, 110]} tick={false} axisLine={false} />
            <Radar
              name={BENCHMARKS[benchmark].label}
              dataKey="benchmark"
              stroke={RADAR_RED}
              fill={RADAR_RED}
              fillOpacity={0.12}
              strokeWidth={2}
            />
            <Radar
              name="Du"
              dataKey="raw"
              stroke={RADAR_BLUE}
              fill={RADAR_BLUE}
              fillOpacity={0.28}
              strokeWidth={2.5}
              dot={{ r: 3, fill: RADAR_BLUE }}
            />
            <Tooltip content={<RadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-4" />Du</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-3" />{BENCHMARKS[benchmark].label}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-border p-3 text-center">
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{metric.subject}</p>
            <p className="mt-1 font-display text-2xl">{metric.attempts ? `${Math.round(metric.raw)}%` : "–"}</p>
            <p className="text-[9px] text-muted-foreground">{metric.attempts} slag</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
        Beräknas från hur nära hålet varje närspelsslag slutar och din puttingdata. Du behöver inte putta i bollen i testet.
      </p>
    </section>
  );
}
