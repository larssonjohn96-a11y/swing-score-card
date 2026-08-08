import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BUNKER_INTERVALS,
  BUNKER_TOTAL_SHOTS,
  computeBunkerResult,
  emptyBunkerShots,
  loadBunkerSessions,
  saveBunkerSession,
  type BunkerIntervalKey,
  type BunkerShot,
} from "@/lib/bunker";
import { BunkerReport } from "@/components/bunker-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/bunker")({
  head: () => ({
    meta: [
      { title: "Bunkerslag – 6 slag | SG4" },
      {
        name: "description",
        content:
          "Bunkerslag: 6 slag från de sex vanligaste bunkerlägena. Registrera hur nära hålet bollen stannar och få ditt Bunker HCP.",
      },
    ],
  }),
  component: BunkerPage,
});

type Phase = "test" | "result";

function BunkerPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("test");
  const [shots, setShots] = useState<BunkerShot[]>(emptyBunkerShots);
  const [index, setIndex] = useState(0);
  const [interval, setInterval] = useState<BunkerIntervalKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const savedRef = useRef(false);

  const current = shots[Math.min(index, BUNKER_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase === "test" || phase === "result");

  function start() {
    const sessions = loadBunkerSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? last.score : null);
    setShots(emptyBunkerShots());
    setIndex(0);
    setInterval(null);
    setSaved(false);
    savedRef.current = false;
    setPhase("test");
  }

  useEffect(() => {
    start();
  }, []);

  function commit() {
    if (!interval) return;
    setShots((p) => p.map((s, i) => (i === index ? { ...s, interval } : s)));

    const next = index + 1;
    if (next >= BUNKER_TOTAL_SHOTS) {
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

  // Testet sparas automatiskt så fort resultatet visas, som Närspelstest.
  useEffect(() => {
    if (phase === "result" && !savedRef.current) {
      savedRef.current = true;
      saveBunkerSession(shots);
      setSaved(true);
    }
  }, [phase, shots]);

  if (phase === "test") {
    const pct = Math.round((index / BUNKER_TOTAL_SHOTS) * 100);
    const selectedInterval = BUNKER_INTERVALS.find((iv) => iv.key === interval);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-52 pt-4">
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
              <span className="text-muted-foreground">av {BUNKER_TOTAL_SHOTS}</span>
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

        <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Bunkerslag</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
            {current.index}
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Hur nära hålet stannade bollen?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BUNKER_INTERVALS.map((iv) => (
              <button
                key={iv.key}
                type="button"
                onClick={() => setInterval(iv.key)}
                aria-pressed={interval === iv.key}
                className={`rounded-xl border-2 py-3.5 text-sm font-semibold leading-tight transition-colors ${
                  interval === iv.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : iv.key === "not-out"
                      ? "border-destructive/50 bg-transparent text-destructive active:bg-destructive/10"
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
              selectedInterval.key === "not-out" ? (
                "Registrerat: kom inte upp ur bunkern."
              ) : (
                <>
                  Slaget stannade{" "}
                  <span className="font-semibold text-foreground">
                    {selectedInterval.label.toLowerCase()}
                  </span>{" "}
                  från hålet.
                </>
              )
            ) : (
              "Välj hur nära hålet bollen stannade."
            )}
          </p>
          <button
            onClick={commit}
            disabled={!interval}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground disabled:opacity-40"
          >
            {index + 1 === BUNKER_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  const result = computeBunkerResult(shots);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är klart
      </p>

      <BunkerReport shots={shots} result={result} prevScore={prevScore} />

      <div className="mt-6 flex gap-3">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary/10 py-4 text-base font-semibold text-primary">
          <Check className="h-5 w-5" /> {saved ? "Testet sparat" : "Sparar…"}
        </div>
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

      <div className="mt-3 flex gap-3">
        <Link
          to="/"
          className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Startsida
        </Link>
        <Link
          to="/utveckling"
          className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Utveckling
        </Link>
      </div>
    </main>
  );
}
