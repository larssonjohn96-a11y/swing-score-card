import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Minus, Plus, Radar, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  OFFTEE_TOTAL_SHOTS,
  emptyTeeShots,
  handicapLabel,
  offTeeResult,
  type TeeShot,
} from "@/lib/offtee";
import { loadOffTeeSessions, saveOffTeeSession } from "@/lib/offtee-store";
import { loadCardProfile } from "@/lib/rating-card";
import { TeeNumberField } from "@/components/offtee-visuals";
import { OffTeeReport } from "@/components/offtee-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import type { RevealState } from "@/components/test-reveal";
import { OffTeeProcessing, OffTeeReveal } from "@/components/offtee-reveal";
import { computeRevealState } from "@/lib/test-reveal-helpers";

export const Route = createFileRoute("/offtee")({
  head: () => ({
    meta: [
      { title: "Off the Tee Test – golfträning" },
      {
        name: "description",
        content:
          "6 drives mot samma fairway – Driving Handicap baserat på längd, precision och jämnhet.",
      },
    ],
  }),
  component: OffTeePage,
});

type Phase = "setup" | "test" | "processing" | "reveal" | "result";

type RevealData = {
  state: RevealState;
  hcp: number;
  hcpLabel: string;
  previousHcpLabel?: string;
  deltaLabel?: string;
  isRetest: boolean;
};

/** Förval för första slaget: typiskt snitt-totalt avstånd. */
const DEFAULT_TOTAL = 220;

function OffTeePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [shots, setShots] = useState<TeeShot[]>(emptyTeeShots);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(DEFAULT_TOTAL);
  const [sidled, setSidled] = useState(0);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  const current = shots[Math.min(index, OFFTEE_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase !== "setup");

  function start() {
    setShots(emptyTeeShots());
    setIndex(0);
    setTotal(DEFAULT_TOTAL);
    setSidled(0);
    setReveal(null);
    setPhase("test");
  }

  function commit() {
    const next = index + 1;
    const updatedShots = shots.map((s, i) =>
      i === index ? { ...s, total, sidled, filled: true } : s,
    );
    setShots(updatedShots);

    if (next >= OFFTEE_TOTAL_SHOTS) {
      const previousSessions = loadOffTeeSessions();
      const previousHcps = previousSessions.map((s) => s.handicap);
      const saved = saveOffTeeSession(updatedShots);
      const derived = computeRevealState(previousHcps, saved.handicap);
      setReveal({
        state: derived.state,
        hcp: saved.handicap,
        hcpLabel: handicapLabel(saved.handicap),
        previousHcpLabel:
          derived.previousHcp !== undefined ? handicapLabel(derived.previousHcp) : undefined,
        deltaLabel: derived.deltaLabel,
        isRetest: previousSessions.length > 0,
      });
      setPhase("processing");
    } else {
      setIndex(next);
      const nextShot = shots[next];
      if (nextShot.filled) {
        setTotal(nextShot.total);
        setSidled(nextShot.sidled);
      } else {
        setSidled(0);
      }
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    const s = shots[i];
    setTotal(s.filled ? s.total : total);
    setSidled(s.filled ? s.sidled : 0);
  }

  if (phase === "setup") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Innan du börjar
            </p>
            <h1 className="text-4xl leading-none">Off the Tee Test</h1>
          </div>
          <Link
            to="/kategori/$slug"
            params={{ slug: "driving" }}
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
        <h2 className="mt-4 text-center text-2xl leading-tight">6 drives</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
          Slå 6 drives och registrera totalt avstånd och sidled efter varje slag, så räknar vi ut
          ditt Driving HCP direkt.
        </p>

        <button
          onClick={start}
          className="mt-6 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta Off the Tee Test
        </button>
      </main>
    );
  }

  if (phase === "test")
    return (
      <TestScreen
        current={current}
        index={index}
        total={total}
        sidled={sidled}
        setTotal={setTotal}
        setSidled={setSidled}
        onCommit={commit}
        onBack={back}
        onAbort={() => navigate({ to: "/kategori/$slug", params: { slug: "driving" } })}
      />
    );
  if (phase === "processing" && reveal) {
    return <OffTeeProcessing onDone={() => setPhase("reveal")} />;
  }

  if (phase === "reveal" && reveal) {
    return <OffTeeReveal hcp={reveal.hcp} onContinue={() => setPhase("result")} />;
  }

  return <ResultScreen shots={shots} onRestart={start} />;
}

/* ----------------------------------------------------------------- test */

function TestScreen({
  current,
  index,
  total,
  sidled,
  setTotal,
  setSidled,
  onCommit,
  onBack,
  onAbort,
}: {
  current: TeeShot;
  index: number;
  total: number;
  sidled: number;
  setTotal: (n: number) => void;
  setSidled: (n: number) => void;
  onCommit: () => void;
  onBack: () => void;
  onAbort: () => void;
}) {
  const pct = Math.round((index / OFFTEE_TOTAL_SHOTS) * 100);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-44 pt-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={index === 0}
          aria-label="Föregående slag"
          className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onAbort}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Avbryt test
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            Slag {index + 1} <span className="text-muted-foreground">av {OFFTEE_TOTAL_SHOTS}</span>
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

      <div className="mt-4 space-y-2">
        <TeeNumberField label="Totalt" value={total} onChange={setTotal} unit="m" />

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Sidled – hur mycket ifrån mitten
          </p>
          <SidledValue value={sidled} onChange={setSidled} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="mb-3 text-center text-sm leading-snug text-muted-foreground">
          Slaget gick <span className="font-semibold text-foreground">{total} m totalt</span>
          {sidled === 0 ? (
            " rakt på linjen"
          ) : (
            <>
              {" "}
              och <span className="font-semibold text-foreground">{sidled} m från mitten</span>
            </>
          )}
          .
        </p>
        <button
          onClick={onCommit}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          {index + 1 === OFFTEE_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </main>
  );
}

function SidledValue({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.max(0, Math.round(n)));
  const atMin = value <= 0;

  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 260);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={atMin}
          aria-label="Minska sidled"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span
            className={`font-[family-name:var(--font-display)] text-4xl leading-none transition-[color,transform] duration-200 ${
              flash ? "scale-110 text-flag" : "scale-100 text-foreground"
            }`}
          >
            {value}
          </span>
          <span className="text-sm text-muted-foreground">m</span>
        </div>
        <button
          type="button"
          onClick={() => set(value + 1)}
          aria-label="Öka sidled"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[1, 5, 10].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => set(value + d)}
            className="rounded-lg border border-border py-1.5 text-xs font-semibold text-muted-foreground active:bg-muted"
          >
            +{d}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- result */

function ResultScreen({ shots, onRestart }: { shots: TeeShot[]; onRestart: () => void }) {
  const result = offTeeResult(shots);
  const [age, setAge] = useState<number | undefined>(() => loadCardProfile().age);
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <OffTeeReport result={result} age={age} onAgeSaved={setAge} />

      <div className="mt-10">
        <button
          onClick={onRestart}
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
