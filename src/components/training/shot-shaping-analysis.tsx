import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, Crosshair, Gauge, Grid3x3, Layers3, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dateLabel, loadSessions, type TrainingSession } from "@/lib/training/core";
import { LIGHT_SURFACE } from "@/routes/8-bollar";

const TESTS = [
  { id: "shot-shaping-vaxlande", label: "Växlande shape", max: 10, to: "/shot-shaping-vaxlande" as const },
  { id: "shot-shaping-konstant", label: "Konstant shape", max: 10, to: "/shot-shaping-konstant" as const },
  { id: "shot-shaping-9-window", label: "9 Window Drill", max: 9, to: "/shot-shaping-9-window" as const },
] as const;

const WINDOW_LABELS = ["Låg draw", "Låg rak", "Låg fade", "Medel draw", "Medel rak", "Medel fade", "Hög draw", "Hög rak", "Hög fade"] as const;
const WINDOW_DISPLAY_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2] as const;
const CLUB_FILTERS = ["Alla klubbor", "Driver", "Woods", "Låga järn", "Höga järn"] as const;
type ClubFilter = (typeof CLUB_FILTERS)[number];

type TestMeta = (typeof TESTS)[number];
type SessionWithTest = TrainingSession & { test: TestMeta };
type ShapeKey = "draw" | "fade";
type ShapeStat = { key: ShapeKey; label: string; hits: number; attempts: number; pct: number };

function pct(hits: number, attempts: number) { return attempts ? Math.round((hits / attempts) * 100) : 0; }

function shotIndexesForShape(testId: string, session: TrainingSession, shape: ShapeKey) {
  if (testId === "shot-shaping-konstant") return session.variant === shape ? session.shots.map((_, index) => index) : [];
  if (testId === "shot-shaping-vaxlande") return session.shots.map((_, index) => index).filter((index) => shape === "draw" ? index % 2 === 0 : index % 2 === 1);
  if (testId === "shot-shaping-9-window") return session.shots.map((_, index) => index).filter((index) => shape === "draw" ? index % 3 === 0 : index % 3 === 2);
  return [];
}

