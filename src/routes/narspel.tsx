import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  INTERVALS,
  SHORTGAME_TOTAL_SHOTS,
  computeShortGameResult,
  emptyShortGameShots,
  loadShortGameSessions,
  saveShortGameSession,
  type IntervalKey,
  type ShortGameShot,
} from "@/lib/shortgame";
import { ShortGamePositionDiagram } from "@/components/shortgame-visuals";
import { ShortGameReport } from "@/components/shortgame-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/narspel")({
  head: () => ({
    meta: [
      { title: "Närspelstest – 6 slag 8–20 m | SG4" },
      {
        name: "description",
        content:
          "Närspelstest: 6 slag från 8 till 20 meter med fri teknik. Registrera hur nära hålet bollen stannar och få ditt Närspel HCP.",
      },
    ],
  }),
  component: ShortGamePage,
});

type Phase = "test" | "result";

function ShortGamePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("test");
  const [shots, setShots] = useState<ShortGameShot[]>(emptyShortGameShots);
  const [index, setIndex] = useState(0);
  const [interval, setInterval] = useState<IntervalKey | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  const current = shots[Math.min(index, SHORTGAME_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase === "test");

  function start() {
    const sessions = loadShortGameSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? last.score : null);
    setShots(emptyShortGameShots());
    setIndex(0);
    setInterval(null);
    setSaved(false);
    setPhase("test");
  }

  useEffect(() => {
    start();
  }, []);

  function commit() {
    if (!interval) return;
    setShots((p) => p.map((s, i) => (i === index ? { ...s, interval } : s)));

    const next = index + 1;
    if (next >= SHORTGAME_TOTAL_SHOTS) {
      setPhase("result");
    } else {
      setIndex(next);
      const nextShot = shots[next];
      setInterval(nextShot.interval ?? null);
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    const s = shots[i];
    setInterval(s.interval ?? null);
  }

  if (phase === "test") {
    const pct = Math.round((index / SHORTGAME_TOTAL_SHOTS) * 100);
    const selectedInterval = INTERVALS.find((iv) => iv.key === interval);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-48 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={index === 0}
            aria-label="Föregående slag"
            className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              navigate({ to: "/kategori/$slug", params: { slug: "around-the-green" } })
            }
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              Slag {index + 1}{" "}
              <span className="text-muted-foreground">av {SHORTGAME_TOTAL_SHOTS}</span>
            </span>
            <span className="text-muted-foreground">{pct} %</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3">
          <ShortGamePositionDiagram distance={current.distanceTarget} />
        </div>

        <div className="mt-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Avstånd</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
            {current.distanceTarget}
            <span className="ml-2 text-lg text-muted-foreground">m</span>
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Hur nära hålet stannade bollen?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {INTERVALS.map((iv) => (
              <button
                key={iv.key}
                type="button"
                onClick={() => setInterval(iv.key)}
                aria-pressed={interval === iv.key}
                className={`rounded-xl border-2 py-3.5 text-sm font-semibold leading-tight transition-colors ${
                  interval === iv.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-foreground active:bg-muted"
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <p className="mb-3 text-center text-sm leading-snug text-muted-foreground">
            {selectedInterval ? (
              <>
                Slaget stannade{" "}
                <span className="font-semibold text-foreground">
                  {selectedInterval.label.toLowerCase()}
                </span>{" "}
                från hålet.
              </>
            ) : (
              "Välj hur nära hålet bollen stannade."
            )}
          </p>
          <button
            onClick={commit}
            disabled={!interval}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground disabled:opacity-40"
          >
            {index + 1 === SHORTGAME_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const result = computeShortGameResult(shots);

  function save() {
    saveShortGameSession(shots, notes);
    setNotes("");
    setSaved(true);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är klart
      </p>

      <ShortGameReport shots={shots} result={result} prevScore={prevScore} />

      <label htmlFor="notes" className="mt-5 block text-sm text-muted-foreground">
        Anteckning (valfritt)
      </label>
      <input
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Green, känsla…"
        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary"
      />

      <div className="mt-6 flex gap-3">
        {saved ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 py-4 text-base font-semibold text-primary">
            <Check className="h-5 w-5" /> Testet sparat
          </div>
        ) : (
          <button
            onClick={save}
            className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            Spara
          </button>
        )}
        <button
          onClick={start}
          className="flex-1 rounded-2xl border border-border py-4 font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
        >
          Nytt test
        </button>
      </div>

      <Link
        to="/kategori/$slug"
        params={{ slug: "around-the-green" }}
        className="mt-4 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Tillbaka till Around the Green
      </Link>
    </main>
  );
}
