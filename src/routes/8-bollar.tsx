import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, Target, Trophy, X } from "lucide-react";
import { useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/8-bollar")({
  head: () => ({ meta: [{ title: "8-bollsövningen – Around the Green | SG4" }] }),
  component: EightBallPage,
});

type Phase = "intro" | "test" | "result";
const STATIONS = [
  { type: "Chip", distance: 10 },
  { type: "Chip", distance: 30 },
  { type: "Pitch", distance: 20 },
  { type: "Pitch", distance: 40 },
  { type: "Lobb", distance: 15 },
  { type: "Lobb", distance: 25 },
  { type: "Bunker", distance: 10 },
  { type: "Bunker", distance: 20 },
] as const;
const ROUNDS = 5;
const SHOTS = STATIONS.length * ROUNDS;
const STORAGE_KEY = "sg4-8-bollar-v1";

export type EightBallSession = { id: string; date: string; score: number; scores?: number[]; roundTotals?: number[] };

export function loadEightBallSessions(): EightBallSession[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function getRoundTotals(values: number[]) {
  return Array.from({ length: ROUNDS }, (_, round) => values.slice(round * STATIONS.length, (round + 1) * STATIONS.length).reduce((sum, value) => sum + value, 0));
}

function EightBallPage() {
  useHideBottomNav(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [shot, setShot] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);

  const stationIndex = shot % STATIONS.length;
  const station = stationIndex + 1;
  const stationInfo = STATIONS[stationIndex];
  const round = Math.floor(shot / STATIONS.length) + 1;

  function start() { setShot(0); setScores([]); setResult(null); setPhase("test"); }
  function register(points: number) {
    const next = [...scores, points];
    if (shot + 1 >= SHOTS) {
      const total = next.reduce((sum, value) => sum + value, 0);
      const sessions = loadEightBallSessions();
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
      const roundTotals = getRoundTotals(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...sessions, { id, date: new Date().toISOString(), score: total, scores: next, roundTotals }]));
      setScores(next); setResult(total); setPhase("result");
    } else { setScores(next); setShot((value) => value + 1); }
  }

  if (phase === "intro") return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
      <div className="flex items-center justify-between"><Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"><ArrowLeft className="h-4 w-4" /></Link><Link to="/8-bollar-historik" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"><BarChart3 className="h-4 w-4"/> Progress</Link></div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Around the Green · Träningstest</p>
      <h1 className="mt-2 text-5xl leading-none">8-bollsövningen</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Åtta fasta stationer i ordningen nedan. Spela samtliga stationer fem varv för totalt 40 slag.</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">{STATIONS.map((s, i) => <div key={i} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"><span className="text-sm"><b>Station {i + 1}</b> · {s.type}</span><span className="font-semibold">{s.distance} m</span></div>)}</div>
      <div className="mt-4 rounded-2xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground"><b className="text-foreground">Poäng per slag</b><br/>4 p · Sänkt<br/>3 p · Inom 1 m från hål<br/>2 p · Inom 2 m från hål<br/>1 p · Inom 3 m från hål<br/>0 p · Utanför 3 m</div>
      <button onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">Starta 40 slag <ArrowRight className="h-5 w-5" /></button>
    </main>
  );

  if (phase === "test") {
    const total = scores.reduce((sum, value) => sum + value, 0);
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-4">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold">Slag {shot + 1} / {SHOTS}</span><Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-4 w-4" /> Avbryt</Link></div>
        <div className="mt-4 grid grid-cols-5 gap-2">{Array.from({length: ROUNDS}, (_, i) => { const active=i===round-1; const done=i<round-1; return <div key={i}><div className={`h-2 overflow-hidden rounded-full ${active||done?"bg-primary/20":"bg-muted"}`}><div className="h-full bg-primary" style={{width: done?"100%":active?`${((stationIndex)/STATIONS.length)*100}%`:"0%"}} /></div><p className={`mt-1 text-center text-[10px] font-semibold ${active?"text-primary":"text-muted-foreground"}`}>Varv {i+1}</p></div>})}</div>
        <section className="mt-6 rounded-3xl border border-border bg-card p-6 text-center"><Target className="mx-auto h-6 w-6 text-primary" /><p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Varv {round} · Station {station}</p><p className="mt-2 font-display text-5xl">{stationInfo.type}</p><p className="mt-2 text-lg font-semibold text-primary">{stationInfo.distance} meter från hål</p></section>
        <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultat från hål</p>
        <div className="mt-3 grid grid-cols-5 gap-2">{[{p:4,l:"Sänkt"},{p:3,l:"≤ 1 m"},{p:2,l:"≤ 2 m"},{p:1,l:"≤ 3 m"},{p:0,l:"> 3 m"}].map(({p,l}) => <button key={p} onClick={() => register(p)} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-border bg-card px-1 active:scale-95"><span className="font-display text-3xl">{p}</span><span className="mt-1 text-[10px] font-semibold text-muted-foreground">{l}</span><span className="text-[9px] text-muted-foreground">{p} p</span></button>)}</div>
        <div className="mt-5 flex justify-between rounded-2xl bg-muted/50 px-4 py-3 text-sm"><span className="text-muted-foreground">Hittills</span><span className="font-semibold">{total} p</span></div>
      </main>
    );
  }

  const sessions = loadEightBallSessions();
  const best = sessions.length ? Math.max(...sessions.map((session) => session.score)) : result ?? 0;
  const roundTotals = getRoundTotals(scores);
  const bestRound = Math.max(...roundTotals);
  const bestRoundNumber = roundTotals.indexOf(bestRound) + 1;
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <div className="flex items-center justify-between"><Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"><ArrowLeft className="h-4 w-4" /></Link><Link to="/8-bollar-historik" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"><BarChart3 className="h-4 w-4"/> Progress</Link></div>
      <p className="mt-7 text-xs uppercase tracking-[0.22em] text-muted-foreground">8-bollsövningen</p><h1 className="mt-1 text-4xl">Resultat</h1>
      <div className="mt-5 rounded-3xl border border-border bg-card p-6 text-center"><p className="text-xs text-muted-foreground">Totalpoäng</p><p className="font-display text-7xl text-primary">{result}</p><p className="mt-2 text-xs text-muted-foreground">av 160 poäng</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border bg-card p-4"><Trophy className="h-4 w-4 text-primary" /><p className="mt-2 text-xs text-muted-foreground">Bästa varv</p><p className="font-display text-3xl">{bestRound} p</p><p className="text-xs text-muted-foreground">Varv {bestRoundNumber} · max 32</p></div><div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Personbästa total</p><p className="mt-2 font-display text-3xl">{best} p</p><p className="text-xs text-muted-foreground">max 160</p></div></div>
      <section className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Score breakdown</p><div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full min-w-[520px] text-center text-xs"><thead className="bg-muted/60"><tr><th className="px-2 py-3 text-left">Station</th>{Array.from({length:ROUNDS},(_,i)=><th key={i} className="px-2 py-3">V{i+1}</th>)}<th className="px-2 py-3">Totalt</th></tr></thead><tbody>{STATIONS.map((s, stationIdx)=>{const row=Array.from({length:ROUNDS},(_,r)=>scores[r*STATIONS.length+stationIdx]??0);return <tr key={stationIdx} className="border-t border-border"><td className="px-2 py-3 text-left"><b>{stationIdx+1}. {s.type}</b><br/><span className="text-muted-foreground">{s.distance} m</span></td>{row.map((v,i)=><td key={i} className="px-2 py-3">{v}</td>)}<td className="px-2 py-3 font-semibold">{row.reduce((a,b)=>a+b,0)}</td></tr>})}<tr className="border-t border-border bg-muted/40 font-semibold"><td className="px-2 py-3 text-left">Varv total</td>{roundTotals.map((v,i)=><td key={i} className={`px-2 py-3 ${v===bestRound?"text-primary":""}`}>{v}</td>)}<td className="px-2 py-3">{result}</td></tr></tbody></table></div></section>
      <button onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"><RotateCcw className="h-5 w-5" /> Kör igen</button>
    </main>
  );
}
