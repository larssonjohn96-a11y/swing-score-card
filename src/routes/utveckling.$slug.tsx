import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, CheckCircle2, Target, Trophy } from "lucide-react";
import { ChartCard } from "@/components/chart-card";
import { HeatmapCard, HistoryPanel } from "@/components/progress-dashboard";
import { ApproachDeepAnalysis } from "@/components/approach-deep-analysis";
import { PremiumLockLine } from "@/components/premium-lock";
import { useSubscription } from "@/lib/subscription";
import {
  CATEGORY_LABELS,
  computeCategoryDetail,
  computeCategoryHcpTimeline,
  computeRatingTimeline,
  hcpLabel,
  type CategoryDetail,
  type CategorySlug,
  type HcpTimelinePoint,
  type RatingPoint,
} from "@/lib/sg-handicap";

const VALID_SLUGS = Object.keys(CATEGORY_LABELS) as CategorySlug[];

const TIMELINE_KEY: Record<CategorySlug, keyof RatingPoint> = {
  approach: "approach",
  driving: "driving",
  "around-the-green": "aroundGreen",
  puttning: "putting",
  speed: "speed",
};

/** Kort, kategorispecifik förklaring av vad detaljsidan visar. */
const CATEGORY_INTRO: Record<CategorySlug, string> = {
  approach:
    "Din förmåga att spela inspel mot green och sätta upp lätta puttar – från 50 till 150 meter.",
  driving:
    "Din förmåga att slå långa, precisa och konsekventa drives från tee, samt din rena bollhastighet.",
  "around-the-green":
    "Din förmåga att komma nära hålet i närspel och ur bunker – allt inom cirka 20 meter från green.",
  puttning: "Din träffsäkerhet på korta puttar och distanskontroll på längre lagputtar.",
  speed: "Din bollhastighet och kraftöverföring från driver, oavsett teknik.",
};

export const Route = createFileRoute("/utveckling/$slug")({
  loader: ({ params }) => {
    if (!VALID_SLUGS.includes(params.slug as CategorySlug)) throw notFound();
    return { slug: params.slug as CategorySlug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Kategorin hittades inte" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = CATEGORY_LABELS[loaderData.slug];
    return { meta: [{ title: `${title} – Utveckling | SG4` }] };
  },
  notFoundComponent: CategoryDetailNotFound,
  component: CategoryDetailPage,
});

function CategoryDetailNotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16">
      <h1 className="font-display text-4xl">Kategorin finns inte</h1>
      <Link
        to="/utveckling"
        className="mt-6 inline-block rounded-full border border-border px-4 py-2 text-sm"
      >
        Till utveckling
      </Link>
    </main>
  );
}

