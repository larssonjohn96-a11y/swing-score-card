import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";

/** V2 uses a separate storage key so legacy 18-putt signed scores are not mixed in. */
const KEY = "sg4-lag-putting-zones-v2";
const DISTANCES = [4, 6, 8, 10, 10, 12, 14, 14, 16] as const;
const ZONES = [
  { points: 3, label: "Hålad" },
  { points: 2, label: "Inom 0,5 m" },
  { points: 1, label: "Inom 1,5 m" },
  { points: 0, label: "Utanför 1,5 m" },
] as const;
const MAX = DISTANCES.length * 3;
type Session = { id: string; at: string; scores: number[]; total: number };
function load(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => Array.isArray(s.scores) && s.scores.length === DISTANCES.length) : [];
  } catch { return []; }
}
function save(scores: number[]): Session {
  const session: Session = {
    id: crypto.randomUUID(), at: new Date().toISOString(),
    scores, total: scores.reduce((sum, score) => sum + score, 0),
  };
  localStorage.setItem(KEY, JSON.stringify([...load(), session]));
  return session;
}
export const Route = createFileRoute("/lagputt")({
  head: () => ({ meta: [
    { title: "Långputtning – 9 puttar, 4–16 m | SG4" },
    { name: "description", content: "Nio långputtar med poängzoner: hålad, inom 0,5 m, inom 1,5 m eller utanför." },
  ] }),
  component: LagPuttPage,
});
function LagPuttPage() {
  useHideBottomNav(true);
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [scores, setScores] = useState<number[]>([]);
  const [saved, setSaved] = useState<Session | null>(null);
  const [analysis, setAnalysis] = useState(false);
  const index = scores.length;
  const total = scores.reduce((sum, s) => sum + s, 0);
  const history = phase === "result" ? load() : [];
  const best = history.length ? Math.max(...history.map((s) => s.total)) : total;
  const inside = scores.filter((score) => score >= 1).length;
  const pct = scores.length ? Math.round(inside / scores.length * 100) : 0;
  function start() {
    setScores([]); setSaved(null); setAnalysis(false); setPhase("test");
  }
  function register(points: number) {
    if (index >= DISTANCES.length) return;
    const next = [...scores, points];
    setScores(next);
    if (next.length === DISTANCES.length) {
      setSaved(save(next));
      setPhase("result");
    }
  }
  return (
    <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-8 pt-5 text-foreground">
      <div className="flex items-center justify-between">
        <Link to="/traning" search={{ category: undefined }} aria-label="Tillbaka" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4"/></Link>
        <span className="text-xs font-semibold text-muted-foreground">Långputtning · 4–16 m</span>
      </div>
      {phase === "intro" ? <>
        <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-primary">SG4 Putting</p>
        <h1 className="mt-2 font-display text-4xl">Långputtning</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">9 puttar med successivt ökande avstånd. Registrera var första putten stannar – du behöver inte putta färdigt.</p>
        <div className="mt-6 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Avstånd i testet</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DISTANCES.map((distance, i) => <div key={i} className="rounded-xl bg-muted px-3 py-3 text-center text-sm font-semibold">{distance} m</div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">10 och 14 meter upprepas för att få totalt nio puttar.</p>
        </div>
        <div className="mt-4 rounded-3xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Poäng per putt</p>
          {ZONES.map(z => <div key={z.points} className="flex justify-between border-t border-border py-2.5 text-sm"><span>{z.label}</span><strong>{z.points} p</strong></div>)}
          <p className="mt-2 text-xs text-muted-foreground">Max 27 poäng. Mät gärna upp 0,5 och 1,5 m med ett snöre i förväg.</p>
        </div>
        <button onClick={start} className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-xl text-primary-foreground">Starta test <ArrowRight className="h-5 w-5"/></button>
      </> : phase === "test" ? <>
        <div className="mt-6 flex items-center justify-between text-sm font-semibold"><span>Putt {index+1} av 9</span><span>{total} / 27 p</span></div>
        <div className="mt-3 flex gap-1">{DISTANCES.map((_,i)=><div key={i} className={`h-2 flex-1 rounded-full ${i<index?"bg-primary":i===index?"bg-primary/50":"bg-muted"}`}/>)}</div>
        <section className="mt-8 rounded-3xl border border-border bg-card px-4 py-12 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Aktuellt avstånd</p>
          <p className="mt-3 font-display text-7xl text-primary">{DISTANCES[index]}<span className="ml-2 text-2xl">m</span></p>
          <p className="mt-3 text-sm text-muted-foreground">Slå en putt och välj var bollen stannade.</p>
        </section>
        <p className="mt-7 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Resultat på första putten</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {ZONES.map(zone => <button key={zone.points} onClick={()=>register(zone.points)} className="flex min-h-28 flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-2 transition-transform active:scale-95"><span className="font-display text-3xl text-primary">{zone.points} p</span><span className="mt-2 text-sm font-semibold">{zone.label}</span></button>)}
        </div>
        <button disabled={!scores.length} onClick={()=>setScores(current=>current.slice(0,-1))} className="mt-4 text-center text-sm text-muted-foreground disabled:opacity-30">Ångra senaste</button>
      </> : <>
        <h1 className="mt-8 font-display text-4xl">Testresultat</h1>
        <div className="mt-5 rounded-3xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Poäng</p>
          <p className="mt-2 font-display text-6xl text-primary">{saved?.total ?? total}<span className="ml-2 text-xl text-muted-foreground">/ 27</span></p>
          <p className="mt-2 text-xs text-muted-foreground">Personbästa: {best}/27</p>
        </div>
        <div className="mt-3 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Inom 1,5 meter</p>
          <p className="mt-2 font-display text-4xl">{inside}/9 <span className="text-lg text-muted-foreground">({pct} %)</span></p>
        </div>
        <button onClick={()=>setAnalysis(v=>!v)} className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 font-semibold text-white">{analysis?"Dölj analys":"Visa analys"}</button>
        {analysis && <div className="mt-3 rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Putt för putt</p>
          {scores.map((points,i)=><div key={i} className="flex justify-between border-b border-border py-2 text-sm"><span>{DISTANCES[i]} m</span><span>{ZONES.find(z=>z.points===points)?.label} · {points} p</span></div>)}
          <p className="mt-3 text-xs text-muted-foreground">SG4 HCP behöver kalibreras för den nya poängskalan och visas därför inte som ett påhittat värde.</p>
        </div>}
        <button onClick={start} className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"><RotateCcw className="h-5 w-5"/> Nytt test</button>
        <Link to="/traning" search={{category:undefined}} className="mt-4 text-center text-sm text-muted-foreground">Tillbaka till träning</Link>
      </>}
    </main>
  );
}
