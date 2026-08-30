import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FIFTY_PUTT_PAR,
  FIFTY_PUTT_TOTAL,
  emptyFiftyPuttEntries,
  loadFiftyPuttSessions,
  saveFiftyPuttSession,
  type FiftyPuttEntry,
} from "@/lib/fifty-putts";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/50-bollar")({
  head: () => ({
    meta: [
      { title: "50-bollsövningen – Putting | SG4" },
      {
        name: "description",
        content:
          "50 puttar från 1–5 meter. Håla varje boll, räkna alla slag och följ ditt resultat över tid.",
      },
    ],
  }),
  component: FiftyBallPuttingPage,
});

function FiftyBallPuttingPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"intro" | "test">("intro");
  const [entries, setEntries] = useState<FiftyPuttEntry[]>(emptyFiftyPuttEntries);
  const [index, setIndex] = useState(0);
  useHideBottomNav(phase === "test");

  const current = entries[index];
  const runningTotal = useMemo(
    () => entries.slice(0, index + 1).reduce((sum, entry) => sum + entry.strokes, 0),
    [entries, index],
  );

  function changeStrokes(delta: number) {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, strokes: Math.max(1, Math.min(9, entry.strokes + delta)) } : entry,
      ),
    );
  }

  function next() {
    if (index + 1 < FIFTY_PUTT_TOTAL) {
      setIndex((value) => value + 1);
      return;
    }
    saveFiftyPuttSession(entries);
    navigate({ to: "/50-bollar-resultat" });
  }

  if (phase === "intro") {
    const previous = loadFiftyPuttSessions();
    const best = previous.length ? Math.min(...previous.map((session) => session.total)) : null;
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-20 pt-8">
        <div className="flex items-center justify-between">
          <Link
            to="/kategori/$slug"
            params={{ slug: "puttning" }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
            aria-label="Tillbaka"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            to="/50-bollar-resultat"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Resultat
          </Link>
        </div>

        <div className="mt-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </span>
          <p className="mt-5 text-xs uppercase tracking-[0.28em] text-flag">Puttning</p>
          <h1 className="mt-2 text-5xl leading-none">50-bollsövningen</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Putt 10 bollar från varje avstånd: 1, 2, 3, 4 och 5 meter. Varje boll spelas tills den
            är hålad. Räkna alla slag. Lägre resultat är bättre.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Referenspar</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-4xl">{FIFTY_PUTT_PAR}</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Bästa resultat</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-4xl">{best ?? "–"}</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <div className="flex justify-between"><span>1 meter</span><strong className="text-foreground">Par 11</strong></div>
          <div className="mt-2 flex justify-between"><span>2 meter</span><strong className="text-foreground">Par 13</strong></div>
          <div className="mt-2 flex justify-between"><span>3 meter</span><strong className="text-foreground">Par 15</strong></div>
          <div className="mt-2 flex justify-between"><span>4 meter</span><strong className="text-foreground">Par 16</strong></div>
          <div className="mt-2 flex justify-between"><span>5 meter</span><strong className="text-foreground">Par 17</strong></div>
        </div>

        <button
          onClick={() => setPhase("test")}
          className="mt-6 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta övningen
        </button>
      </main>
    );
  }

  const pct = Math.round(((index + 1) / FIFTY_PUTT_TOTAL) * 100);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (index > 0 ? setIndex((value) => value - 1) : setPhase("intro"))}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border"
          aria-label="Tillbaka"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm text-muted-foreground">Boll {index + 1} av {FIFTY_PUTT_TOTAL}</p>
        <span className="w-10" />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <section className="mt-8 rounded-[2rem] border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Runda {current.round} av 10</p>
        <p className="mt-4 font-[family-name:var(--font-display)] text-8xl leading-none text-flag">
          {current.distance}<span className="ml-2 text-2xl text-muted-foreground">m</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Spela bollen tills den är hålad.</p>
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-card p-5 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Antal slag</p>
        <div className="mt-4 flex items-center justify-center gap-8">
          <button
            onClick={() => changeStrokes(-1)}
            disabled={current.strokes <= 1}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border disabled:opacity-30"
            aria-label="Minska antal slag"
          >
            <Minus className="h-6 w-6" />
          </button>
          <span className="min-w-16 font-[family-name:var(--font-display)] text-7xl leading-none">{current.strokes}</span>
          <button
            onClick={() => changeStrokes(1)}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border"
            aria-label="Öka antal slag"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </section>

      <div className="mt-4 flex justify-between text-sm text-muted-foreground">
        <span>Löpande score</span>
        <strong className="text-foreground">{runningTotal} slag</strong>
      </div>

      <button
        onClick={next}
        className="mt-6 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        {index + 1 === FIFTY_PUTT_TOTAL ? "Spara resultat" : "Nästa boll"}
      </button>
    </main>
  );
}
