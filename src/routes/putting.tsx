import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, Radar, X } from "lucide-react";
import { useState } from "react";
import {
  DIRECTIONS,
  emptyShortPutts,
  emptyShortPuttsMain,
  saveShortPuttSession,
  type ShortPutt,
  type ShortPuttSession,
} from "@/lib/shortputt";
import {
  emptyLagPutts,
  emptyLagPuttsMain,
  saveLagPuttSession,
  type LagPutt,
  type LagPuttSession,
} from "@/lib/lagputt";
import { combinedPuttingHandicap, type PuttingMode } from "@/lib/putting";
import { INTERVALS, type IntervalKey } from "@/lib/shortgame";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { PuttingProcessing } from "@/components/putting-processing";
import { PuttingHcpReveal } from "@/components/putting-hcp-reveal";
import { PuttingReport } from "@/components/putting-report";

export const Route = createFileRoute("/putting")({
  head: () => ({
    meta: [
      { title: "Putting Test – korta puttar och lagputtar | SG4" },
      {
        name: "description",
        content:
          "Putting Test: korta puttar (1-3 m) och lagputtar (8-18 m) i ett flöde. Få ditt Putting HCP, uppdelat på Short Putt och Lag Putt.",
      },
    ],
  }),
  component: PuttingPage,
});

type Phase = "setup" | "short" | "lag" | "processing" | "reveal" | "result";

function PuttingPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<PuttingMode>("main");
  const [showExtended, setShowExtended] = useState(false);

  const [shortPutts, setShortPutts] = useState<ShortPutt[]>(emptyShortPuttsMain);
  const [lagPutts, setLagPutts] = useState<LagPutt[]>(emptyLagPuttsMain);
  const [shortIndex, setShortIndex] = useState(0);
  const [lagIndex, setLagIndex] = useState(0);
  const [flash, setFlash] = useState<"made" | "missed" | null>(null);
  const [interval, setInterval] = useState<IntervalKey | null>(null);

  const [combinedHcp, setCombinedHcp] = useState(36);
  const [savedShort, setSavedShort] = useState<ShortPuttSession | null>(null);
  const [savedLag, setSavedLag] = useState<LagPuttSession | null>(null);

  useHideBottomNav(phase !== "setup");

  const totalPutts = shortPutts.length + lagPutts.length;

  function start(selectedMode: PuttingMode) {
    const short = selectedMode === "extended" ? emptyShortPutts() : emptyShortPuttsMain();
    const lag = selectedMode === "extended" ? emptyLagPutts() : emptyLagPuttsMain();
    setMode(selectedMode);
    setShortPutts(short);
    setLagPutts(lag);
    setShortIndex(0);
    setLagIndex(0);
    setFlash(null);
    setInterval(null);
    setSavedShort(null);
    setSavedLag(null);
    setPhase("short");
  }

  function commitShort(holed: boolean) {
    setFlash(holed ? "made" : "missed");
    const updated = shortPutts.map((p, i) => (i === shortIndex ? { ...p, holed } : p));
    setShortPutts(updated);
    window.setTimeout(() => {
      setFlash(null);
      const next = shortIndex + 1;
      if (next >= updated.length) {
        setPhase("lag");
      } else {
        setShortIndex(next);
      }
    }, 420);
  }

  function commitLag() {
    if (!interval) return;
    const chosen = interval;
    const updated = lagPutts.map((p, i) => (i === lagIndex ? { ...p, interval: chosen } : p));
    setLagPutts(updated);
    setInterval(null);
    const next = lagIndex + 1;
    if (next >= updated.length) {
      finalize(shortPutts, updated);
    } else {
      setLagIndex(next);
    }
  }

  function finalize(finalShort: ShortPutt[], finalLag: LagPutt[]) {
    const savedShortSession = saveShortPuttSession(finalShort, "flat");
    const savedLagSession = saveLagPuttSession(finalLag);
    const combined = combinedPuttingHandicap(savedShortSession.handicap, savedLagSession.handicap);

    setSavedShort(savedShortSession);
    setSavedLag(savedLagSession);
    setCombinedHcp(combined);
    setPhase("processing");
  }

  if (phase === "setup") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Innan du börjar
            </p>
            <h1 className="text-4xl leading-none">Putting Test</h1>
          </div>
          <Link
            to="/kategori/$slug"
            params={{ slug: "puttning" }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Avbryt
          </Link>
        </header>

        <div className="mt-8 flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Radar className="h-8 w-8 text-primary" />
          </span>
        </div>
        <h2 className="mt-4 text-center text-2xl leading-tight">6 puttar</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          3 korta puttar (1-3 m) och 3 lagputtar (8-18 m). Vi räknar ut ditt Putting HCP direkt,
          uppdelat på båda delarna.
        </p>

        <button
          onClick={() => start("main")}
          className="mt-6 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta Putting Test
        </button>

        {!showExtended ? (
          <button
            type="button"
            onClick={() => setShowExtended(true)}
            className="mx-auto mt-4 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Erfaren spelare? Utökat test med 18 puttar →
          </button>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Utökat test · för experter
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              12 korta puttar (4 riktningar x 1-3 m) och 6 lagputtar (8-18 m) - ett djupare underlag
              om du redan gör huvudtestet regelbundet.
            </p>
            <button
              onClick={() => start("extended")}
              className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary"
            >
              Starta utökat test (18 puttar)
            </button>
          </div>
        )}
      </main>
    );
  }

  if (phase === "short") {
    const current = shortPutts[shortIndex];
    const overallIndex = shortIndex;
    const pct = Math.round((overallIndex / totalPutts) * 100);
    const label = DIRECTIONS.find((d) => d.key === current.direction)?.label;

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/kategori/$slug", params: { slug: "puttning" } })}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              Putt {overallIndex + 1} <span className="text-muted-foreground">av {totalPutts}</span>
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

        <div
          className={`mt-5 rounded-3xl border-2 p-6 text-center shadow-[var(--shadow-glow)] transition-colors duration-200 ${
            flash === "made"
              ? "border-primary bg-primary/15"
              : flash === "missed"
                ? "border-destructive bg-destructive/15"
                : "border-border bg-card"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {mode === "extended" ? label : "Kort putt"}
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.distance}
            <span className="ml-2 text-2xl text-muted-foreground">m</span>
          </p>
          {flash && (
            <p
              className={`mt-3 text-lg font-bold uppercase tracking-wide ${
                flash === "made" ? "text-primary" : "text-destructive"
              }`}
            >
              {flash === "made" ? "Satt!" : "Missad"}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => commitShort(true)}
            disabled={!!flash}
            className="flex-1 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            Satt
          </button>
          <button
            onClick={() => commitShort(false)}
            disabled={!!flash}
            className="flex-1 rounded-2xl border-2 border-destructive/60 py-5 font-[family-name:var(--font-display)] text-2xl text-destructive transition-transform active:scale-95 disabled:opacity-60"
          >
            Missad
          </button>
        </div>
      </main>
    );
  }

  if (phase === "lag") {
    const current = lagPutts[lagIndex];
    const overallIndex = shortPutts.length + lagIndex;
    const pct = Math.round((overallIndex / totalPutts) * 100);
    const selected = INTERVALS.find((iv) => iv.key === interval);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-32 pt-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/kategori/$slug", params: { slug: "puttning" } })}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              Putt {overallIndex + 1} <span className="text-muted-foreground">av {totalPutts}</span>
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

        <div className="mt-5 rounded-3xl border-2 border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Lagputt · avstånd
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.distance}
            <span className="ml-2 text-lg text-muted-foreground">m</span>
          </p>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
          Gå i en annan riktning från hålet den här gången, så du inte puttar samma linje två gånger
          i rad.
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Hur nära hålet stannade putten?
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
            {selected ? (
              <>
                Putten stannade{" "}
                <span className="font-semibold text-foreground">
                  {selected.label.toLowerCase()}
                </span>{" "}
                från hålet.
              </>
            ) : (
              "Välj hur nära hålet putten stannade."
            )}
          </p>
          <button
            onClick={commitLag}
            disabled={!interval}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground disabled:opacity-40"
          >
            {overallIndex + 1 === totalPutts ? "Avsluta test" : "Nästa putt"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  if (phase === "processing") {
    return (
      <PuttingProcessing
        totalPutts={totalPutts}
        resultReady
        onSeeResult={() => setPhase("reveal")}
      />
    );
  }

  if (phase === "reveal") {
    return <PuttingHcpReveal hcp={combinedHcp} onContinue={() => setPhase("result")} />;
  }

  if (!savedShort || !savedLag) return null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <PuttingReport combinedHcp={combinedHcp} shortSession={savedShort} lagSession={savedLag} />

      <div className="mt-6">
        <button
          onClick={() => setPhase("setup")}
          className="w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Nytt test
        </button>
      </div>

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
