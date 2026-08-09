import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Minus,
  Plus,
  Radar,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PRECISION_TARGETS,
  PRECISION_TOTAL_SHOTS,
  emptyPrecisionShots,
  handicapLabel,
  type PrecisionShot,
} from "@/lib/precision";
import { loadPrecisionSessions, savePrecisionSession } from "@/lib/precision-store";
import {
  RANGE_DEVICES,
  SIMULATOR_DEVICES,
  type Device,
  type MeasurementContext,
} from "@/lib/speed";
import { NumberField } from "@/components/precision-visuals";
import { PrecisionReport } from "@/components/precision-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { TestResultProcessing, TestResultReveal, type RevealState } from "@/components/test-reveal";
import { computeRevealState } from "@/lib/test-reveal-helpers";

export const Route = createFileRoute("/precision")({
  head: () => ({
    meta: [
      { title: "Inspelstest – Approach Precision Test | SG4" },
      {
        name: "description",
        content:
          "18 inspel mot nio avstånd. Få Precision Score 0–100, uppskattad handicapnivå, spridningsanalys och personliga träningsrekommendationer.",
      },
      { property: "og:title", content: "Inspelstest – Approach Precision Test" },
      {
        property: "og:description",
        content: "Precision Score, handicapnivå, spridning och träningsråd på 20 minuter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecisionPage,
});

type Phase = "setup" | "test" | "processing" | "reveal" | "result";

type RevealData = {
  state: RevealState;
  hcpLabel: string;
  previousHcpLabel?: string;
  deltaLabel?: string;
  isRetest: boolean;
};

function PrecisionPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [context, setContext] = useState<MeasurementContext>("range");
  const [device, setDevice] = useState<Device>(RANGE_DEVICES[0]);
  const [shots, setShots] = useState<PrecisionShot[]>(emptyPrecisionShots);
  const [index, setIndex] = useState(0);
  const [carry, setCarry] = useState<number>(PRECISION_TARGETS[0]);
  const [side, setSide] = useState<-1 | 1>(1);
  const [offset, setOffset] = useState(0);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  const current = shots[Math.min(index, PRECISION_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase !== "setup");

  function pickContext(c: MeasurementContext) {
    setContext(c);
    setDevice(c === "simulator" ? SIMULATOR_DEVICES[0] : RANGE_DEVICES[0]);
  }

  function start() {
    const sessions = loadPrecisionSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? (last.score ?? 0) : null);
    setShots(emptyPrecisionShots());
    setIndex(0);
    setCarry(PRECISION_TARGETS[0]);
    setSide(1);
    setOffset(0);
    setReveal(null);
    setPhase("test");
  }

  function commit() {
    const offline = side * offset;
    const next = index + 1;
    const updatedShots = shots.map((s, i) =>
      i === index ? { ...s, carry, offline, filled: true } : s,
    );
    setShots(updatedShots);

    if (next >= PRECISION_TOTAL_SHOTS) {
      const previousSessions = loadPrecisionSessions();
      const previousHcps = previousSessions
        .map((s) => s.handicap)
        .filter((v): v is number => typeof v === "number");
      const saved = savePrecisionSession(updatedShots, context, device);
      const derived = computeRevealState(previousHcps, saved.handicap ?? 0);
      setReveal({
        state: derived.state,
        hcpLabel: handicapLabel(saved.handicap ?? 0),
        previousHcpLabel:
          derived.previousHcp !== undefined ? handicapLabel(derived.previousHcp) : undefined,
        deltaLabel: derived.deltaLabel,
        isRetest: previousSessions.length > 0,
      });
      setPhase("processing");
    } else {
      setIndex(next);
      setCarry(updatedShots[next].target);
      setSide(1);
      setOffset(0);
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    setCarry(shots[i].filled ? shots[i].carry : shots[i].target);
    setSide(shots[i].offline < 0 ? -1 : 1);
    setOffset(Math.abs(shots[i].offline));
  }

  if (phase === "setup") {
    const devices = context === "simulator" ? SIMULATOR_DEVICES : RANGE_DEVICES;
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Innan du börjar
            </p>
            <h1 className="text-4xl leading-none">Approach Test</h1>
          </div>
          <Link
            to="/kategori/$slug"
            params={{ slug: "approach" }}
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
        <h2 className="mt-4 text-center text-2xl leading-tight">Var mäter du?</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Olika system mäter olika högt – vi visar det med resultatet så du kan jämföra rättvist.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => pickContext("simulator")}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              context === "simulator" ? "border-primary bg-primary/10" : "border-border bg-card"
            }`}
          >
            <p className="font-[family-name:var(--font-display)] text-xl leading-none">Simulator</p>
          </button>
          <button
            onClick={() => pickContext("range")}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              context === "range" ? "border-primary bg-primary/10" : "border-border bg-card"
            }`}
          >
            <p className="font-[family-name:var(--font-display)] text-xl leading-none">Range</p>
          </button>
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Vilken maskin?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {devices.map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                device === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          Du kör testet på {context === "simulator" ? "simulator" : "range"} med {device}
        </p>

        <button
          onClick={start}
          className="mt-6 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta Approach Test
        </button>
      </main>
    );
  }

  if (phase === "test")
    return (
      <TestScreen
        current={current}
        index={index}
        carry={carry}
        side={side}
        offset={offset}
        setCarry={setCarry}
        setSide={setSide}
        setOffset={setOffset}
        onCommit={commit}
        onBack={back}
        onAbort={() => navigate({ to: "/kategori/$slug", params: { slug: "approach" } })}
      />
    );
  if (phase === "processing" && reveal) {
    return (
      <TestResultProcessing
        testLabel="Approach"
        secondaryLabel={`${PRECISION_TOTAL_SHOTS} / ${PRECISION_TOTAL_SHOTS} slag`}
        isRetest={reveal.isRetest}
        onDone={() => setPhase("reveal")}
      />
    );
  }

  if (phase === "reveal" && reveal) {
    return (
      <TestResultReveal
        testLabel="Approach"
        value={reveal.hcpLabel}
        previousValue={reveal.previousHcpLabel}
        deltaLabel={reveal.deltaLabel}
        state={reveal.state}
        profileUpdated
        onContinue={() => setPhase("result")}
      />
    );
  }

  return (
    <ResultScreen
      shots={shots}
      prevScore={prevScore}
      onRestart={start}
      context={context}
      device={device}
    />
  );
}

/* ----------------------------------------------------------------- test */

function TestScreen({
  current,
  index,
  carry,
  side,
  offset,
  setCarry,
  setSide,
  setOffset,
  onCommit,
  onBack,
  onAbort,
}: {
  current: PrecisionShot;
  index: number;
  carry: number;
  side: -1 | 1;
  offset: number;
  setCarry: (n: number) => void;
  setSide: (s: -1 | 1) => void;
  setOffset: (n: number) => void;
  onCommit: () => void;
  onBack: () => void;
  onAbort: () => void;
}) {
  const done = index;
  const pct = Math.round((done / PRECISION_TOTAL_SHOTS) * 100);
  const diff = carry - current.target;
  const perRound = PRECISION_TOTAL_SHOTS / 2;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-40 pt-4">
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
            Slag {index + 1}{" "}
            <span className="text-muted-foreground">av {PRECISION_TOTAL_SHOTS}</span>
          </span>
          <span className="text-muted-foreground">{pct} %</span>
        </div>
        <div className="mt-1.5 flex gap-2">
          {[1, 2].map((round) => {
            const filledInRound = Math.min(perRound, Math.max(0, done - (round - 1) * perRound));
            return (
              <div key={round} className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(filledInRound / perRound) * 100}%` }}
                  />
                </div>
                <p
                  className={`mt-0.5 text-[10px] uppercase tracking-[0.2em] ${
                    current.round === round ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Varv {round}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Måldistans</p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
          {current.target}
          <span className="ml-2 text-lg text-muted-foreground">m</span>
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <NumberField
          label="Carry"
          value={carry}
          onChange={setCarry}
          unit="m"
          hint={diff === 0 ? "på måldistans" : `${diff > 0 ? "+" : ""}${diff} m`}
        />

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Sidled</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { v: -1 as const, label: "Vänster", Icon: ChevronLeft },
              { v: 1 as const, label: "Höger", Icon: ChevronRight },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setSide(o.v)}
                aria-pressed={side === o.v}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
                  side === o.v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-foreground active:bg-muted"
                }`}
              >
                {o.v === -1 && <o.Icon className="h-4 w-4" />}
                {o.label}
                {o.v === 1 && <o.Icon className="h-4 w-4" />}
              </button>
            ))}
          </div>

          <SidledValue value={offset} onChange={setOffset} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="mb-3 text-center text-sm leading-snug text-muted-foreground">
          Slaget landade <span className="font-semibold text-foreground">{carry} m</span>
          {offset === 0 ? (
            " rakt på målet"
          ) : (
            <>
              {" "}
              och{" "}
              <span className="font-semibold text-foreground">
                {offset} m {side < 0 ? "vänster" : "höger"}
              </span>{" "}
              om målet
            </>
          )}
          .
        </p>
        <button
          onClick={onCommit}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          {index + 1 === PRECISION_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </main>
  );
}

/** Kompakt sifferstepper för sidled – delar visuell stil med NumberField
 *  men utan egen etikett/hint, eftersom Sidled-kortet redan har en rubrik. */
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
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[1, 5].map((d) => (
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

function ResultScreen({
  shots,
  prevScore,
  onRestart,
  context,
  device,
}: {
  shots: PrecisionShot[];
  prevScore: number | null;
  onRestart: () => void;
  context: MeasurementContext;
  device: Device;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är sparat
      </p>

      <PrecisionReport shots={shots} prevScore={prevScore} context={context} device={device} />

      <div className="mt-10 flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Nytt test
        </button>
        <Link
          to="/precision-historik"
          className="flex-1 rounded-2xl border border-border py-4 text-center font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
        >
          Historik
        </Link>
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