function CategoryDetailPage() {
  const { slug } = Route.useLoaderData() as { slug: CategorySlug };
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [timeline, setTimeline] = useState<RatingPoint[]>([]);
  const [hcpTimeline, setHcpTimeline] = useState<HcpTimelinePoint[]>([]);
  const { canViewFullHistory } = useSubscription();

  useEffect(() => {
    setDetail(computeCategoryDetail(slug));
    setTimeline(computeRatingTimeline(null));
    setHcpTimeline(computeCategoryHcpTimeline(slug, null));
  }, [slug]);

  if (!detail) return null;

  const key = TIMELINE_KEY[slug];
  const chartData = timeline.filter((p) => p[key] !== undefined);
  const hcpChartData = hcpTimeline.filter((p) => p.raw !== undefined);
  const isApproach = slug === "approach";
  const activeChartLength = isApproach ? hcpChartData.length : chartData.length;
  const hcpValues = hcpChartData.map((p) => p.raw ?? 0);
  const hcpDomain: [number, number] =
    hcpValues.length > 0
      ? [Math.max(0, Math.floor(Math.min(...hcpValues) - 2)), Math.ceil(Math.max(...hcpValues) + 2)]
      : [0, 30];
  const history = detail.history;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-10">
      <Link
        to="/utveckling"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-flag">Detaljerad analys</p>
      <h1 className="mt-1 text-4xl leading-none">{detail.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{CATEGORY_INTRO[slug]}</p>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {detail.title} HCP
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-primary">
          {detail.handicap !== undefined ? hcpLabel(detail.handicap) : "–"}
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 border-t border-border pt-4">
          {slug !== "approach" && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Score</p>
              <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-none">
                {detail.score}
                <span className="text-sm text-muted-foreground">/100</span>
              </p>
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Trend</p>
            <p
              className={`mt-0.5 font-[family-name:var(--font-display)] text-2xl leading-none ${
                detail.trend !== undefined && detail.trend < 0
                  ? "text-primary"
                  : detail.trend !== undefined && detail.trend > 0
                    ? "text-destructive"
                    : ""
              }`}
            >
              {detail.trend !== undefined ? hcpLabel(detail.trend) : "–"}
            </p>
          </div>
        </div>
      </section>

      {slug === "approach" && <ApproachDeepAnalysis />}

      {/* Trend */}
      <section className="mt-6">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Utveckling över tid
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {canViewFullHistory
            ? "Varje genomfört test, i tidsordning."
            : "Dina 3 senaste tester. SG4+ visar hela historiken."}
        </p>
        <ChartCard title={isApproach ? `${detail.title} HCP över tid` : `${detail.title} över tid`}>
          {activeChartLength < 2 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Kör minst två tester i den här kategorin för att se en graf.
            </p>
          ) : isApproach ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={canViewFullHistory ? hcpChartData : hcpChartData.slice(-3)}
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    domain={hcpDomain}
                    reversed
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [hcpLabel(value), "HCP"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="raw"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={canViewFullHistory ? chartData : chartData.slice(-3)}
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                    stroke="var(--muted-foreground)"
                  />
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
                    dataKey={key}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
        {!canViewFullHistory && activeChartLength > 3 && (
          <div className="mt-3">
            <PremiumLockLine label={`Se alla ${activeChartLength} tester`} />
          </div>
        )}
      </section>

      {/* Nyckeltal */}
      {slug !== "approach" && detail.keyMetrics.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Nyckeltal</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {detail.keyMetrics.map((m) => (
              <div key={m.label} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {m.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-none">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Heatmap */}
      {slug !== "approach" && detail.heatmap.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Starka och svaga avstånd
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Snitt av dina senaste 5 tester · grönt är starkt, rött behöver mest träning.
          </p>
          <div className="mt-3">
            <HeatmapCard
              title={slug === "puttning" ? "Träffprocent per avstånd" : "Score per avstånd"}
              zones={detail.heatmap}
              unit={slug === "puttning" ? "%" : ""}
            />
          </div>
        </section>
      )}

      {/* Styrkor / Förbättringsområden */}
      {slug !== "approach" && (detail.strengths.length > 0 || detail.improvements.length > 0) && (
        <section className="mt-6 space-y-4">
          {detail.strengths.length > 0 && (
            <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </span>
                <p className="text-base font-extrabold uppercase tracking-wide text-primary">
                  Styrkor
                </p>
              </div>
              <ul className="mt-4 space-y-3">
                {detail.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-[15px] leading-snug">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detail.improvements.length > 0 && (
            <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Target className="h-5 w-5 text-destructive" />
                </span>
                <p className="text-base font-extrabold uppercase tracking-wide text-destructive">
                  Förbättringsområden
                </p>
              </div>
              <ul className="mt-4 space-y-3">
                {detail.improvements.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-[15px] leading-snug">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Testhistorik */}
      <HistoryPanel entries={history} limit={canViewFullHistory ? undefined : 3} />
      {!canViewFullHistory && history.length > 3 && (
        <div className="mt-2">
          <PremiumLockLine label={`Se alla ${history.length} tester i historiken`} />
        </div>
      )}
    </main>
  );
}
