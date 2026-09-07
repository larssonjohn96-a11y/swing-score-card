import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, User } from "lucide-react";
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
  approachProximityPct,
  collectApproachShots,
} from "@/lib/approach-global";
import {
  bunkerShots,
  collectAroundGreenShots,
  expectedScramblingPct,
  outside30Yards,
  type AroundGreenBenchmarkKey,
} from "@/lib/around-green-global";
import { loadOffTeeSessions } from "@/lib/offtee-store";
import { distanceToHandicap, shotHandicap } from "@/lib/offtee";
import { collectLagHoleOutStarts, collectPuttStarts, puttingMakeStats } from "@/lib/putting-global";
import { handicapFromPct } from "@/lib/precision";
import { loadCardProfile } from "@/lib/rating-card";
import {
  BENCHMARK_LEVELS,
  hcpLabel,
  ratingFromHandicap,
  type CategoryHandicap,
} from "@/lib/sg-handicap";

type View = "total" | "driving" | "approach" | "around" | "putting";
type Row = { subject: string; du: number; target: number; raw?: string; targetRaw?: string; hcp?: number; targetHcp?: number; placeholder?: boolean };
type ChartRow = Row & { duChart: number; targetChart: number };
type PuttingKey = "0-1" | "1-2" | "2-3" | "3-5" | "three-putt";

const TABS: [View, string][] = [["total", "Total"], ["driving", "Off the Tee"], ["approach", "Approach"], ["around", "Around Green"], ["putting", "Putting"]];
const QUICK = BENCHMARK_LEVELS.filter((level) => ["20", "10", "0", "Tour"].includes(level.label));
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const pct = (value: number) => `${Math.round(Number.isFinite(value) ? value : 0)}%`;

const PUTTING_BMS: Record<string, { score: number; values: Record<PuttingKey, number> }> = {
  Tour: { score: 100, values: { "0-1": 99, "1-2": 82, "2-3": 50, "3-5": 30, "three-putt": 97.5 } },
  "0": { score: 85, values: { "0-1": 98, "1-2": 76, "2-3": 49, "3-5": 34, "three-putt": 92.2 } },
  "10": { score: 65, values: { "0-1": 96, "1-2": 65, "2-3": 39, "3-5": 26, "three-putt": 88.2 } },
  "20": { score: 45, values: { "0-1": 90, "1-2": 55, "2-3": 33, "3-5": 18, "three-putt": 80.9 } },
};

function puttingSkill(key: PuttingKey, raw: number) {
  const safeRaw = Number.isFinite(raw) ? raw : 0;
  const anchors = ["20", "10", "0", "Tour"].map((label) => ({ raw: PUTTING_BMS[label].values[key], score: PUTTING_BMS[label].score })).sort((a, b) => a.raw - b.raw);
  if (safeRaw >= anchors.at(-1)!.raw) return 100;
  if (safeRaw <= anchors[0].raw) return clamp((safeRaw / Math.max(1, anchors[0].raw)) * anchors[0].score);
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i], b = anchors[i + 1];
    if (safeRaw >= a.raw && safeRaw <= b.raw) {
      const t = (safeRaw - a.raw) / (b.raw - a.raw || 1);
      return clamp(a.score + t * (b.score - a.score));
    }
  }
  return 0;
}

function puttBin(rows: ReturnType<typeof puttingMakeStats>, min: number, max: number, first = false) {
  const selected = rows.filter((row) => first ? row.distance >= min && row.distance <= max : row.distance > min && row.distance <= max);
  const attempts = selected.reduce((sum, row) => sum + row.attempts, 0);
  const made = selected.reduce((sum, row) => sum + row.made, 0);
  return attempts ? (made / attempts) * 100 : 0;
}

function aroundKey(label: string): AroundGreenBenchmarkKey {
  if (label === "Tour") return "tour";
  if (label === "0") return "hcp0";
  if (label === "20") return "hcp20";
  return "hcp10";
}

function totalRows(cats: CategoryHandicap[], total: number | undefined, target: (typeof QUICK)[number]): Row[] {
  const main = cats.filter((cat) => cat.slug !== "speed").slice(0, 4).map((cat) => ({ subject: cat.title, du: cat.handicap !== undefined ? ratingFromHandicap(cat.handicap) : 0, target: ratingFromHandicap(target.categoryHcp?.[cat.slug] ?? target.hcp), hcp: cat.handicap, targetHcp: target.categoryHcp?.[cat.slug] ?? target.hcp }));
  return [...main, { subject: "Totalt", du: total !== undefined ? ratingFromHandicap(total) : 0, target: ratingFromHandicap(target.hcp), hcp: total, targetHcp: target.hcp }];
}

