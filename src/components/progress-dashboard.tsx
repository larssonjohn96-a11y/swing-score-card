import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import type {
  CategoryHandicap,
  CategorySlug,
  HeatmapZone,
  HistoryEntry,
  Potential,
  RatingPoint,
  SkillGap,
  StrokesLost,
} from "@/lib/sg-handicap";
import {
  BENCHMARK_LEVELS,
  CATEGORY_LABELS,
  SCRATCH_HANDICAP,
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
  totalRating,
  change30d,
}: {
  totalRating: number | undefined;
  change30d: number | undefined;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-glow)]">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Total Rating</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
        {totalRating ?? "–"}
        {totalRating !== undefined && (
          <span className="ml-1 text-xl text-muted-foreground">/100</span>
        )}
      </p>
      {change30d !== undefined ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <RatingTrend value={change30d} />
          senaste 30 dagarna
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
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
      spelareHcp: c.handicap !== undefined ? hcpLabel(c.handicap) : "–",
      benchmark: ratingFromHandicap(benchmark),
    })),
    {
      subject: "HCP: Totalt",
      spelare: totalHandicap !== undefined ? ratingFromHandicap(totalHandicap) : 0,
      spelareHcp: totalHandicap !== undefined ? hcpLabel(totalHandicap) : "–",
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
          <RadarChart data={data} outerRadius="62%">
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
            >
              <LabelList
                dataKey="spelareHcp"
                position="outside"
                offset={10}
                style={{ fontSize: 11, fontWeight: 700, fill: "var(--chart-4)" }}
              />
            </Radar>
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
          Din nivå (siffror = ditt HCP)
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

/* --------------------------------------------------------------- Skill Gap */

export function SkillGapCard({ gaps }: { gaps: SkillGap[] }) {
  if (!gaps.length) return null;
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Skill Gap – nästa nivå
      </p>
      <div className="mt-3 space-y-2">
        {gaps.map((g) => (
          <div key={g.slug} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">{g.title}</p>
              <p className="text-sm text-muted-foreground">{g.gap} poäng kvar</p>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-[family-name:var(--font-display)] text-xl leading-none">
                {g.current}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-[family-name:var(--font-display)] text-xl leading-none text-primary">
                {g.next}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (g.current / g.next) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------- Slag som tappas */

export function StrokesLostCard({ items }: { items: StrokesLost[] }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.strokes), 0.1);
  return (
    <section className="mt-6">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Slag som tappas per kategori
      </p>
      <div className="mt-3 space-y-2">
        {items.map((i) => (
          <div key={i.slug} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">{i.title}</p>
              <p className="font-[family-name:var(--font-display)] text-xl leading-none text-destructive">
                +{fmt1(i.strokes)} slag
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-destructive"
                style={{ width: `${Math.max(4, (i.strokes / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Grov skattning baserad på kategorins handicap och vikt i totalbetyget.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------- Potential Score */

export function PotentialCard({ items }: { items: Potential[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-6 space-y-2">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Potential Score</p>
      {items.slice(0, 3).map((p) => (
        <div key={p.slug} className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <p className="text-sm leading-relaxed">
            Om du höjer din <span className="font-semibold">{p.title}</span>-score från{" "}
            <span className="font-semibold">{p.fromRating}</span> till{" "}
            <span className="font-semibold">{p.toRating}</span> uppskattas du kunna sänka ditt
            handicap med ungefär <span className="font-semibold">{fmt1(p.impact)}</span> slag.
          </p>
        </div>
      ))}
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

export function HeatmapsSection({
  approach,
  putting,
}: {
  approach: HeatmapZone[];
  putting: HeatmapZone[];
}) {
  if (!approach.length && !putting.length) return null;
  return (
    <section className="mt-6 space-y-3">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Heatmaps</p>
      <HeatmapCard title="Approach – score per avstånd" zones={approach} />
      <HeatmapCard title="Kortputt – träffprocent per avstånd" zones={putting} unit="%" />
    </section>
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
