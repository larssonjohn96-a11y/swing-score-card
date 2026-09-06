import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, Trophy, X } from "lucide-react";
import { useRef, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LEGACY_KEYS } from "@/lib/sessions/keys";
import { recordSessionDeleted, recordSessionSaved } from "@/lib/sessions/sync";

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
const STORAGE_KEY = LEGACY_KEYS.eightBall;

export type EightBallSession = { id: string; date: string; score: number; scores?: number[]; roundTotals?: number[] };

export const STATION_LIST = STATIONS;
export const EIGHT_BALL_ROUNDS = ROUNDS;

/** Ljus yta (off-white + djupgrön accent) som delas av test-, resultat- och historiksidan. */
export const LIGHT_SURFACE = {
  "--background": "oklch(0.995 0.005 110)",
  "--foreground": "oklch(0.18 0.035 160)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.18 0.035 160)",
  "--primary": "oklch(0.4 0.11 158)",
  "--primary-foreground": "oklch(0.99 0.008 120)",
  "--primary-bright": "oklch(0.58 0.14 155)",
  "--tint": "oklch(0.972 0.026 158)",
  "--tint-strong": "oklch(0.94 0.045 158)",
  "--accent": "oklch(0.955 0.03 158)",
  "--muted": "oklch(0.965 0.011 150)",
  "--muted-foreground": "oklch(0.46 0.028 158)",
  "--border": "oklch(0.905 0.016 155)",
  "--chart-1": "oklch(0.4 0.11 158)",
} as unknown as import("react").CSSProperties;

