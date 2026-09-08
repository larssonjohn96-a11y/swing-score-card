import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
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
import { loadFriends } from "@/lib/friends";
import { fetchFriendSnapshot, listFriendships } from "@/lib/friends-cloud";

export const Route = createFileRoute("/putting-data")({
  head: () => ({ meta: [{ title: "Analys puttning | SG4" }] }),
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
type MetricKey = "0-1" | "1-2" | "2-3" | "3-5" | "three-putt";
type BenchmarkProfile = { label: string; values: Record<MetricKey, number>; skillScore: number; isFriend?: boolean };

type FriendTarget = { label: string; hcp: number };

const BENCHMARKS: BenchmarkProfile[] = [
  { label: "PGA Tour", skillScore: 100, values: { "0-1": 99, "1-2": 82, "2-3": 50, "3-5": 30, "three-putt": 97.5 } },
  { label: "HCP 0", skillScore: 85, values: { "0-1": 98, "1-2": 76, "2-3": 49, "3-5": 34, "three-putt": 92.2 } },
  { label: "HCP 10", skillScore: 65, values: { "0-1": 96, "1-2": 65, "2-3": 39, "3-5": 26, "three-putt": 88.2 } },
  { label: "HCP 20", skillScore: 45, values: { "0-1": 90, "1-2": 55, "2-3": 33, "3-5": 18, "three-putt": 80.9 } },
];

const ANALYSIS_TABS = [
  { label: "Total", to: "/utveckling" as const },
  { label: "Off the Tee", to: "/utveckling/$slug" as const, slug: "driving" },
  { label: "Approach", to: "/utveckling/$slug" as const, slug: "approach" },
  { label: "Short Game", to: "/utveckling/$slug" as const, slug: "around-the-green" },
  { label: "Putting", to: "/putting-data" as const },
  { label: "Speed", to: "/utveckling/$slug" as const, slug: "speed" },
] as const;

function shortPuttBins(exact: ReturnType<typeof puttingMakeStats>): ShortPuttBin[] {
  return SHORT_PUTT_BINS.map((bin, index) => {
    const rows = exact.filter((row) => index === 0 ? row.distance >= bin.min && row.distance <= bin.max : row.distance > bin.min && row.distance <= bin.max);
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

function totalAttempts(rows: Array<{ attempts: number }>) { return rows.reduce((sum, row) => sum + row.attempts, 0); }

function skillIndex(metric: MetricKey, raw: number) {
  const anchors = BENCHMARKS.map((b) => ({ raw: b.values[metric], score: b.skillScore })).sort((a, b) => a.raw - b.raw);
  if (raw >= anchors[anchors.length - 1].raw) return 100;
  if (raw <= anchors[0].raw) return clampPct((raw / Math.max(1, anchors[0].raw)) * anchors[0].score);
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const lower = anchors[i]; const upper = anchors[i + 1];
    if (raw >= lower.raw && raw <= upper.raw) {
      const t = (raw - lower.raw) / (upper.raw - lower.raw || 1);
      return clampPct(lower.score + t * (upper.score - lower.score));
    }
  }
  return 0;
}

function profileForHcp(label: string, hcp: number): BenchmarkProfile {
  const anchors = [
    { hcp: -5, profile: BENCHMARKS[0] },
    { hcp: 0, profile: BENCHMARKS[1] },
    { hcp: 10, profile: BENCHMARKS[2] },
    { hcp: 20, profile: BENCHMARKS[3] },
  ];
  const clamped = Math.max(-5, Math.min(20, hcp));
  let lower = anchors[0]; let upper = anchors[1];
  for (let i = 0; i < anchors.length - 1; i += 1) if (clamped >= anchors[i].hcp && clamped <= anchors[i + 1].hcp) { lower = anchors[i]; upper = anchors[i + 1]; break; }
  const t = (clamped - lower.hcp) / (upper.hcp - lower.hcp || 1);
  const values = Object.fromEntries((Object.keys(lower.profile.values) as MetricKey[]).map((key) => [key, lower.profile.values[key] + t * (upper.profile.values[key] - lower.profile.values[key])])) as Record<MetricKey, number>;
  return { label, isFriend: true, skillScore: lower.profile.skillScore + t * (upper.profile.skillScore - lower.profile.skillScore), values };
}

function RadarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: any }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const isThreePutt = row?.key === "three-putt";
  return <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
    <p className="font-semibold text-foreground">{row?.subject}</p>
    <p className="mt-1 text-muted-foreground">Du: <span className="font-semibold text-foreground">{fmt(row?.raw ?? 0)}%</span>{isThreePutt ? " utan 3-putt" : ""}{row?.attempts ? ` · ${row.attempts}` : ""}</p>
    {isThreePutt ? <p className="text-muted-foreground">3-putt+: <span className="font-semibold text-foreground">{fmt(100 - (row?.raw ?? 0))}%</span></p> : null}
    <p className="text-muted-foreground">{row?.benchmarkLabel}: <span className="font-semibold text-foreground">{fmt(row?.benchmarkRaw ?? 0)}%</span>{isThreePutt ? " utan 3-putt" : ""}</p>
  </div>;
}

function PuttingDataPage() {
  const [scope, setScope] = useState<Scope>("recent");
  const [target, setTarget] = useState<BenchmarkProfile>(BENCHMARKS[2]);
  const [friends, setFriends] = useState<FriendTarget[]>([]);

  useEffect(() => {
    const local = loadFriends().map((f) => ({ label: f.name, hcp: f.handicap }));
    setFriends(local);
    void listFriendships().then(async ({ accepted }) => {
      const cloud = (await Promise.all(accepted.map(async (f) => {
        const snap = await fetchFriendSnapshot(f.other.id);
        if (!snap) return null;
        return { label: f.other.displayName, hcp: snap.categoryHcp?.puttning ?? snap.estHcp ?? snap.realHcp ?? 18 };
      }))).filter((v): v is FriendTarget => Boolean(v));
      setFriends((prev) => [...prev, ...cloud.filter((c) => !prev.some((p) => p.label === c.label))]);
    }).catch(() => undefined);
  }, []);

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
  const threePuttAvoidance = lagHoleOutStarts.length ? 100 - (lagHoleOutStarts.filter((r) => r.strokes >= 3).length / lagHoleOutStarts.length) * 100 : 0;

  const rawMetrics: Array<{ key: MetricKey; subject: string; raw: number; attempts: number }> = [
    { key: "0-1", subject: "0–1 m", raw: shortStats[0]?.pct ?? 0, attempts: shortStats[0]?.attempts ?? 0 },
    { key: "1-2", subject: "1–2 m", raw: shortStats[1]?.pct ?? 0, attempts: shortStats[1]?.attempts ?? 0 },
    { key: "2-3", subject: "2–3 m", raw: shortStats[2]?.pct ?? 0, attempts: shortStats[2]?.attempts ?? 0 },
    { key: "3-5", subject: "3–5 m", raw: weightedPct(shortStats.slice(3)), attempts: totalAttempts(shortStats.slice(3)) },
    { key: "three-putt", subject: "3-putt undvik.", raw: threePuttAvoidance, attempts: lagHoleOutStarts.length },
  ];

  const radarData = rawMetrics.map((metric) => ({ key: metric.key, subject: metric.subject, raw: metric.raw, attempts: metric.attempts, value: skillIndex(metric.key, metric.raw), benchmark: target.skillScore, benchmarkRaw: target.values[metric.key], benchmarkLabel: target.label }));
  const reliableRisk = lagHoleOut.find((row) => row.attempts >= 5 && row.threePuttPct >= 20);
  const highestRisk = [...lagHoleOut].filter((row) => row.attempts >= 3).sort((a, b) => b.threePuttPct - a.threePuttPct)[0];

  return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-24 pt-8">
    <header><Link to="/utveckling" aria-label="Tillbaka" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><ArrowLeft className="h-4 w-4"/></Link><div className="mt-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5"/></span><div><p className="text-xs uppercase tracking-[0.2em] text-primary">Putting</p><h1 className="mt-1 font-display text-4xl leading-none">Analys puttning</h1></div></div></header>

    <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-1"><div className="flex w-max gap-2">{ANALYSIS_TABS.map((tab)=>tab.label==="Putting"?<span key={tab.label} className="rounded-full border border-foreground bg-foreground px-5 py-2.5 text-sm font-semibold text-background">{tab.label}</span>:tab.to==="/utveckling/$slug"?<Link key={tab.label} to={tab.to} params={{slug:tab.slug}} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground">{tab.label}</Link>:<Link key={tab.label} to={tab.to} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground">{tab.label}</Link>)}</div></div>

    <div className="mt-5 grid grid-cols-2 rounded-2xl border border-border bg-muted/50 p-1"><button onClick={()=>setScope("recent")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${scope==="recent"?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>Senaste {RECENT_PUTT_SAMPLE}</button><button onClick={()=>setScope("all")} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${scope==="all"?"bg-card text-foreground shadow-sm":"text-muted-foreground"}`}>Alla puttar</button></div>

    <section className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-3xl border border-border bg-card p-5 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Registrerade puttar</p><p className="mt-1 font-display text-5xl leading-none text-primary">{starts.length}</p></div><div className="rounded-3xl border border-border bg-card p-5 text-center"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lagputtar</p><p className="mt-1 font-display text-5xl leading-none">{lagHoleOutStarts.length}</p></div></section>

    <section className="mt-6 rounded-3xl border border-border bg-card p-4"><h2 className="font-display text-3xl">Analys puttning</h2><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{BENCHMARKS.map((b)=><button key={b.label} onClick={()=>setTarget(b)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${!target.isFriend&&target.label===b.label?"border-chart-3 bg-chart-3/10 text-chart-3":"border-border text-muted-foreground"}`}>{b.label}</button>)}</div>{friends.length?<div className="mt-2 flex gap-2 overflow-x-auto pb-1">{friends.map((f)=><button key={f.label} onClick={()=>setTarget(profileForHcp(f.label,f.hcp))} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${target.isFriend&&target.label===f.label?"border-chart-3 bg-chart-3/10 text-chart-3":"border-border text-muted-foreground"}`}>{f.label}</button>)}</div>:null}<div className="mt-2 h-72 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="70%"><PolarGrid stroke="var(--border)"/><PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:"var(--muted-foreground)"}}/><PolarRadiusAxis angle={90} domain={[0,110]} tick={false} axisLine={false}/><Radar name={target.label} dataKey="benchmark" stroke={RADAR_RED} fill={RADAR_RED} fillOpacity={0.12} strokeWidth={2}/><Radar name="Du" dataKey="value" stroke={RADAR_BLUE} fill={RADAR_BLUE} fillOpacity={0.28} strokeWidth={2.5} dot={{r:3,fill:RADAR_BLUE}}/><Tooltip content={<RadarTooltip/>}/></RadarChart></ResponsiveContainer></div><div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-4"/>Du</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-3"/>{target.label}</span></div></section>

    <section className="mt-6"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Kortputt</p><h2 className="font-display text-3xl">Sänkprocent</h2><div className="mt-3 space-y-2">{shortStats.map((row)=><div key={row.label} className="rounded-2xl border border-border bg-card px-4 py-3"><div className="flex items-center justify-between"><div><p className="font-display text-2xl">{row.label}</p><p className="text-xs text-muted-foreground">{row.attempts?`${row.made}/${row.attempts}`:"–"}</p></div><p className="font-display text-3xl text-primary">{row.attempts?`${fmt(row.pct)}%`:"–"}</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${clampPct(row.pct)}%`}}/></div></div>)}</div></section>

    <section className="mt-7"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt</p><h2 className="font-display text-3xl">Puttar till hål</h2>{(reliableRisk||highestRisk)?<div className="mt-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">3-putt risk</p><p className="mt-1 text-sm"><span className="font-semibold">{(reliableRisk??highestRisk)?.label}</span> · {fmt((reliableRisk??highestRisk)?.threePuttPct??0)}%</p></div>:null}<div className="mt-3 space-y-2">{lagHoleOut.filter(r=>r.attempts).map((row)=><div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><div><p className="font-display text-2xl">{row.label}</p><p className="text-xs text-muted-foreground">{row.attempts} · {fmt(row.onePuttPct)}% 1-putt · {fmt(row.threePuttPct)}% 3-putt+</p></div><div className="text-right"><p className="font-display text-3xl text-primary">{fmt(row.avgPutts,2)}</p><p className="text-[10px] text-muted-foreground">snitt</p></div></div>)}</div></section>

    <section className="mt-7"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lagputt</p><h2 className="font-display text-3xl">Första putten</h2><div className="mt-3 grid grid-cols-2 gap-2">{lagProximity.filter(r=>r.attempts).map((row)=><div key={row.label} className="rounded-2xl border border-border bg-card p-3"><p className="font-display text-2xl">{row.label}</p><p className="mt-1 text-sm font-semibold text-primary">{fmt(row.within1mPct)}% inom 1 m</p><p className="mt-1 text-[11px] text-muted-foreground">{row.attempts} · {fmt(row.holedPct)}% hålade</p></div>)}</div></section>
  </main>;
}
