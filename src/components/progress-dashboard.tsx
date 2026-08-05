import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import type {
  CategoryCardStat,
  CategoryHandicap,
  CategorySlug,
  HcpTimelinePoint,
  HeatmapZone,
  HistoryEntry,
  RatingPoint,
} from "@/lib/sg-handicap";
import {
  BENCHMARK_LEVELS,
  CATEGORY_LABELS,
  SCRATCH_HANDICAP,
  computeCategoryCardStats,
  computeCategoryHcpTimeline,
  hcpLabel,
  ratingFromHandicap,
} from "@/lib/sg-handicap";

function fmt1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/** Trend där HÖGRE är bättre (rating), till skillnad från home-dashboardens handicap-trend. */
function RatingTrend({ value }: { value?: number }) {
  if (value === undefined || Math.abs(value) < 0.5) return null;
  const improving = value > 0;
  const Icon = improving ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
        improving ? "text-primary" : "text-destructive"
      }`}
    >
      <Icon className="h-4 w-4" />
      {improving ? "+" : ""}
      {Math.round(value)} poäng
    </span>
  );
}

/* --------------------------------------------------------------- Översikt */

export function OverviewCard({
  real,
  estimated,
  totalRating,
  change30d,
}: {
  real: number | null;
  estimated: number | undefined;
  totalRating: number | undefined;
  change30d: number | undefined;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Real HCP</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none">
            {real !== null ? hcpLabel(real) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Est. Total HCP
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none text-flag">
            {estimated !== undefined ? hcpLabel(estimated) : "–"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Total Rating
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl leading-none text-primary">
            {totalRating ?? "–"}
          </p>
        </div>
      </div>
      {change30d !== undefined ? (
        <p className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
          <RatingTrend value={change30d} />
          senaste 30 dagarna
        </p>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-center text-sm text-muted-foreground">
          Kör fler tester för att se din utveckling över tid.
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------- Jämförelseanalys */

export function RadarCard({
  cats,
  totalHandicap,
}: {
  cats: CategoryHandicap[];
  totalHandicap: number | undefined;
}) {
  const [benchmark, setBenchmark] = useState<number>(SCRATCH_HANDICAP);

  const data = [
    ...cats.map((c) => ({
      subject: `HCP: ${c.title}`,
      spelare: c.handicap !== undefined ? ratingFromHandicap(c.handicap) : 0,
      benchmark: ratingFromHandicap(benchmark),
    })),
    {
      subject: "HCP: Totalt",
      spelare: totalHandicap !== undefined ? ratingFromHandicap(totalHandicap) : 0,
      benchmark: ratingFromHandicap(benchmark),
    },
  ];

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Jämförelseanalys</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Din nivå per kategori jämfört med en vald handicapnivå
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {BENCHMARK_LEVELS.map((lvl) => (
          <Chip
            key={lvl.label}
            active={benchmark === lvl.hcp}
            label={lvl.label === "Tour" ? "Tour" : `HCP ${lvl.label}`}
            swatch="bg-chart-3"
            onClick={() => setBenchmark(lvl.hcp)}
          />
        ))}
      </div>
      <div className="mt-4 h-80 w-full rounded-3xl border border-border bg-card p-3">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name={`HCP ${BENCHMARK_LEVELS.find((l) => l.hcp === benchmark)?.label ?? benchmark}`}
              dataKey="benchmark"
              stroke="var(--chart-3)"
              fill="var(--chart-3)"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-3)", stroke: "var(--card)", strokeWidth: 1 }}
            />
            <Radar
              name="Din nivå"
              dataKey="spelare"
              stroke="var(--chart-4)"
              fill="var(--chart-4)"
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-4)", stroke: "var(--card)", strokeWidth: 1 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />
          Din nivå
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-3" />
          {BENCHMARK_LEVELS.find((l) => l.hcp === benchmark)?.label === "Tour"
            ? "Tour"
            : `HCP ${BENCHMARK_LEVELS.find((l) => l.hcp === benchmark)?.label ?? benchmark}`}
        </span>
      </div>
    </section>
  );
}

function Chip({
  active,
  label,
  swatch,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  swatch: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "border-primary text-foreground" : "border-border text-muted-foreground"
      } ${disabled ? "opacity-50" : ""}`}
    >
      {active && <span className={`h-2 w-2 rounded-full ${swatch}`} />}
      {label}
    </button>
  );
}