export function loadEightBallSessions(): EightBallSession[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

export function deleteEightBallSession(id: string): EightBallSession[] {
  const next = loadEightBallSessions().filter((session) => session.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    recordSessionDeleted("eight-ball", id);
  }
  return next;
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
  const [feedback, setFeedback] = useState<number | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stationIndex = shot % STATIONS.length;
  const station = stationIndex + 1;
  const stationInfo = STATIONS[stationIndex];
  const round = Math.floor(shot / STATIONS.length) + 1;

  function clearFeedback() {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    setFeedback(null);
  }

  function start() { clearFeedback(); setShot(0); setScores([]); setResult(null); setPhase("test"); }
  function previous() {
    if (shot <= 0) return;
    clearFeedback();
    setScores((values) => values.slice(0, -1));
    setShot((value) => Math.max(0, value - 1));
  }
  function register(points: number) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(points);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 650);

    const next = [...scores, points];
    if (shot + 1 >= SHOTS) {
      const total = next.reduce((sum, value) => sum + value, 0);
      const sessions = loadEightBallSessions();
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
      const roundTotals = getRoundTotals(next);
      const record: EightBallSession = { id, date: new Date().toISOString(), score: total, scores: next, roundTotals };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...sessions, record]));
      recordSessionSaved("eight-ball", record);
      setScores(next); setResult(total); setPhase("result");
    } else { setScores(next); setShot((value) => value + 1); }
  }

  if (phase === "intro") return (
    <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 pt-4 text-foreground">
      <div className="flex shrink-0 items-center justify-between">
        <Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <Link to="/8-bollar-historik" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5"/> Progress</Link>
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Around the Green · Träningstest</p>
      <h1 className="mt-2 font-display text-3xl leading-none">8-bollsövningen</h1>
      <p className="mt-2 text-sm font-semibold text-primary">40 slag · 8 stationer · 5 varv</p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">Träna chip, pitch, lobb och bunker och mät hur nära hålet du kommer.</p>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stationer</p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {STATIONS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 text-[13px] last:border-b-0">
              <span className="font-semibold">{s.type}</span>
              <span className="tabular-nums text-muted-foreground">{s.distance} m</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Poäng per slag</p>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">4</span> = sänkt · <span className="font-semibold text-foreground">3</span> = ≤1 m · <span className="font-semibold text-foreground">2</span> = ≤2 m · <span className="font-semibold text-foreground">1</span> = ≤3 m · <span className="font-semibold text-foreground">0</span> = &gt;3 m
        </p>
      </section>

      <button onClick={start} className="mt-auto flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground">Starta test <ArrowRight className="h-5 w-5" /></button>
    </main>
  );

  if (phase === "test") {
    const total = scores.reduce((sum, value) => sum + value, 0);
    return (
      <main
        style={LIGHT_SURFACE}
        className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 text-foreground"
      >
        <div className="flex items-center justify-between pt-[max(.75rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">8-bollsövningen</p>
            <p className="mt-0.5 text-sm font-semibold">Slag {shot + 1} av {SHOTS}</p>
          </div>
          <Link to="/kategori/$slug" params={{ slug: "around-the-green" }} className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold text-muted-foreground"><X className="h-3.5 w-3.5" /> Avbryt</Link>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: ROUNDS }, (_, i) => {
            const active = i === round - 1;
            const done = i < round - 1;
            return (
              <div key={i} className="min-w-0">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: done ? "100%" : active ? `${(stationIndex / STATIONS.length) * 100}%` : "0%" }}
                  />
                </div>
                <p className={`mt-1 text-center text-[9px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>V{i + 1}</p>
              </div>
            );
          })}
        </div>

        <section className="py-5 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Varv {round} · Station {station}</p>
          <div className="mt-2 flex items-end justify-center gap-3">
            <h2 className="font-display text-5xl leading-none">{stationInfo.type}</h2>
            <p className="pb-1 text-xl font-semibold tabular-nums text-primary">{stationInfo.distance} m</p>
          </div>
        </section>

        <div className="relative">
          {feedback !== null ? (
            <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-lg">
              {feedback} poäng registrerat
            </div>
          ) : null}

          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultat</p>
          <div className="grid grid-cols-5 gap-2">
            {[{ p: 4, l: "Sänkt" }, { p: 3, l: "≤ 1 m" }, { p: 2, l: "≤ 2 m" }, { p: 1, l: "≤ 3 m" }, { p: 0, l: "> 3 m" }].map(({ p, l }) => (
              <button
                key={p}
                onClick={() => register(p)}
                className="flex h-[88px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-1 transition-[transform,border-color,background-color] active:scale-[0.97] active:border-primary active:bg-tint"
              >
                <span className="font-display text-3xl leading-none text-primary">{p}</span>
                <span className="mt-2 text-[10px] font-semibold leading-none">{l}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Total hittills</span>
          <span className="font-semibold tabular-nums">{total} poäng</span>
        </div>

        {shot > 0 ? (
          <button onClick={previous} className="mt-1 w-full py-2 text-sm font-semibold text-muted-foreground">
            Ändra föregående slag
          </button>
        ) : <div className="h-9" />}
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

  return (
    <main
      style={LIGHT_SURFACE}
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
          {total}<span className="ml-2 text-xl text-muted-foreground">poäng</span>
        </p>
        {isPb ? (
          <p className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Trophy className="h-3.5 w-3.5" /> Nytt personbästa</p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Personbästa {best} poäng</p>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Bästa varv</p>
          <p className="mt-2 font-display text-3xl leading-none">{bestRound}<span className="ml-1 text-sm text-muted-foreground">poäng</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Varv {bestRoundNumber}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Snitt per varv</p>
          <p className="mt-2 font-display text-3xl leading-none">{(total / ROUNDS).toFixed(1)}<span className="ml-1 text-sm text-muted-foreground">poäng</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Per varv</p>
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
                <span className={`w-20 shrink-0 text-right text-xs font-semibold tabular-nums ${isBest ? "text-primary" : "text-foreground"}`}>{value} poäng</span>
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
            <span className="shrink-0 text-sm font-semibold tabular-nums">{strongest.total} poäng</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
            <span className="text-sm"><b>Fokus:</b> {weakest.type} {weakest.distance} m</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{weakest.total} poäng</span>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Score breakdown</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full table-fixed text-center text-[10px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-[28%] px-2 py-2.5 text-left font-semibold">Station</th>
                <th className="px-1 py-2.5 font-semibold text-primary">Tot</th>
                {Array.from({ length: ROUNDS }, (_, i) => (
                  <th key={i} className={`px-1 py-2.5 font-semibold ${i + 1 === bestRoundNumber ? "text-primary" : ""}`}>V{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((s, stationIdx) => {
                const row = Array.from({ length: ROUNDS }, (_, r) => scores[r * STATIONS.length + stationIdx] ?? 0);
                const rowTotal = row.reduce((a, b) => a + b, 0);
                return (
                  <tr key={stationIdx} className="border-t border-border/60 odd:bg-muted/40">
                    <td className="px-2 py-2.5 text-left leading-tight">
                      <b>{stationIdx + 1}. {s.type}</b><br /><span className="text-muted-foreground">{s.distance} m</span>
                    </td>
                    <td className="px-1 py-2.5 font-semibold tabular-nums text-primary">{rowTotal}</td>
                    {row.map((v, i) => (
                      <td key={i} className={`px-1 py-2.5 tabular-nums ${i + 1 === bestRoundNumber ? "font-semibold text-primary" : ""}`}>{v}</td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t border-border bg-muted/70 font-semibold">
                <td className="px-2 py-2.5 text-left">Alla</td>
                <td className="px-1 py-2.5 tabular-nums text-primary">{total}</td>
                {roundTotals.map((v, i) => (
                  <td key={i} className={`px-1 py-2.5 tabular-nums ${v === bestRound ? "text-primary" : ""}`}>{v}</td>
                ))}
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