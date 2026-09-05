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

export const STATION_LIST = STATIONS;
export const EIGHT_BALL_ROUNDS = ROUNDS;

/** Ljus yta (off-white + djupgrön accent) som delas av test-, resultat- och historiksidan. */
export const LIGHT_SURFACE = {
  "--background": "oklch(0.985 0.004 120)",
  "--foreground": "oklch(0.22 0.03 155)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.22 0.03 155)",
  "--primary": "oklch(0.34 0.07 160)",
  "--primary-foreground": "oklch(0.99 0.005 120)",
  "--muted": "oklch(0.955 0.006 140)",
  "--muted-foreground": "oklch(0.5 0.02 155)",
  "--border": "oklch(0.9 0.008 140)",
} as unknown as import("react").CSSProperties;

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
      <main
        style={LIGHT_SURFACE}
        className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-28 pt-5 text-foreground"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Slag {shot + 1} av {SHOTS}</span>
          <Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" /> Avbryt</Link>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: ROUNDS }, (_, i) => {
              const active = i === round - 1;
              const done = i < round - 1;
              return (
                <div key={i}>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: done ? "100%" : active ? `${(stationIndex / STATIONS.length) * 100}%` : "0%" }} />
                  </div>
                  <p className={`mt-1.5 text-center text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>Varv {i + 1}</p>
                </div>
              );
            })}
          </div>
        </div>

        <section className="mt-4 rounded-3xl border border-border bg-card p-6 text-center">
          <Target className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Varv {round} · Station {station}</p>
          <p className="mt-2 font-display text-5xl leading-none">{stationInfo.type}</p>
          <p className="mt-3 text-base font-semibold text-primary">{stationInfo.distance} meter från hål</p>
        </section>

        <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultat från hål</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[{ p: 4, l: "Sänkt" }, { p: 3, l: "≤ 1 m" }, { p: 2, l: "≤ 2 m" }, { p: 1, l: "≤ 3 m" }, { p: 0, l: "> 3 m" }].map(({ p, l }) => (
            <button
              key={p}
              onClick={() => register(p)}
              className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-border bg-card px-1 shadow-sm transition-transform active:scale-95"
            >
              <span className="font-display text-3xl leading-none text-primary">{p}</span>
              <span className="mt-1.5 text-[11px] font-semibold">{l}</span>
              <span className="mt-0.5 text-[9px] text-muted-foreground">{p} poäng</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3.5 text-sm">
          <span className="text-muted-foreground">Hittills</span>
          <span className="font-semibold tabular-nums">{total} poäng</span>
        </div>
      </main>
    );
  }

  const sessions = loadEightBallSessions();
  const best = sessions.length ? Math.max(...sessions.map((session) => session.score)) : result ?? 0;
  const roundTotals = getRoundTotals(scores);
  const bestRound = Math.max(...roundTotals);
  const bestRoundNumber = roundTotals.indexOf(bestRound) + 1;
  const total = result ?? 0;
  const isPb = total >= best;
  const stationTotals = STATIONS.map((s, stationIdx) => ({
    ...s,
    index: stationIdx,
    total: Array.from({ length: ROUNDS }, (_, r) => scores[r * STATIONS.length + stationIdx] ?? 0).reduce((a, b) => a + b, 0),
  }));
  const strongest = stationTotals.reduce((a, b) => (b.total > a.total ? b : a));
  const weakest = stationTotals.reduce((a, b) => (b.total < a.total ? b : a));

  const lightSurface = {
    "--background": "oklch(0.985 0.004 120)",
    "--foreground": "oklch(0.22 0.03 155)",
    "--card": "oklch(1 0 0)",
    "--card-foreground": "oklch(0.22 0.03 155)",
    "--primary": "oklch(0.34 0.07 160)",
    "--primary-foreground": "oklch(0.99 0.005 120)",
    "--muted": "oklch(0.955 0.006 140)",
    "--muted-foreground": "oklch(0.5 0.02 155)",
    "--border": "oklch(0.9 0.008 140)",
  } as unknown as import("react").CSSProperties;

  return (
    <main
      style={lightSurface}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-lg font-semibold leading-tight">8-bollsövningen</h1>
            <p className="text-xs text-muted-foreground">Resultat</p>
          </div>
        </div>
        <Link to="/8-bollar-historik" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> Progress</Link>
      </header>

      <section className="mt-5 rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Totalpoäng</p>
        <p className="mt-2 font-display text-6xl leading-none text-primary">
          {total}<span className="ml-1 text-2xl text-muted-foreground">/ 160</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{Math.round((total / 160) * 100)}% av max</p>
        {isPb ? (
          <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Trophy className="h-3.5 w-3.5" /> Nytt personbästa</p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Personbästa {best} p</p>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Bästa varv</p>
          <p className="mt-2 font-display text-3xl leading-none">{bestRound}<span className="text-base text-muted-foreground"> / 32</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Varv {bestRoundNumber}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Snitt per varv</p>
          <p className="mt-2 font-display text-3xl leading-none">{(total / ROUNDS).toFixed(1)}</p>
          <p className="mt-1 text-xs text-muted-foreground">av 32 möjliga</p>
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Varv för varv</p>
        <div className="mt-3 space-y-2.5">
          {roundTotals.map((value, i) => {
            const isBest = value === bestRound;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">Varv {i + 1}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${isBest ? "bg-primary" : "bg-primary/25"}`} style={{ width: `${(value / 32) * 100}%` }} />
                </div>
                <span className={`w-14 shrink-0 text-right text-xs font-semibold tabular-nums ${isBest ? "text-primary" : "text-foreground"}`}>{value} / 32</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Snabb analys</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-primary/8 px-3 py-2.5">
            <span className="text-sm"><b className="text-primary">Starkast:</b> {strongest.type} {strongest.distance} m</span>
            <span className="text-sm font-semibold tabular-nums">{strongest.total}/20</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
            <span className="text-sm"><b>Fokus:</b> {weakest.type} {weakest.distance} m</span>
            <span className="text-sm font-semibold tabular-nums">{weakest.total}/20</span>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Score breakdown</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[480px] text-center text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="sticky left-0 bg-card px-3 py-3 text-left font-semibold">Station</th>
                {Array.from({ length: ROUNDS }, (_, i) => (
                  <th key={i} className={`px-2 py-3 font-semibold ${i + 1 === bestRoundNumber ? "text-primary" : ""}`}>V{i + 1}</th>
                ))}
                <th className="px-3 py-3 font-semibold">Totalt</th>
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((s, stationIdx) => {
                const row = Array.from({ length: ROUNDS }, (_, r) => scores[r * STATIONS.length + stationIdx] ?? 0);
                return (
                  <tr key={stationIdx} className="border-t border-border/60 odd:bg-muted/40">
                    <td className="sticky left-0 bg-inherit px-3 py-3 text-left">
                      <b>{stationIdx + 1}. {s.type}</b><br /><span className="text-muted-foreground">{s.distance} m</span>
                    </td>
                    {row.map((v, i) => (
                      <td key={i} className={`px-2 py-3 tabular-nums ${i + 1 === bestRoundNumber ? "font-semibold text-primary" : ""}`}>{v}</td>
                    ))}
                    <td className="px-3 py-3 font-semibold tabular-nums">{row.reduce((a, b) => a + b, 0)}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-border bg-muted/70 font-semibold">
                <td className="sticky left-0 bg-inherit px-3 py-3 text-left">Varv total</td>
                {roundTotals.map((v, i) => (
                  <td key={i} className={`px-2 py-3 tabular-nums ${v === bestRound ? "text-primary" : ""}`}>{v}</td>
                ))}
                <td className="px-3 py-3 tabular-nums">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <button onClick={start} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"><RotateCcw className="h-5 w-5" /> Kör igen</button>
      <Link to="/8-bollar-historik" className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-semibold"><BarChart3 className="h-4 w-4" /> Se utveckling</Link>
    </main>
  );
}