function shapeStat(all: SessionWithTest[], shape: ShapeKey): ShapeStat {
  let hits = 0, attempts = 0;
  all.forEach((session) => shotIndexesForShape(session.test.id, session, shape).forEach((index) => { attempts += 1; if (session.shots[index] > 0) hits += 1; }));
  return { key: shape, label: shape === "draw" ? "Draw" : "Fade", hits, attempts, pct: pct(hits, attempts) };
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/70 bg-white/68 shadow-[0_18px_46px_-34px_rgba(15,23,42,.5)] backdrop-blur-2xl ${className}`}>{children}</div>;
}

export function ShotShapingAnalysis() {
  const [version, setVersion] = useState(0);
  const [clubFilter, setClubFilter] = useState<ClubFilter>("Alla klubbor");
  useEffect(() => setVersion((value) => value + 1), []);

  const all = useMemo<SessionWithTest[]>(() => {
    void version;
    return TESTS.flatMap((test) => loadSessions(test.id).map((session) => ({ ...session, test }))).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [version]);

  const totalShots = all.reduce((sum, session) => sum + session.shots.length, 0);
  const totalHits = all.reduce((sum, session) => sum + session.shots.filter((shot) => shot > 0).length, 0);
  const overall = pct(totalHits, totalShots);
  const draw = shapeStat(all, "draw");
  const fade = shapeStat(all, "fade");
  const shapeGap = draw.attempts && fade.attempts ? Math.abs(draw.pct - fade.pct) : null;
  const stronger = draw.attempts && fade.attempts ? (draw.pct === fade.pct ? "Jämnt" : draw.pct > fade.pct ? "Draw" : "Fade") : "–";

  const recentFive = all.slice(-5), previousFive = all.slice(-10, -5);
  const groupRate = (sessions: SessionWithTest[]) => {
    const attempts = sessions.reduce((sum, session) => sum + session.shots.length, 0);
    const hits = sessions.reduce((sum, session) => sum + session.shots.filter((shot) => shot > 0).length, 0);
    return attempts ? (hits / attempts) * 100 : null;
  };
  const recentRate = groupRate(recentFive), previousRate = groupRate(previousFive);
  const trend = recentRate !== null && previousRate !== null ? recentRate - previousRate : null;

  const highs = TESTS.map((test) => {
    const sessions = all.filter((session) => session.test.id === test.id);
    const best = sessions.length ? Math.max(...sessions.map((session) => session.total)) : null;
    return { ...test, sessions, best, latest: sessions.at(-1) ?? null };
  });

  const clubStats = Array.from(new Set(all.map((session) => session.club).filter(Boolean) as string[])).map((club) => {
    const sessions = all.filter((session) => session.club === club);
    const attempts = sessions.reduce((sum, session) => sum + session.shots.length, 0);
    const hits = sessions.reduce((sum, session) => sum + session.shots.filter((shot) => shot > 0).length, 0);
    return { club, hits, attempts, pct: pct(hits, attempts) };
  }).sort((a, b) => b.attempts - a.attempts);

  const chartData = all.slice(-12).map((session) => ({ label: dateLabel(session.date), value: Math.round((session.total / session.test.max) * 100), test: session.test.label }));

  const nineWindowSessions = all.filter((session) => session.test.id === "shot-shaping-9-window" && (clubFilter === "Alla klubbor" || session.club === clubFilter));
  const windowStats = WINDOW_LABELS.map((label, index) => {
    const values = nineWindowSessions.map((session) => session.shots[index]).filter((value) => value !== undefined);
    const attempts = values.length;
    const hits = values.filter((value) => value > 0).length;
    return { index, label, attempts, hits, pct: attempts ? pct(hits, attempts) : null };
  });
  const ranked = windowStats.filter((item) => item.pct !== null).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  const weakestPct = ranked.length > 1 ? ranked[0]?.pct : null;
  const strongestPct = ranked.length > 1 ? ranked.at(-1)?.pct : null;

  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-20 pt-6 text-foreground">
    <header className="flex items-center gap-3"><Link to="/shot-shaping" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/65 shadow-sm backdrop-blur-xl"><ArrowLeft className="h-4 w-4" /></Link><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shot Shaping</p><h1 className="font-display text-3xl leading-none">Analys</h1></div></header>

    {!all.length ? <GlassCard className="mt-6 p-7 text-center"><BarChart3 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-display text-2xl">Ingen data ännu</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Kör ett Shot Shaping-test så börjar Draw, Fade och testresultat byggas upp här.</p><Link to="/shot-shaping" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Välj test <ArrowRight className="h-4 w-4" /></Link></GlassCard> : <>
      <GlassCard className="mt-5 overflow-hidden p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total shape control</p><p className="mt-2 font-display text-6xl leading-none">{overall}%</p><p className="mt-2 text-xs text-muted-foreground">{totalHits} träffar av {totalShots} slag · alla 3 tester</p></div><span className="rounded-2xl border border-blue-200/70 bg-blue-500/[0.07] p-3 text-blue-600"><Target className="h-5 w-5" /></span></div>{trend !== null ? <div className="mt-4 border-t border-border/45 pt-3 text-xs"><span className="text-muted-foreground">Senaste 5 mot föregående 5</span><span className={`float-right font-bold ${trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"}`}>{trend > 0 ? "+" : ""}{trend.toFixed(1).replace(".", ",")} pp</span></div> : null}</GlassCard>

      <section className="mt-3 grid grid-cols-2 gap-3">{[draw, fade].map((shape) => <GlassCard key={shape.key} className="p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{shape.label}</p><Crosshair className="h-4 w-4 text-blue-500" /></div><p className="mt-2 font-display text-4xl leading-none">{shape.attempts ? `${shape.pct}%` : "–"}</p><p className="mt-2 text-[11px] text-muted-foreground">{shape.attempts ? `${shape.hits}/${shape.attempts} godkända slag` : "Ingen data ännu"}</p>{shape.attempts ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-blue-500" style={{ width: `${shape.pct}%` }} /></div> : null}</GlassCard>)}</section>

      <GlassCard className="mt-3 p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Shape-balans</p><p className="mt-1 text-xs text-muted-foreground">Samlad Draw vs Fade från alla tester</p></div><Gauge className="h-5 w-5 text-slate-500" /></div><div className="mt-4 grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl border border-border/55 bg-white/55 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Starkast</p><p className="mt-1 font-display text-2xl">{stronger}</p></div><div className="rounded-2xl border border-border/55 bg-white/55 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Gap</p><p className="mt-1 font-display text-2xl">{shapeGap === null ? "–" : `${shapeGap} pp`}</p></div></div></GlassCard>

      <GlassCard className="mt-3 p-4"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><Grid3x3 className="h-4 w-4 text-slate-600" /><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">9 Window</p></div><p className="mt-1 text-xs text-muted-foreground">Träffprocent per fönster</p></div><span className="text-[10px] text-muted-foreground">{nineWindowSessions.length} test</span></div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{CLUB_FILTERS.map((filter) => <button key={filter} onClick={() => setClubFilter(filter)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${clubFilter === filter ? "border-slate-600 bg-slate-700 text-white" : "border-slate-300/80 bg-white/65 text-slate-600"}`}>{filter}</button>)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">{WINDOW_DISPLAY_ORDER.map((index) => { const item = windowStats[index]; const strongest = item.pct !== null && strongestPct !== null && item.pct === strongestPct; const weakest = item.pct !== null && weakestPct !== null && item.pct === weakestPct; const tone = strongest ? "border-emerald-300/75 bg-emerald-500/[0.08]" : weakest ? "border-red-300/75 bg-red-500/[0.07]" : "border-slate-300/80 bg-slate-100/70"; return <div key={item.label} className={`rounded-2xl border p-3 text-center ${tone}`}><p className="font-display text-2xl leading-none">{item.pct === null ? "–" : `${item.pct}%`}</p><p className="mt-1.5 text-[9px] font-semibold leading-tight text-slate-600">{item.label}</p><p className="mt-1 text-[9px] text-muted-foreground">{item.attempts ? `${item.hits}/${item.attempts}` : "ingen data"}</p></div>; })}</div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Grönt markerar ditt starkaste fönster och rött ditt svagaste för valt klubbfilter. Hög ligger överst, låg underst.</p>
      </GlassCard>

      <GlassCard className="mt-3 p-4"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Utveckling</p><p className="mt-1 text-xs text-muted-foreground">Resultat normaliserat till träffprocent</p></div><span className="text-[10px] text-muted-foreground">Senaste {chartData.length}</span></div><div className="mt-3 h-48 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}><defs><linearGradient id="shot-shaping-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} /><YAxis domain={[0, 100]} width={34} tickLine={false} axisLine={false} fontSize={10} /><Tooltip contentStyle={{ borderRadius: 14, fontSize: 12, border: "1px solid var(--border)" }} formatter={(value: number) => [`${value}%`, "Träffprocent"]} /><Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} fill="url(#shot-shaping-fill)" /></AreaChart></ResponsiveContainer></div></GlassCard>

      <section className="mt-3"><div className="mb-2 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Personbästa per test</p></div><div className="space-y-2">{highs.map((test) => <Link key={test.id} to={test.to} className="flex items-center gap-3 rounded-3xl border border-white/70 bg-white/68 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,.45)] backdrop-blur-2xl"><span className="min-w-0 flex-1"><span className="block font-semibold">{test.label}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{test.sessions.length} test{test.sessions.length === 1 ? "" : "er"}</span></span><span className="font-display text-2xl">{test.best === null ? "–" : `${test.best}/${test.max}`}</span></Link>)}</div></section>

      {clubStats.length ? <GlassCard className="mt-3 p-4"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-slate-500" /><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Per klubbgrupp</p></div><div className="mt-3 space-y-3">{clubStats.map((club) => <div key={club.club}><div className="flex items-center justify-between text-sm"><span className="font-semibold">{club.club}</span><span className="font-bold tabular-nums">{club.pct}%</span></div><div className="mt-1 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full bg-slate-500" style={{ width: `${club.pct}%` }} /></div><span className="w-14 text-right text-[10px] text-muted-foreground">{club.hits}/{club.attempts}</span></div></div>)}</div></GlassCard> : null}

      <GlassCard className="mt-3 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Datatäckning</p><div className="mt-3 grid grid-cols-3 gap-2 text-center">{highs.map((test) => <div key={test.id} className="rounded-2xl border border-border/50 bg-white/52 p-3"><p className="font-display text-2xl">{test.sessions.length}</p><p className="mt-1 text-[9px] leading-tight text-muted-foreground">{test.label}</p></div>)}</div></GlassCard>
    </>}
  </main>;
}
