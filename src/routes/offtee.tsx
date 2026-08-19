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
type ShotDirection = "left" | "right";
type DirectedTeeShot = TeeShot & { direction?: ShotDirection };
type FlightShot = { total: number; sidled: number; direction: ShotDirection };

type RevealData = {
  state: RevealState;
  hcp: number;
  hcpLabel: string;
  previousHcpLabel?: string;
  deltaLabel?: string;
  isRetest: boolean;
};

const DEFAULT_TOTAL = 220;
const FLIGHT_DURATION_MS = 1250;

function OffTeePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [shots, setShots] = useState<DirectedTeeShot[]>(emptyTeeShots);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(DEFAULT_TOTAL);
  const [sidled, setSidled] = useState(0);
  const [direction, setDirection] = useState<ShotDirection>("right");
  const [flight, setFlight] = useState<FlightShot | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  const current = shots[Math.min(index, OFFTEE_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase !== "setup");

  function start() {
    setShots(emptyTeeShots());
    setIndex(0);
    setTotal(DEFAULT_TOTAL);
    setSidled(0);
    setDirection("right");
    setFlight(null);
    setReveal(null);
    setPhase("test");
  }

  function finishCommit(updatedShots: DirectedTeeShot[], next: number) {
    setFlight(null);

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
      return;
    }

    setIndex(next);
    const nextShot = updatedShots[next];
    if (nextShot.filled) {
      setTotal(nextShot.total);
      setSidled(nextShot.sidled);
      setDirection(nextShot.direction ?? "right");
    } else {
      setSidled(0);
      setDirection("right");
    }
  }

  function commit() {
    if (flight) return;

    const next = index + 1;
    const updatedShots: DirectedTeeShot[] = shots.map((s, i) =>
      i === index ? { ...s, total, sidled, direction, filled: true } : s,
    );
    setShots(updatedShots);
    setFlight({ total, sidled, direction });

    window.setTimeout(() => finishCommit(updatedShots, next), FLIGHT_DURATION_MS + 150);
  }

  function back() {
    if (index === 0 || flight) return;
    const i = index - 1;
    setIndex(i);
    const s = shots[i];
    setTotal(s.filled ? s.total : total);
    setSidled(s.filled ? s.sidled : 0);
    setDirection(s.direction ?? "right");
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

  if (phase === "test") {
    return (
      <TestScreen
        current={current}
        index={index}
        total={total}
        sidled={sidled}
        direction={direction}
        flight={flight}
        setTotal={setTotal}
        setSidled={setSidled}
        setDirection={setDirection}
        onCommit={commit}
        onBack={back}
        onAbort={() => navigate({ to: "/kategori/$slug", params: { slug: "driving" } })}
      />
    );
  }

  if (phase === "processing" && reveal) {
    return <OffTeeProcessing onDone={() => setPhase("reveal")} />;
  }

  if (phase === "reveal" && reveal) {
    return <OffTeeReveal hcp={reveal.hcp} onContinue={() => setPhase("result")} />;
  }

  return <ResultScreen shots={shots} onRestart={start} />;
}

function TestScreen({
  current,
  index,
  total,
  sidled,
  direction,
  flight,
  setTotal,
  setSidled,
  setDirection,
  onCommit,
  onBack,
  onAbort,
}: {
  current: TeeShot;
  index: number;
  total: number;
  sidled: number;
  direction: ShotDirection;
  flight: FlightShot | null;
  setTotal: (n: number) => void;
  setSidled: (n: number) => void;
  setDirection: (direction: ShotDirection) => void;
  onCommit: () => void;
  onBack: () => void;
  onAbort: () => void;
}) {
  const pct = Math.round((index / OFFTEE_TOTAL_SHOTS) * 100);
  void current;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-44 pt-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={index === 0 || Boolean(flight)}
          aria-label="Föregående slag"
          className="rounded-full border border-border p-2 text-muted-foreground disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onAbort}
          disabled={Boolean(flight)}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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

      <PersistentFairwayVisual flight={flight} />

      <div className="mt-3 space-y-2">
        <TeeNumberField label="Totalt" value={total} onChange={setTotal} unit="m" />

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Sidled – hur mycket från mitten
          </p>
          <SidledValue
            value={sidled}
            direction={direction}
            onChange={setSidled}
            onDirectionChange={setDirection}
          />
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
              och{" "}
              <span className="font-semibold text-foreground">
                {sidled} m {direction === "left" ? "vänster" : "höger"}
              </span>
            </>
          )}
          .
        </p>
        <button
          onClick={onCommit}
          disabled={Boolean(flight)}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground disabled:opacity-60"
        >
          {flight
            ? "Bollen flyger…"
            : index + 1 === OFFTEE_TOTAL_SHOTS
              ? "Avsluta test"
              : "Nästa slag"}
          {!flight ? <ArrowRight className="h-5 w-5" /> : null}
        </button>
      </div>
    </main>
  );
}

function PersistentFairwayVisual({ flight }: { flight: FlightShot | null }) {
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    setLanded(false);
    if (!flight) return;
    const frame = window.requestAnimationFrame(() => setLanded(true));
    return () => window.cancelAnimationFrame(frame);
  }, [flight]);

  const lateralSign = flight?.direction === "left" ? -1 : 1;
  const lateralPx = flight
    ? Math.max(-105, Math.min(105, lateralSign * (flight.sidled / 40) * 105))
    : 0;
  const distancePx = flight ? Math.max(55, Math.min(205, (flight.total / 320) * 205)) : 0;

  return (
    <section className="relative mt-4 h-64 overflow-hidden rounded-3xl border border-border bg-primary/5">
      <div className="absolute inset-x-0 top-3 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>← Vänster</span>
        <span>Fairway</span>
        <span>Höger →</span>
      </div>

      <div className="absolute bottom-0 left-1/2 h-[82%] w-[48%] -translate-x-1/2 rounded-t-[46%] bg-primary/10" />
      <div className="absolute bottom-0 left-1/2 h-[82%] w-px -translate-x-1/2 border-l border-dashed border-primary/40" />
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Tee
      </div>

      <div
        className="absolute bottom-10 left-1/2 z-10 h-3.5 w-3.5 rounded-full bg-flag shadow-[0_0_0_5px_rgba(255,255,255,0.55)] transition-transform ease-out"
        style={{
          transitionDuration: `${FLIGHT_DURATION_MS}ms`,
          transform:
            flight && landed
              ? `translate(calc(-50% + ${lateralPx}px), -${distancePx}px)`
              : "translate(-50%, 0)",
        }}
      />

      {flight ? (
        <div className="absolute bottom-3 left-3 rounded-xl bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
          <span className="font-semibold text-foreground">{flight.total} m</span>
          {flight.sidled > 0 ? (
            <span className="text-muted-foreground">
              {" "}· {flight.sidled} m {flight.direction === "left" ? "vänster" : "höger"}
            </span>
          ) : (
            <span className="text-muted-foreground"> · mittlinje</span>
          )}
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 rounded-xl bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
          Bollen ligger på tee
        </div>
      )}
    </section>
  );
}

function SidledValue({
  value,
  direction,
  onChange,
  onDirectionChange,
}: {
  value: number;
  direction: ShotDirection;
  onChange: (n: number) => void;
  onDirectionChange: (direction: ShotDirection) => void;
}) {
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
      <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => onDirectionChange("left")}
          aria-pressed={direction === "left"}
          className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
            direction === "left"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          ← Vänster
        </button>
        <button
          type="button"
          onClick={() => onDirectionChange("right")}
          aria-pressed={direction === "right"}
          className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
            direction === "right"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          }`}
        >
          Höger →
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
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