function drivingRows(target: (typeof QUICK)[number]): Row[] {
  const shots = loadOffTeeSessions().flatMap((session) => session.shots.filter((shot) => shot.filled));
  const targetScore = ratingFromHandicap(target.hcp);
  if (!shots.length) return ["Längd", "Total driving", "Fairway", "Dispersion", "Penalty avoidance"].map((subject) => ({ subject, du: 0, target: targetScore, placeholder: true }));
  const avgTotal = avg(shots.map((shot) => shot.total));
  const overallHcp = avg(shots.map((shot) => shotHandicap(shot)));
  const fairway = shots.filter((shot) => Math.abs(shot.sidled) <= 16).length / shots.length * 100;
  const meanSide = avg(shots.map((shot) => shot.sidled));
  const dispersion = Math.sqrt(avg(shots.map((shot) => (shot.sidled - meanSide) ** 2)));
  const penaltyAvoid = 100 - shots.filter((shot) => Math.abs(shot.sidled) > 28).length / shots.length * 100;
  return [
    { subject: "Längd", du: ratingFromHandicap(distanceToHandicap(avgTotal)), target: targetScore, raw: `${Math.round(avgTotal)} m` },
    { subject: "Total driving", du: ratingFromHandicap(overallHcp), target: targetScore, hcp: overallHcp, targetHcp: target.hcp },
    { subject: "Fairway", du: clamp(fairway), target: targetScore, raw: pct(fairway) },
    { subject: "Dispersion", du: clamp(100 - dispersion * 2.4), target: targetScore, raw: `${dispersion.toFixed(1).replace(".", ",")} m` },
    { subject: "Penalty avoidance", du: clamp(penaltyAvoid), target: targetScore, raw: pct(penaltyAvoid) },
  ];
}

function approachRows(target: (typeof QUICK)[number]): Row[] {
  const shots = collectApproachShots();
  const benchmark = ratingFromHandicap(target.hcp);
  const inside = shots.filter((shot) => shot.target < 91.44);
  const outside = shots.filter((shot) => shot.target >= 91.44);
  const build = (subject: string, selected: typeof shots, getter: (shot: typeof shots[number]) => number): Row => {
    const values = selected.map(getter).filter(Number.isFinite);
    const value = avg(values);
    return { subject, du: values.length ? ratingFromHandicap(handicapFromPct(value)) : 0, target: benchmark, raw: values.length ? `${value.toFixed(1).replace(".", ",")} %` : "–", placeholder: !values.length };
  };
  return [build("Inom 100 yd", inside, approachProximityPct), build("Över 100 yd", outside, approachProximityPct), build("Närhet till hål", shots, approachProximityPct), build("Längdkontroll", shots, approachLengthErrorPct), build("Sidledskontroll", shots, approachLateralErrorPct)];
}

function aroundRows(target: (typeof QUICK)[number]): Row[] {
  const shots = collectAroundGreenShots();
  const key = aroundKey(target.label);
  const outside = outside30Yards(shots);
  const sand = bunkerShots(shots);
  const targetScore = ratingFromHandicap(target.hcp);
  const scrambling = expectedScramblingPct(shots);
  const scramblingTarget = expectedScramblingPct(shots, key);
  return [
    { subject: "Scrambling", du: shots.length ? scrambling : 0, target: shots.length ? scramblingTarget : targetScore, raw: shots.length ? pct(scrambling) : "–", targetRaw: shots.length ? pct(scramblingTarget) : undefined, placeholder: !shots.length },
    { subject: "Utanför 30 yd", du: outside.length ? expectedScramblingPct(outside) : 0, target: outside.length ? expectedScramblingPct(outside, key) : targetScore, raw: outside.length ? pct(expectedScramblingPct(outside)) : "–", targetRaw: outside.length ? pct(expectedScramblingPct(outside, key)) : undefined, placeholder: !outside.length },
    { subject: "Sand save", du: sand.length ? expectedScramblingPct(sand) : 0, target: sand.length ? expectedScramblingPct(sand, key) : targetScore, raw: sand.length ? pct(expectedScramblingPct(sand)) : "–", targetRaw: sand.length ? pct(expectedScramblingPct(sand, key)) : undefined, placeholder: !sand.length },
    { subject: "Närhet", du: 0, target: targetScore, placeholder: true },
    { subject: "Scoringzon", du: 0, target: targetScore, placeholder: true },
  ];
}

function puttingRows(target: (typeof QUICK)[number]): Row[] {
  const starts = collectPuttStarts();
  const lag = collectLagHoleOutStarts();
  const stats = puttingMakeStats(starts);
  const raw: Array<{ key: PuttingKey; subject: string; value: number; hasData: boolean }> = [
    { key: "0-1", subject: "0–1 m", value: puttBin(stats, 0, 1, true), hasData: stats.some((r) => r.distance >= 0 && r.distance <= 1 && r.attempts > 0) },
    { key: "1-2", subject: "1–2 m", value: puttBin(stats, 1, 2), hasData: stats.some((r) => r.distance > 1 && r.distance <= 2 && r.attempts > 0) },
    { key: "2-3", subject: "2–3 m", value: puttBin(stats, 2, 3), hasData: stats.some((r) => r.distance > 2 && r.distance <= 3 && r.attempts > 0) },
    { key: "3-5", subject: "3–5 m", value: puttBin(stats, 3, 5), hasData: stats.some((r) => r.distance > 3 && r.distance <= 5 && r.attempts > 0) },
    { key: "three-putt", subject: "3-putt undvik.", value: lag.length ? 100 - lag.filter((row) => row.strokes >= 3).length / lag.length * 100 : 0, hasData: lag.length > 0 },
  ];
  const benchmark = PUTTING_BMS[target.label] ?? PUTTING_BMS["10"];
  return raw.map((row) => ({ subject: row.subject, du: row.hasData ? puttingSkill(row.key, row.value) : 0, target: benchmark.score, raw: row.hasData ? pct(row.value) : "–", targetRaw: pct(benchmark.values[row.key]), placeholder: !row.hasData }));
}

