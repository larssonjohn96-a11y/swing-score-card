import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  handicapFromRating,
  hcpLabel,
  type CategorySlug,
  type RatingPoint,
} from "@/lib/sg-handicap";

/* --------------------------------------------------------- 1. Nuvarande nivå */

export function LevelSummary({
  real,
  estimated,
  change90d,
}: {
  real: number | null;
  estimated: number | undefined;
  /** förändring i estimated HCP senaste 3 månaderna, negativt = förbättring */
  change90d: number | undefined;
}) {
  const improving = change90d !== undefined && change90d < 0;
  const flat = change90d === undefined || Math.abs(change90d) < 0.05;
  const Icon = improving ? TrendingDown : TrendingUp;

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-glow)]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">HCP</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none">
            {real !== null ? hcpLabel(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Estimated HCP
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none text-flag">
            {estimated !== undefined ? hcpLabel(estimated) : "–"}
          </p>
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
        {flat ? (
          "Din nivå ligger stabilt de senaste 3 månaderna."
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                improving ? "text-primary" : "text-destructive"
              }`}
            >
              <Icon className="h-4 w-4" />
              {improving ? "↓" : "↑"} {Math.abs(change90d!).toFixed(1).replace(".", ",")}
            </span>
            senaste 3 månaderna
          </>
        )}
      </p>
    </section>
  );
}

/* ----------------------------------------------- 3. Styrkor och svagheter */

export type CategoryVerdict = {
  slug: CategorySlug;
  title: string;
  handicap?: number;
  trend?: number;
  /** benchmark-HCP för kategorin */
  benchmark: number;
  /** positivt = bättre än benchmark (i slag) */
  diff?: number;
};

function toneFor(diff: number | undefined) {
  if (diff === undefined) return "muted";
  if (diff >= 1) return "good";
  if (diff <= -1) return "bad";
  return "neutral";
}

export function CategoryHeatTable({
  rows,
  benchmarkLabel,
}: {
  rows: CategoryVerdict[];
  benchmarkLabel: string;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Styrkor & svagheter
        </p>
        <span className="text-[11px] text-muted-foreground">mot {benchmarkLabel}</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_1fr] gap-2 border-b border-border px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>Kategori</span>
          <span className="text-right">Nivå</span>
          <span className="text-center">Trend</span>
          <span className="text-right">vs nivå</span>
        </div>
        {rows.map((r) => {
          const tone = toneFor(r.diff);
          const toneClass =
            tone === "good"
              ? "bg-primary/10 text-primary"
              : tone === "bad"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground";
          const trendIcon =
            r.trend === undefined || Math.abs(r.trend) < 0.05 ? (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            ) : r.trend < 0 ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />
            );

          return (
            <Link
              key={r.slug}
              to="/utveckling/$slug"
              params={{ slug: r.slug }}
              className="grid grid-cols-[1.4fr_0.8fr_0.6fr_1fr] items-center gap-2 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-muted/40"
            >
              <span className="truncate text-sm font-medium">{r.title}</span>
              <span className="text-right font-[family-name:var(--font-display)] text-lg leading-none">
                {r.handicap !== undefined ? hcpLabel(r.handicap) : "–"}
              </span>
              <span className="flex justify-center">{trendIcon}</span>
              <span className="flex justify-end">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${toneClass}`}>
                  {r.diff === undefined
                    ? "Ingen data"
                    : tone === "good"
                      ? `Över (${r.diff.toFixed(1).replace(".", ",")})`
                      : tone === "bad"
                        ? `Under (${r.diff.toFixed(1).replace(".", ",")})`
                        : "På nivå"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- 4. Ditt fokus */

export function FocusCard({ row }: { row: CategoryVerdict | undefined }) {
  if (!row) return null;
  const worsening = row.trend !== undefined && row.trend > 0.05;
  const below = row.diff !== undefined && row.diff < 0;

  return (
    <section className="mt-8 rounded-3xl border border-primary/40 bg-primary/[0.06] p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Ditt fokus just nu</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-none">
        {row.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {below
          ? `Du ligger under din jämförelsenivå inom ${row.title}`
          : `${row.title} är just nu den svagaste delen av din profil`}
        {worsening ? " och området har försämrats under den senaste perioden." : "."}
      </p>
      <Link
        to="/utveckling/$slug"
        params={{ slug: row.slug }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Se {row.title}-analys
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/* --------------------------------------------------------- 5. Utveckling */

export type DevPeriod = 90 | 180 | 365 | null;
type Metric = "estimated" | "performance";

const PERIODS: { value: DevPeriod; label: string }[] = [
  { value: 90, label: "3 mån" },
  { value: 180, label: "6 mån" },
  { value: 365, label: "1 år" },
  { value: null, label: "All tid" },
];

export function DevelopmentChart({
  points,
  period,
  onPeriodChange,
  realHcp,
}: {
  points: RatingPoint[];
  period: DevPeriod;
  onPeriodChange: (p: DevPeriod) => void;
  realHcp: number | null;
}) {
  const [metric, setMetric] = useState<Metric>("estimated");

  const data = points
    .filter((p) => p.total !== undefined)
    .map((p) => ({
      date: p.date.slice(5),
      value:
        metric === "performance" ? p.total! : Math.round(handicapFromRating(p.total!) * 10) / 10,
    }));

  return (
    <section className="mt-8">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Blir jag bättre?</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onPeriodChange(p.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                p.value === period
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(
            [
              { key: "estimated", label: "Est. HCP" },
              { key: "performance", label: "Performance" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                m.key === metric
                  ? "border-chart-3 bg-chart-3 text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-64 w-full rounded-3xl border border-border bg-card p-3">
        {data.length < 2 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Kör fler tester för att se din utveckling över tid.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                reversed={metric === "estimated"}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v) => [
                  metric === "estimated" ? hcpLabel(Number(v)) : String(v),
                  metric === "estimated" ? "Est. HCP" : "Performance",
                ]}
              />
              {metric === "estimated" && realHcp !== null && (
                <ReferenceLine
                  y={realHcp}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{
                    value: `HCP ${hcpLabel(realHcp)}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--primary)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
