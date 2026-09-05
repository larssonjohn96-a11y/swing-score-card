import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trophy } from "lucide-react";
import { loadEightBallSessions } from "./8-bollar";

export const Route = createFileRoute("/8-bollar-historik")({
  head: () => ({ meta: [{ title: "8-bollsövningen – Progress | SG4" }] }),
  component: EightBallHistoryPage,
});

function EightBallHistoryPage() {
  const sessions = loadEightBallSessions();
  const complete = sessions.filter((s) => typeof s.score === "number");
  const bestScore = complete.length ? Math.max(...complete.map((s) => s.score)) : 0;
  const roundScores = complete.flatMap((s) => s.roundTotals ?? []);
  const bestRound = roundScores.length ? Math.max(...roundScores) : 0;
  const recent = [...complete].slice(-12);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-16 pt-8">
      <Link to="/8-bollar" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"><ArrowLeft className="h-4 w-4" /></Link>
      <p className="mt-7 text-xs uppercase tracking-[0.22em] text-muted-foreground">8-bollsövningen</p>
      <h1 className="mt-1 text-4xl">Progress</h1>
      <p className="mt-3 text-sm text-muted-foreground">Följ totalresultat över tid och se dina bästa prestationer.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4"><Trophy className="h-4 w-4 text-primary"/><p className="mt-2 text-xs text-muted-foreground">Bästa score</p><p className="font-display text-4xl">{complete.length ? bestScore : "–"}</p><p className="text-xs text-muted-foreground">av 160</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><Trophy className="h-4 w-4 text-primary"/><p className="mt-2 text-xs text-muted-foreground">Bästa varv</p><p className="font-display text-4xl">{roundScores.length ? bestRound : "–"}</p><p className="text-xs text-muted-foreground">av 32</p></div>
      </div>

      <section className="mt-7">
        <div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Utveckling</p><h2 className="mt-1 text-2xl">Score över tid</h2></div><span className="text-xs text-muted-foreground">Senaste {recent.length}</span></div>
        {recent.length ? <div className="mt-4 rounded-3xl border border-border bg-card p-4"><div className="flex h-44 items-end gap-2">{recent.map((s) => { const height=Math.max(8,(s.score/160)*100); return <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center justify-end"><span className="mb-1 text-[9px] font-semibold">{s.score}</span><div className="w-full rounded-t-md bg-primary" style={{height:`${height}%`}} /></div>})}</div><div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>Äldre</span><span>Senaste</span></div></div> : <div className="mt-4 rounded-3xl border border-dashed border-border p-8 text-center"><p className="font-semibold">Ingen historik ännu</p><p className="mt-2 text-xs text-muted-foreground">Genomför ditt första test så börjar utvecklingen sparas här.</p><Link to="/8-bollar" className="mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Till testet</Link></div>}
      </section>

      {complete.length > 0 && <section className="mt-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Historik</p><div className="mt-3 space-y-2">{[...complete].reverse().slice(0,10).map((s) => <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"><div><p className="text-sm font-semibold">{new Date(s.date).toLocaleDateString("sv-SE")}</p><p className="text-xs text-muted-foreground">Bästa varv {s.roundTotals?.length ? Math.max(...s.roundTotals) : "–"} p</p></div><p className="font-display text-3xl">{s.score}</p></div>)}</div></section>}
    </main>
  );
}