function chartRows(rows: Row[]): ChartRow[] {
  const safe = rows.map((row) => ({ ...row, du: clamp(row.du), target: clamp(row.target) }));
  const hasAnyPlayerValue = safe.some((row) => row.du > 0);
  return safe.map((row) => ({ ...row, duChart: hasAnyPlayerValue && row.du === 0 ? 1.5 : row.du, targetChart: row.target }));
}

function RadarTooltip({ active, payload, targetLabel }: { active?: boolean; payload?: Array<{ payload?: ChartRow }>; targetLabel: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg"><p className="font-semibold">{row.subject}</p><p className="mt-1 text-muted-foreground">Du: <span className="font-semibold text-foreground">{row.raw ?? (row.hcp !== undefined ? hcpLabel(row.hcp) : row.placeholder ? "Ingen data" : Math.round(row.du))}</span></p><p className="text-muted-foreground">{targetLabel}: <span className="font-semibold text-foreground">{row.targetRaw ?? (row.targetHcp !== undefined ? hcpLabel(row.targetHcp) : Math.round(row.target))}</span></p></div>;
}

export function AnalysisRadarSwitcher({ cats, totalHandicap }: { cats: CategoryHandicap[]; totalHandicap: number | undefined }) {
  const [view, setView] = useState<View>("total");
  const [target, setTarget] = useState(QUICK.find((level) => level.label === "0") ?? QUICK[0]);
  const profile = loadCardProfile();

  const data = useMemo(() => {
    const rows = view === "total" ? totalRows(cats, totalHandicap, target) : view === "driving" ? drivingRows(target) : view === "approach" ? approachRows(target) : view === "around" ? aroundRows(target) : puttingRows(target);
    return chartRows(rows);
  }, [view, cats, totalHandicap, target]);

  const targetLabel = target.label === "Tour" ? "Tour" : `HCP ${target.label}`;

  return <section className="mt-6">
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-chart-4 bg-primary/10">
          {profile.photo ? <img src={profile.photo} alt="" className="h-full w-full object-cover" /> : <User className="h-7 w-7 text-chart-4" strokeWidth={1.5} />}
        </div>
        <p className="text-xs font-semibold">Du</p>
      </div>
      <Link to="/vanner" className="flex flex-col items-center gap-1.5">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-chart-3 bg-chart-3/10">
            <User className="h-7 w-7 text-chart-3" strokeWidth={1.5} />
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-chart-3 text-background"><Plus className="h-3.5 w-3.5" /></span>
        </span>
        <p className="max-w-[5rem] truncate text-xs font-semibold text-muted-foreground">{targetLabel}</p>
      </Link>
    </div>

    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {QUICK.map((level) => <button key={level.label} type="button" onClick={() => setTarget(level)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${target.label === level.label ? "border-chart-3 bg-chart-3 text-background" : "border-border text-muted-foreground"}`}>{level.label === "Tour" ? "Tour" : `HCP ${level.label}`}</button>)}
    </div>

    <p className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">Jämförelseanalys</p>

    <div className="mt-4 h-80 w-full rounded-3xl border border-border bg-card p-3">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
          <PolarRadiusAxis domain={[0, 110]} tick={false} axisLine={false} />
          <Radar name={targetLabel} dataKey="targetChart" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.12} strokeWidth={2} dot={{ r: 4, fill: "var(--chart-3)", stroke: "var(--card)", strokeWidth: 1 }} isAnimationActive animationDuration={320} />
          <Radar name="Du" dataKey="duChart" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.28} strokeWidth={2.5} dot={{ r: 4, fill: "var(--chart-4)", stroke: "var(--card)", strokeWidth: 1 }} isAnimationActive animationDuration={320} />
          <Tooltip content={<RadarTooltip targetLabel={targetLabel} />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>

    <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1"><div className="flex w-max min-w-full justify-center gap-1.5">{TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setView(key)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${view === key ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"}`}>{label}</button>)}</div></div>

    <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-4" />Din nivå</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-3" />{targetLabel}</span></div>

    <p className="mt-4 text-center text-sm text-muted-foreground">Vill du jämföra med andra spelare?</p>
    <Link to="/vanner" className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary">Jämför<span aria-hidden>›</span></Link>
  </section>;
}