/* ---------------------------------------------------- Kategori-stats (klickbara) */

const CARD_PERIODS = [
  { label: "30 dagar", days: 30 },
  { label: "90 dagar", days: 90 },
  { label: "12 månader", days: 365 },
] as const;

const CATEGORY_TABS: CategorySlug[] = ["approach", "driving", "around-the-green", "puttning"];

/** Trend för RÅTT HCP (inte rating): lägre är alltid bättre, till skillnad från RatingTrend. */
function HcpTrend({ change, periodLabel }: { change?: number; periodLabel: string }) {
  if (change === undefined || Math.abs(change) < 0.05) {
    return <p className="mt-1 text-xs text-muted-foreground">Ingen förändring {periodLabel}</p>;
  }
  const improving = change < 0;
  const Icon = improving ? TrendingDown : TrendingUp;
  return (
    <p
      className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
        improving ? "text-primary" : "text-destructive"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {fmt1(Math.abs(change))} HCP {periodLabel}
    </p>
  );
}

export function CategoryStatsSection() {
  const [period, setPeriod] = useState<number>(90);
  const [activeCategory, setActiveCategory] = useState<CategorySlug>("approach");
  const [cards, setCards] = useState<CategoryCardStat[]>([]);
  const [timeline, setTimeline] = useState<HcpTimelinePoint[]>([]);

  useEffect(() => {
    setCards(computeCategoryCardStats(period));
  }, [period]);

  useEffect(() => {
    setTimeline(computeCategoryHcpTimeline(activeCategory, period === 365 ? null : period));
  }, [activeCategory, period]);

  const periodLabel =
    period === 30
      ? "senaste 30 dagarna"
      : period === 90
        ? "senaste 90 dagarna"
        : "senaste 12 månaderna";

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Stats per kategori
        </p>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {CARD_PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setPeriod(p.days)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              period === p.days
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.slug}
            to={c.hasData ? "/utveckling/$slug" : "/kategori/$slug"}
            params={{ slug: c.slug }}
            className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
              {c.title}
            </p>
            {c.hasData ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Est. HCP{" "}
                  <span className="font-[family-name:var(--font-display)] text-xl text-flag">
                    {c.estHcp !== undefined ? hcpLabel(c.estHcp) : "–"}
                  </span>
                </p>
                <HcpTrend change={c.change} periodLabel={periodLabel} />
                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {c.strongest && (
                    <p>
                      Starkast: <span className="text-foreground">{c.strongest}</span>
                    </p>
                  )}
                  {c.improve && (
                    <p>
                      Förbättra: <span className="text-foreground">{c.improve}</span>
                    </p>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold text-flag">Visa analys →</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">Inget test genomfört ännu.</p>
                <p className="mt-3 text-xs font-semibold text-flag">Genomför ett test →</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Uppskattad HCP över tid
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Rullande snitt av de senaste 3–5 testerna · lägre HCP = bättre
        </p>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => setActiveCategory(slug)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeCategory === slug
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {CATEGORY_LABELS[slug]}
            </button>
          ))}
        </div>
        <ChartCard title={`${CATEGORY_LABELS[activeCategory]} – HCP över tid`}>
          {timeline.length < 2 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Kör minst två tester i den här kategorin för att se en graf.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timeline}
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Scatter dataKey="raw" name="Enskilt test" fill="var(--chart-3)" />
                  <Line
                    type="monotone"
                    dataKey="rolling"
                    name="Rullande snitt"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Heatmaps */

function heatColor(score: number): string {
  if (score >= 70) return "bg-primary/15 text-primary border-primary/30";
  if (score >= 45) return "bg-flag/15 text-flag border-flag/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

export function HeatmapCard({
  title,
  zones,
  unit = "",
}: {
  title: string;
  zones: HeatmapZone[];
  unit?: string;
}) {
  if (!zones.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {zones.map((z) => (
          <div key={z.label} className={`rounded-xl border p-2 text-center ${heatColor(z.score)}`}>
            <p className="text-[11px] font-medium opacity-80">{z.label}</p>
            <p className="font-[family-name:var(--font-display)] text-xl leading-none">
              {Math.round(z.score)}
              {unit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Utvecklingsgrafer */

const PERIODS = [
  { label: "30 dagar", days: 30 },
  { label: "90 dagar", days: 90 },
  { label: "12 månader", days: 365 },
  { label: "Alla tester", days: null },
] as const;

const METRICS = [
  { key: "total", label: "Total Rating", color: "var(--primary)" },
  { key: "approach", label: "Approach", color: "var(--flag)" },
  { key: "driving", label: "Off the Tee", color: "var(--chart-4)" },
  { key: "aroundGreen", label: "Around Green", color: "var(--sand)" },
  { key: "putting", label: "Putting", color: "var(--destructive)" },
] as const;

export function TrendChartsCard({
  points,
  period,
  onPeriodChange,
}: {
  points: RatingPoint[];
  period: (typeof PERIODS)[number]["days"];
  onPeriodChange: (days: (typeof PERIODS)[number]["days"]) => void;
}) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("total");
  const active = METRICS.find((m) => m.key === metric)!;
  const data = points.filter((p) => p[metric] !== undefined);

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Utvecklingsgrafer</p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              metric === m.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPeriodChange(p.days)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              period === p.days
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <ChartCard title={`${active.label} över tid`}>
        {data.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Kör minst två tester i den här kategorin för att se en graf.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={active.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </section>
  );
}

/* --------------------------------------------------------------- Historik */

const HISTORY_FILTERS: { slug: CategorySlug | "all"; label: string }[] = [
  { slug: "all", label: "Alla" },
  { slug: "approach", label: CATEGORY_LABELS.approach },
  { slug: "driving", label: CATEGORY_LABELS.driving },
  { slug: "around-the-green", label: CATEGORY_LABELS["around-the-green"] },
  { slug: "puttning", label: CATEGORY_LABELS.puttning },
];

export function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  const [filter, setFilter] = useState<CategorySlug | "all">("all");
  const [compare, setCompare] = useState<string[]>([]);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.categorySlug === filter);
  const compared = compare
    .map((k) => entries.find((e) => e.key === k))
    .filter(Boolean) as HistoryEntry[];

  function toggleCompare(key: string) {
    setCompare((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  }

  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Historik</p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.slug}
            type="button"
            onClick={() => setFilter(f.slug)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.slug
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {compared.length === 2 && (
        <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/[0.06] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Jämförelse</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {compared.map((e) => (
              <div key={e.key}>
                <p className="text-xs text-muted-foreground">{e.title}</p>
                <p className="text-[11px] text-muted-foreground">{e.date.slice(0, 10)}</p>
                <p className="font-[family-name:var(--font-display)] text-2xl leading-none">
                  {e.score}
                  {e.scoreUnit}
                </p>
              </div>
            ))}
          </div>
          {typeof compared[0].score === "number" && typeof compared[1].score === "number" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Skillnad:{" "}
              {(compared[1].score - compared[0].score >= 0 ? "+" : "") +
                Math.round((compared[1].score - compared[0].score) * 10) / 10}
              {compared[0].scoreUnit}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Inga tester i den här kategorin ännu.
          </p>
        ) : (
          filtered.map((e) => (
            <div
              key={e.key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <input
                type="checkbox"
                checked={compare.includes(e.key)}
                onChange={() => toggleCompare(e.key)}
                aria-label={`Välj ${e.title} ${e.date.slice(0, 10)} för jämförelse`}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.date.slice(0, 10)}</p>
              </div>
              {e.score !== undefined && (
                <span className="font-[family-name:var(--font-display)] text-lg leading-none">
                  {e.score}
                  {e.scoreUnit}
                </span>
              )}
              <Link
                to="/framsteg/$slug/$test"
                params={{ slug: e.to.slug, test: e.to.test }}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Öppna
              </Link>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Markera två tester med kryssrutorna för att jämföra dem. "Öppna" tar dig till den
        detaljerade grafen för testtypen.
      </p>
    </section>
  );
}
