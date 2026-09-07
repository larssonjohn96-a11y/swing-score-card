import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
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
  RECENT_PUTT_SAMPLE,
  collectLagHoleOutStarts,
  collectLagProximityStarts,
  collectPuttStarts,
  groupedLagHoleOutStats,
  groupedLagProximityStats,
  latestRows,
  puttingMakeStats,
} from "@/lib/putting-global";

export const Route = createFileRoute("/putting-data")({
  head: () => ({
    meta: [
      { title: "Analys puttning | SG4" },
      {
        name: "description",
        content:
          "Samlad puttinganalys från flera SG4-tester: sänkprocent, lagputt, 3-puttrisk och benchmarkad puttingprofil.",
      },
    ],
  }),
  component: PuttingDataPage,
});

const RADAR_BLUE = "var(--chart-4)";
const RADAR_RED = "var(--chart-3)";
const fmt = (value: number, decimals = 0) => value.toFixed(decimals).replace(".", ",");
const clampPct = (value: number) => Math.max(0, Math.min(100, value));

const SHORT_PUTT_BINS = [
  { min: 0, max: 1, label: "0–1 m" },
  { min: 1, max: 2, label: "1–2 m" },
  { min: 2, max: 3, label: "2–3 m" },
  { min: 3, max: 4, label: "3–4 m" },
  { min: 4, max: 5, label: "4–5 m" },
] as const;

type ShortPuttBin = { label: string; made: number; attempts: number; pct: number };
type Scope = "recent" | "all";
type BenchmarkKey = "tour" | "hcp0" | "hcp10" | "hcp20";
type MetricKey = "0-1" | "1-2" | "2-3" | "3-5" | "three-putt";

type BenchmarkProfile = {
  label: string;
  values: Record<MetricKey, number>;
  skillScore: number;
};

const BENCHMARKS: Record<BenchmarkKey, BenchmarkProfile> = {
  tour: {
    label: "PGA Tour",
    skillScore: 100,
    values: { "0-1": 99, "1-2": 82, "2-3": 50, "3-5": 30, "three-putt": 97.5 },
  },
  hcp0: {
    label: "HCP 0",
    skillScore: 85,
    values: { "0-1": 98, "1-2": 76, "2-3": 49, "3-5": 34, "three-putt": 92.2 },
  },
  hcp10: {
    label: "HCP 10",
    skillScore: 65,
    values: { "0-1": 96, "1-2": 65, "2-3": 39, "3-5": 26, "three-putt": 88.2 },
  },
  hcp20: {
    label: "HCP 20",
    skillScore: 45,
    values: { "0-1": 90, "1-2": 55, "2-3": 33, "3-5": 18, "three-putt": 80.9 },
  },
};

const BENCHMARK_ORDER: BenchmarkKey[] = ["tour", "hcp0", "hcp10", "hcp20"];

function shortPuttBins(exact: ReturnType<typeof puttingMakeStats>): ShortPuttBin[] {
  return SHORT_PUTT_BINS.map((bin, index) => {
    const rows = exact.filter((row) =>
      index === 0
        ? row.distance >= bin.min && row.distance <= bin.max
        : row.distance > bin.min && row.distance <= bin.max,
    );
    const made = rows.reduce((sum, row) => sum + row.made, 0);
    const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
    return { label: bin.label, made, attempts, pct: attempts ? (made / attempts) * 100 : 0 };
  });
}

function weightedPct(rows: Array<{ made: number; attempts: number }>) {
  const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const made = rows.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : 0;
}

function totalAttempts(rows: Array<{ attempts: number }>) {
  return rows.reduce((sum, row) => sum + row.attempts, 0);
}

function skillIndex(metric: MetricKey, raw: number) {
  const anchors = BENCHMARK_ORDER
    .map((key) => ({ raw: BENCHMARKS[key].values[metric], score: BENCHMARKS[key].skillScore }))
    .sort((a, b) => a.raw - b.raw);

  if (raw >= anchors[anchors.length - 1].raw) return 100;
  if (raw <= anchors[0].raw) {
    return clampPct((raw / Math.max(1, anchors[0].raw)) * anchors[0].score);
  }

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const lower = anchors[i];
    const upper = anchors[i + 1];
    if (raw >= lower.raw && raw <= upper.raw) {
      const span = upper.raw - lower.raw || 1;
      const t = (raw - lower.raw) / span;
      return clampPct(lower.score + t * (upper.score - lower.score));
    }
  }
  return 0;
}

function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as {
    subject?: string;
    raw?: number;
    attempts?: number;
    value?: number;
    benchmarkRaw?: number;
    benchmarkLabel?: string;
  } | undefined;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{row.subject}</p>
      <p className="mt-1 text-muted-foreground">
        Du: <span className="font-semibold text-foreground">{fmt(row.raw ?? 0)}%</span>
        {row.attempts ? ` · ${row.attempts}` : ""}
      </p>
      <p className="text-muted-foreground">
        {row.benchmarkLabel}: <span className="font-semibold text-foreground">{fmt(row.benchmarkRaw ?? 0)}%</span>
      </p>
    </div>
  );
}

