import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, X } from "lucide-react";
import { useState } from "react";
import {
  saveShortPuttSession,
  type ShortPutt,
  type ShortPuttSession,
} from "@/lib/shortputt";
import {
  saveLagPuttSession,
  type LagPutt,
  type LagPuttSession,
} from "@/lib/lagputt";
import { combinedPuttingHandicap } from "@/lib/putting";
import type { IntervalKey } from "@/lib/shortgame";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { PuttingProcessing } from "@/components/putting-processing";
import { PuttingHcpReveal } from "@/components/putting-hcp-reveal";
import { PuttingReport } from "@/components/putting-report";
import { PuttingHero, PuttingPositionDiagram } from "@/components/shortputt-visuals";
import { LagPuttHero } from "@/components/lagputt-visuals";

export const Route = createFileRoute("/putting")({
  head: () => ({
    meta: [
      { title: "Putting Test – 10 snabba positioner | SG4" },
      {
        name: "description",
        content:
          "Putting HCP-test med 6 korta puttar från 1–3 meter och 4 lagputtar från 8–18 meter. Ett snabbt test som ger ett samlat Putting HCP.",
      },
    ],
  }),
  component: PuttingPage,
});

type Phase = "setup" | "short" | "lag" | "processing" | "reveal" | "result";
type LagStrokeCount = 1 | 2 | 3 | 4;

const LAG_DISTANCES = [8, 12, 16, 18] as const;
const LAG_STROKE_INTERVAL: Record<LagStrokeCount, IntervalKey> = {
  1: "holed",
  2: "50cm-1m",
  3: "2-3m",
  4: "4-6m",
};

function createShortPutts(): ShortPutt[] {
  return [
    { direction: "12", distance: 1, round: 1, holed: false, index: 1 },
    { direction: "12", distance: 2, round: 1, holed: false, index: 2 },
    { direction: "12", distance: 3, round: 1, holed: false, index: 3 },
    { direction: "6", distance: 1, round: 1, holed: false, index: 4 },
    { direction: "6", distance: 2, round: 1, holed: false, index: 5 },
    { direction: "6", distance: 3, round: 1, holed: false, index: 6 },
  ];
}

function createLagPutts(): LagPutt[] {
  return LAG_DISTANCES.map((distance) => ({ distance }));
}

function PuttingPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [shortPutts, setShortPutts] = useState<ShortPutt[]>(createShortPutts);
  const [lagPutts, setLagPutts] = useState<LagPutt[]>(createLagPutts);
  const [shortIndex, setShortIndex] = useState(0);
  const [lagIndex, setLagIndex] = useState(0);
  const [flash, setFlash] = useState<"made" | "missed" | null>(null);
  const [combinedHcp, setCombinedHcp] = useState(36);
  const [savedShort, setSavedShort] = useState<ShortPuttSession | null>(null);
  const [savedLag, setSavedLag] = useState<LagPuttSession | null>(null);

  useHideBottomNav(phase !== "setup");

  const totalPositions = shortPutts.length + lagPutts.length;

  function start() {
    setShortPutts(createShortPutts());
    setLagPutts(createLagPutts());
    setShortIndex(0);
    setLagIndex(0);
    setFlash(null);
    setSavedShort(null);
    setSavedLag(null);
    setPhase("short");
  }

  function commitShort(holed: boolean) {
    if (flash) return;
    setFlash(holed ? "made" : "missed");
    const updated = shortPutts.map((p, i) => (i === shortIndex ? { ...p, holed } : p));
    setShortPutts(updated);

    window.setTimeout(() => {
      setFlash(null);
      const next = shortIndex + 1;
      if (next >= updated.length) setPhase("lag");
      else setShortIndex(next);
    }, 320);
  }

  function commitLag(strokes: LagStrokeCount) {
    const updated = lagPutts.map((p, i) =>
      i === lagIndex ? { ...p, interval: LAG_STROKE_INTERVAL[strokes] } : p,
    );
    setLagPutts(updated);

    const next = lagIndex + 1;
    if (next >= updated.length) finalize(shortPutts, updated);
    else setLagIndex(next);
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
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">HCP-test</p>
            <h1 className="text-4xl leading-none">Putting Test</h1>
          </div>
          <Link
            to="/kategori/$slug"
            params={{ slug: "puttning" }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            Avbryt
          </Link>
        </header>

        <div className="mt-6 overflow-hidden rounded-2xl bg-primary/5">
          <PuttingHero className="h-40 w-full" />
        </div>

        <h2 className="mt-5 text-center font-[family-name:var(--font-display)] text-4xl leading-none">
          10 positioner
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          6 korta puttar från 1–3 m och 4 lagputtar från 8–18 m. Ett test, ett Putting HCP.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-3xl text-primary">6</p>
            <p className="mt-1 text-xs text-muted-foreground">Korta · 1–3 m</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-[family-name:var(--font-display)] text-3xl text-primary">4</p>
            <p className="mt-1 text-xs text-muted-foreground">Lag · 8–18 m</p>
          </div>
        </div>

        <button
          onClick={start}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta test
          <ArrowRight className="h-5 w-5" />
        </button>
      </main>
    );
  }

  if (phase === "short") {
    const current = shortPutts[shortIndex];
    const overallIndex = shortIndex;
    const pct = Math.round((overallIndex / totalPositions) * 100);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-4">
        <div className="flex justify-end">
          <button
            onClick={() => navigate({ to: "/kategori/$slug", params: { slug: "puttning" } })}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <Progress index={overallIndex} total={totalPositions} pct={pct} label="Kort putt" />

        <div className="mt-4 rounded-3xl border border-border bg-card p-3">
          <PuttingPositionDiagram activeDirection={current.direction} activeDistance={current.distance} />
        </div>

        <div
          className={`mt-4 rounded-3xl border-2 p-6 text-center transition-colors ${
            flash === "made"
              ? "border-primary bg-primary/15"
              : flash === "missed"
                ? "border-destructive bg-destructive/10"
                : "border-border bg-card"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Första putten</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.distance}<span className="ml-2 text-2xl text-muted-foreground">m</span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {shortIndex < 3 ? "Första linjen" : "Byt sida om hålet"}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => commitShort(true)}
            disabled={!!flash}
            className="rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground disabled:opacity-60"
          >
            Satt
          </button>
          <button
            onClick={() => commitShort(false)}
            disabled={!!flash}
            className="rounded-2xl border-2 border-border py-5 font-[family-name:var(--font-display)] text-2xl disabled:opacity-60"
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
    const pct = Math.round((overallIndex / totalPositions) * 100);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-4">
        <div className="flex justify-end">
          <button
            onClick={() => navigate({ to: "/kategori/$slug", params: { slug: "puttning" } })}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <Progress index={overallIndex} total={totalPositions} pct={pct} label="Lag putt" />

        <div className="mt-4 overflow-hidden rounded-3xl bg-primary/5">
          <LagPuttHero className="h-28 w-full" />
        </div>

        <div className="mt-4 rounded-3xl border-2 border-border bg-card p-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Lagputt</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
            {current.distance}<span className="ml-2 text-lg text-muted-foreground">m</span>
          </p>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card/60 p-3 text-sm text-muted-foreground">
          <Compass className="mt-0.5 h-4 w-4 shrink-0 text-flag" />
          Putt tills bollen är i hål. Byt gärna linje mellan avstånden.
        </p>

        <div className="mt-5">
          <p className="text-center text-sm font-semibold">Hur många puttar behövde du?</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as LagStrokeCount[]).map((strokes) => (
              <button
                key={strokes}
                type="button"
                onClick={() => commitLag(strokes)}
                className="rounded-2xl border-2 border-border bg-card py-5 font-[family-name:var(--font-display)] text-3xl transition-transform active:scale-95 active:border-primary"
              >
                {strokes === 4 ? "4+" : strokes}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (phase === "processing") {
    return (
      <PuttingProcessing
        totalPutts={totalPositions}
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

      <button
        onClick={start}
        className="mt-6 w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Nytt test
      </button>

      <div className="mt-3 flex gap-3">
        <Link
          to="/"
          className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground"
        >
          Startsida
        </Link>
        <Link
          to="/utveckling"
          className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground"
        >
          Utveckling
        </Link>
      </div>
    </main>
  );
}

function Progress({
  index,
  total,
  pct,
  label,
}: {
  index: number;
  total: number;
  pct: number;
  label: string;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">
          {label} · {index + 1} <span className="text-muted-foreground">av {total}</span>
        </span>
        <span className="text-muted-foreground">{pct} %</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
