import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, Target, X } from "lucide-react";
import { useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export type FocusKind = "wedge" | "iron";
type Shot = { target: number; actual: number; lateral: number };
type Session = { id: string; date: string; pei: number };

const CONFIG = {
  wedge: { title: "Wedge PEI", min: 50, max: 120, key: "sg4-pei-wedge-v1" },
  iron: { title: "Iron PEI", min: 120, max: 190, key: "sg4-pei-iron-v1" },
} as const;

function generateDistances(min: number, max: number) {
  const count = 18;
  const width = (max - min) / count;
  const values = Array.from({ length: count }, (_, i) => Math.round(min + i * width + Math.random() * width));
  for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
  return values;
}
function shotPei(s: Shot) { return Math.hypot(s.actual - s.target, s.lateral) / s.target * 100; }
function totalPei(shots: Shot[]) { return shots.reduce((sum, s) => sum + shotPei(s), 0) / shots.length; }
function load(key: string): Session[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }

export function PeiFocusTest({ kind }: { kind: FocusKind }) {
  useHideBottomNav(true);
  const cfg = CONFIG[kind];
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(0);
  const [actual, setActual] = useState(0);
  const [lateral, setLateral] = useState(0);
  const [distanceActive, setDistanceActive] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  function start() { const next = generateDistances(cfg.min, cfg.max).map(target => ({ target, actual: target, lateral: 0 })); setShots(next); setIndex(0); setActual(next[0].target); setLateral(0); setDistanceActive(false); setResult(null); setPhase("test"); }
  function commit() { const updated = shots.map((s, i) => i === index ? { ...s, actual, lateral } : s); setShots(updated); if (index === 17) { const pei = totalPei(updated); const sessions = load(cfg.key); localStorage.setItem(cfg.key, JSON.stringify([...sessions, { id: crypto.randomUUID?.() || String(Date.now()), date: new Date().toISOString(), pei }])); setResult(pei); setPhase("result"); } else { const n = index + 1; setIndex(n); setActual(updated[n].target); setLateral(0); setDistanceActive(false); } }

  if (phase === "intro") return <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8"><Link to="/approach-pei-valj" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"><ArrowLeft className="h-4 w-4" /></Link><p className="mt-8 text-xs uppercase tracking-[0.22em] text-muted-foreground">Approach · PEI Precision</p><h1 className="mt-2 text-5xl leading-none">{cfg.title}</h1><p className="mt-4 text-sm leading-relaxed text-muted-foreground">18 kontrollerat slumpade avstånd mellan {cfg.min}–{cfg.max} m. Hela spannet täcks varje gång och ordningen blandas.</p><p className="mt-5 rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">Träningstest · Ej HCP-grundande</p><button onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-display text-2xl text-primary-foreground">Starta 18 slag <ArrowRight className="h-5 w-5" /></button></main>;

  if (phase === "test") { const current = shots[index]; const preview = { ...current, actual, lateral }; return <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Slag {index + 1}/18</span><Link to="/approach-pei-valj" className="flex items-center gap-1 text-xs text-muted-foreground"><X className="h-4 w-4" /> Avbryt</Link></div><div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${index / 18 * 100}%` }} /></div><div className="mt-3 rounded-2xl border border-border bg-card p-3 text-center"><p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mål</p><p className="font-display text-5xl text-flag">{current.target}<span className="ml-1 text-lg text-muted-foreground">m</span></p></div>
  <div className="mt-3 grid grid-cols-2 gap-3">{[["Längd", actual, true], ["Sidled", lateral, false]].map(([label, value, isDistance]) => <div key={String(label)} className="rounded-2xl border border-border bg-card p-3"><p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><button onClick={() => isDistance && setDistanceActive(true)} className={`mt-1 w-full text-center font-display text-4xl ${isDistance && !distanceActive ? "text-muted-foreground" : "text-foreground"}`}>{value}<span className="ml-1 text-base">m</span></button><div className="mt-2 grid grid-cols-4 gap-1">{[-5,-1,1,5].map(d => <button key={d} onClick={() => { if (isDistance) { setDistanceActive(true); setActual(v => Math.max(0,v+d)); } else setLateral(v => Math.max(0,v+d)); }} className="rounded-xl border border-border py-2 text-sm">{d>0?`+${d}`:d}</button>)}</div></div>)}</div>
  <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-5 pb-5 pt-2"><div className="mx-auto mb-2 grid max-w-md grid-cols-4 gap-1 rounded-xl bg-muted/60 px-3 py-2 text-center"><div><p className="text-[9px] text-muted-foreground">Mål</p><p className="text-xs font-semibold">{current.target}m</p></div><div><p className="text-[9px] text-muted-foreground">Längd</p><p className="text-xs font-semibold">{actual}m</p></div><div><p className="text-[9px] text-muted-foreground">Sidled</p><p className="text-xs font-semibold">{lateral}m</p></div><div><p className="text-[9px] text-muted-foreground">PEI</p><p className="text-xs font-semibold">{shotPei(preview).toFixed(1)}%</p></div></div><button onClick={commit} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">{index===17?"Avsluta test":"Nästa slag"}<ArrowRight className="h-5 w-5" /></button></div></main>; }

  const history = load(cfg.key); const best = history.length ? Math.min(...history.map(s => s.pei)) : result!; return <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8"><Link to="/approach-pei-valj" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"><ArrowLeft className="h-4 w-4" /></Link><p className="mt-7 text-xs uppercase tracking-[0.22em] text-muted-foreground">{cfg.title}</p><h1 className="mt-1 text-4xl">Resultat</h1><div className="mt-5 rounded-3xl border border-border bg-card p-6 text-center"><p className="text-xs text-muted-foreground">PEI</p><p className="font-display text-7xl text-primary">{result?.toFixed(2)}%</p><p className="mt-2 text-xs text-muted-foreground">PB {best.toFixed(2)}%</p></div><Link to={kind === "wedge" ? "/approach-pei-wedge-historik" : "/approach-pei-iron-historik"} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-4 font-semibold"><BarChart3 className="h-4 w-4" /> Resultat över tid</Link><button onClick={start} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"><RotateCcw className="h-5 w-5" /> Kör igen</button></main>;
}