function PuttingDataPage() {
  const [scope, setScope] = useState<Scope>("recent");
  const [benchmark, setBenchmark] = useState<BenchmarkKey>("hcp10");

  const allStarts = useMemo(() => collectPuttStarts(), []);
  const allLagHoleOut = useMemo(() => collectLagHoleOutStarts(), []);
  const allLagProximity = useMemo(() => collectLagProximityStarts(), []);

  const starts = scope === "recent" ? latestRows(allStarts) : allStarts;
  const lagHoleOutStarts = scope === "recent" ? latestRows(allLagHoleOut) : allLagHoleOut;
  const lagProximityStarts = scope === "recent" ? latestRows(allLagProximity) : allLagProximity;

  const makeStats = puttingMakeStats(starts);
  const shortStats = shortPuttBins(makeStats);
  const lagHoleOut = groupedLagHoleOutStats(lagHoleOutStarts);
  const lagProximity = groupedLagProximityStats(lagProximityStarts);
  const totalStarts = starts.length;

  const threePuttAvoidance = lagHoleOutStarts.length
    ? 100 - (lagHoleOutStarts.filter((row) => row.strokes >= 3).length / lagHoleOutStarts.length) * 100
    : 0;

  const rawMetrics: Array<{ key: MetricKey; subject: string; raw: number; attempts: number }> = [
    { key: "0-1", subject: "0–1 m", raw: shortStats[0]?.pct ?? 0, attempts: shortStats[0]?.attempts ?? 0 },
    { key: "1-2", subject: "1–2 m", raw: shortStats[1]?.pct ?? 0, attempts: shortStats[1]?.attempts ?? 0 },
    { key: "2-3", subject: "2–3 m", raw: shortStats[2]?.pct ?? 0, attempts: shortStats[2]?.attempts ?? 0 },
    { key: "3-5", subject: "3–5 m", raw: weightedPct(shortStats.slice(3)), attempts: totalAttempts(shortStats.slice(3)) },
    { key: "three-putt", subject: "3-putt", raw: threePuttAvoidance, attempts: lagHoleOutStarts.length },
  ];

  const selectedBenchmark = BENCHMARKS[benchmark];
  const radarData = rawMetrics.map((metric) => ({
    subject: metric.subject,
    raw: metric.raw,
    attempts: metric.attempts,
    value: skillIndex(metric.key, metric.raw),
    benchmark: selectedBenchmark.skillScore,
    benchmarkRaw: selectedBenchmark.values[metric.key],
    benchmarkLabel: selectedBenchmark.label,
  }));

  const reliableRisk = lagHoleOut.find((row) => row.attempts >= 5 && row.threePuttPct >= 20);
  const highestRisk = [...lagHoleOut]
    .filter((row) => row.attempts >= 3)
    .sort((a, b) => b.threePuttPct - a.threePuttPct)[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
      <header>
        <Link
          to="/traning"
          search={{ category: "putting" }}
          aria-label="Tillbaka"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="mt-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Putting</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Analys puttning</h1>
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setScope("recent")}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${scope === "recent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          Senaste {RECENT_PUTT_SAMPLE}
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${scope === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          Alla puttar
        </button>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-glow)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Registrerade puttar</p>
          <p className="mt-1 font-display text-5xl leading-none text-primary">{totalStarts}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lagputtar</p>
          <p className="mt-1 font-display text-5xl leading-none">{lagHoleOutStarts.length}</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-4">
        <h2 className="font-display text-3xl">Analys puttning</h2>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {BENCHMARK_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setBenchmark(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${benchmark === key ? "border-chart-3 bg-chart-3/10 text-chart-3" : "border-border text-muted-foreground"}`}
            >
              {BENCHMARKS[key].label}
            </button>
          ))}
        </div>

        <div className="mt-2 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="70%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name={selectedBenchmark.label}
                dataKey="benchmark"
                stroke={RADAR_RED}
                fill={RADAR_RED}
                fillOpacity={0.12}
                strokeWidth={2}
              />
              <Radar
                name="Du"
                dataKey="value"
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
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />Du
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-chart-3" />{selectedBenchmark.label}
          </span>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Kortputt</p>
            <h2 className="font-display text-3xl">Sänkprocent</h2>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {shortStats.map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.attempts ? `${row.made}/${row.attempts}` : "–"}</p>
                </div>
                <p className="font-display text-3xl text-primary">{row.attempts ? `${fmt(row.pct)}%` : "–"}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${clampPct(row.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt</p>
        <h2 className="font-display text-3xl">Puttar till hål</h2>

        {(reliableRisk || highestRisk) ? (
          <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">3-putt risk</p>
            {reliableRisk ? (
              <p className="mt-1 text-sm">
                <span className="font-semibold">{reliableRisk.label}</span> · {fmt(reliableRisk.threePuttPct)}%
              </p>
            ) : (
              <p className="mt-1 text-sm">
                <span className="font-semibold">{highestRisk?.label}</span> · {fmt(highestRisk?.threePuttPct ?? 0)}%
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {lagHoleOut.some((row) => row.attempts) ? (
            lagHoleOut.filter((row) => row.attempts).map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="font-display text-2xl">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.attempts} · {fmt(row.onePuttPct)}% 1-putt · {fmt(row.threePuttPct)}% 3-putt+</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl text-primary">{fmt(row.avgPutts, 2)}</p>
                  <p className="text-[10px] text-muted-foreground">snitt</p>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ingen data ännu.</p>
          )}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt</p>
        <h2 className="font-display text-3xl">Första putten</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {lagProximity.some((row) => row.attempts) ? (
            lagProximity.filter((row) => row.attempts).map((row) => (
              <div key={row.label} className="rounded-2xl border border-border bg-card p-3">
                <p className="font-display text-2xl">{row.label}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{fmt(row.within1mPct)}% inom 1 m</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{row.attempts} · {fmt(row.holedPct)}% hålade</p>
              </div>
            ))
          ) : (
            <p className="col-span-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Ingen data ännu.</p>
          )}
        </div>
      </section>
    </main>
  );
}
