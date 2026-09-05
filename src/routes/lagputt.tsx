import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, X } from "lucide-react";
import { Fragment, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  LAG18_BENCHMARKS,
  LAG18_DISTANCES,
  LAG18_SCORES,
  LAG18_TOTAL,
  distanceGroups,
  fmtScore,
  loadLag18Sessions,
  saveLag18Session,
  sumRange,
} from "@/lib/lagputt18";

export const Route = createFileRoute("/lagputt")({
  head: () => ({
    meta: [
      { title: "Lag putt – 18 puttar 8–22 m | SG4" },
      {
        name: "description",
        content:
          "Lagputtest: 18 puttar från 8 till 22 meter. Signerad poäng per putt, lägre totalscore är bättre. Träningstest utan HCP.",
      },
      { property: "og:title", content: "Lag putt – träningstest | SG4" },
      {
        property: "og:description",
        content: "18 puttar, 8–22 meter. Mät din längdkontroll och följ utvecklingen över tid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LagPuttPage,
});

type Phase = "intro" | "test" | "result";

function LagPuttPage() {
  useHideBottomNav(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [result, setResult] = useState<number | null>(null);

  function start() {
    setIndex(0);
    setScores([]);
    setResult(null);
    setPhase("test");
  }

  function register(points: number) {
    const next = [...scores, points];
    if (next.length >= LAG18_TOTAL) {
      const saved = saveLag18Session(next);
      setScores(next);
      setResult(saved.total);
      setPhase("result");
    } else {
      setScores(next);
      setIndex((v) => v + 1);
    }
  }

  if (phase === "intro") {
    return (
      <main
        style={LIGHT_SURFACE}
        className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 pt-4 text-foreground"
      >
        <div className="flex shrink-0 items-center justify-between">
          <Link to="/traning" search={{ category: undefined }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            to="/lagputt-historik"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Progress
          </Link>
        </div>

        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Putting · Träningstest
        </p>
        <h1 className="mt-2 font-display text-3xl leading-none">Lag putt</h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
          18 puttar från 8 till 22 meter – ett test av din längdkontroll. Slå varje putt från en ny
          riktning mot hålet. Lägre totalscore är bättre.
        </p>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Hål · avstånd
          </p>
          <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[12px] tabular-nums">
            {LAG18_DISTANCES.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-muted-foreground">{i + 1}</span>
                <span className="font-semibold">{d} m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Poäng per putt
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {LAG18_SCORES.map((s) => (
              <div key={s.score} className="flex items-center justify-between border-b border-border/60 pb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{fmtScore(s.score)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Lägre är bättre. Bästa möjliga resultat är −36.
          </p>
        </div>

        <button
          onClick={start}
          className="mt-auto flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
        >
          Starta test <ArrowRight className="h-5 w-5" />
        </button>
      </main>
    );
  }

  if (phase === "test") {
    const running = scores.reduce((a, b) => a + b, 0);
    const distance = LAG18_DISTANCES[index];
    return (
      <main
        style={LIGHT_SURFACE}
        className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-6 text-foreground"
      >
        <div className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="text-sm font-semibold">
            Putt {index + 1} av {LAG18_TOTAL}
          </span>
          <Link
            to="/traning" search={{ category: undefined }}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt
          </Link>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div className="flex gap-1">
            {LAG18_DISTANCES.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] font-semibold text-muted-foreground">
            {index < 9 ? "OUT · hål 1–9" : "IN · hål 10–18"}
          </p>
        </div>

        <section className="mt-3 flex h-[150px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 text-center shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Hål {index + 1}
          </p>
          <p className="mt-2 font-display text-4xl leading-none">{distance} m</p>
          <p className="mt-2 text-sm font-semibold text-primary">Ny riktning mot hålet</p>
        </section>

        <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Avstånd kvar
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {LAG18_SCORES.map((s) => (
            <button
              key={s.score}
              onClick={() => register(s.score)}
              className="flex h-[96px] flex-col items-center justify-center rounded-2xl border border-border bg-card px-1 shadow-sm transition-transform active:scale-95"
            >
              <span className="font-display text-3xl leading-none text-primary">{fmtScore(s.score)}</span>
              <span className="mt-2 text-[11px] font-semibold">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <span className="text-muted-foreground">Hittills · lägre är bättre</span>
          <span className="font-semibold tabular-nums">{fmtScore(running)} poäng</span>
        </div>
      </main>
    );
  }

  const total = result ?? 0;
  const out = sumRange(scores, 0, 9);
  const inn = sumRange(scores, 9, 18);
  const bestHalf = Math.min(out, inn);
  const holed = scores.filter((s) => s === -2).length;
  const within1 = scores.filter((s) => s <= 0).length;
  const sessions = loadLag18Sessions();
  const best = sessions.length ? Math.min(...sessions.map((s) => s.total)) : total;
  const groups = distanceGroups([scores]);
  const strongest = groups.length ? groups.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
  const weakest = groups.length ? groups.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;

  return (
    <main
      style={LIGHT_SURFACE}
      className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/traning" search={{ category: undefined }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Lag putt</h1>
            <p className="text-xs text-muted-foreground">Resultat</p>
          </div>
        </div>
        <Link
          to="/lagputt-historik"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Progress
        </Link>
      </header>

      <section className="mt-5 rounded-3xl border border-border bg-card p-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Totalscore</p>
        <p className="mt-2 font-display text-6xl leading-none text-primary">
          {fmtScore(total)}
          <span className="ml-2 text-xl text-muted-foreground">poäng</span>
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Lägre är bättre · bästa resultat {fmtScore(best)} poäng
        </p>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Kpi label="Bästa nio" value={fmtScore(bestHalf)} hint={bestHalf === out ? "OUT hål 1–9" : "IN hål 10–18"} />
        <Kpi label="Snitt per putt" value={(total / LAG18_TOTAL).toFixed(2)} hint="Poäng per putt" />
        <Kpi label="Hålade puttar" value={String(holed)} hint={`av ${LAG18_TOTAL}`} />
        <Kpi label="Inom 1 meter" value={String(within1)} hint="Hålade + ≤ 1 m" />
      </div>

      {strongest && weakest ? (
        <section className="mt-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Snabb analys</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-primary/8 px-3 py-2.5">
              <span className="text-sm"><b className="text-primary">Starkast:</b> {strongest.distance} m</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{strongest.avg.toFixed(1)} snitt</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
              <span className="text-sm"><b>Fokus:</b> {weakest.distance} m</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{weakest.avg.toFixed(1)} snitt</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Snittpoäng per måldistans – lägre är starkare.</p>
        </section>
      ) : null}

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hål för hål</p>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-2 text-left font-semibold">Hål</th>
              <th className="py-2 text-left font-semibold">Avstånd</th>
              <th className="py-2 text-right font-semibold">Poäng</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((value, i) => (
              <Fragment key={i}>
                <tr className="border-t border-border/60">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2 text-muted-foreground">{LAG18_DISTANCES[i]} m</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{fmtScore(value)}</td>
                </tr>
                {i === 8 ? (
                  <tr className="border-t border-border bg-muted/60 font-semibold">
                    <td className="py-2" colSpan={2}>OUT</td>
                    <td className="py-2 text-right tabular-nums">{fmtScore(out)}</td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            <tr className="border-t border-border bg-muted/60 font-semibold">
              <td className="py-2" colSpan={2}>IN</td>
              <td className="py-2 text-right tabular-nums">{fmtScore(inn)}</td>
            </tr>
            <tr className="border-t border-border font-semibold">
              <td className="py-2" colSpan={2}>Totalt</td>
              <td className="py-2 text-right tabular-nums">{fmtScore(total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Referensnivåer</p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
          {LAG18_BENCHMARKS.map((b) => (
            <div key={b.label} className="flex items-center justify-between border-b border-border/60 pb-1">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-semibold tabular-nums">{b.score}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Ungefärliga snittresultat i testet – ingen handicapberäkning.
        </p>
      </section>

      <button
        onClick={start}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground"
      >
        <RotateCcw className="h-5 w-5" /> Kör igen
      </button>
      <Link
        to="/lagputt-historik"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 font-semibold"
      >
        <BarChart3 className="h-4 w-4" /> Se utveckling
      </Link>
    </main>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
