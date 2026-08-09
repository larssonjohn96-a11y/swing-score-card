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
  OFFTEE_TOTAL_SHOTS,
  emptyTeeShots,
  handicapLabel,
  offTeeResult,
  type TeeShot,
} from "@/lib/offtee";
import { loadOffTeeSessions, saveOffTeeSession } from "@/lib/offtee-store";
import {
  RANGE_DEVICES,
  SIMULATOR_DEVICES,
  type Device,
  type MeasurementContext,
} from "@/lib/speed";
import { FairwaySpec, TeeNumberField } from "@/components/offtee-visuals";
import { OffTeeReport } from "@/components/offtee-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { TestResultProcessing, TestResultReveal, type RevealState } from "@/components/test-reveal";
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
  hcpLabel: string;
  previousHcpLabel?: string;
  deltaLabel?: string;
  isRetest: boolean;
};

/** Förval för första slaget: 200 m carry, +10 % rull = 220 m totalt. */
const DEFAULT_CARRY = 200;
const DEFAULT_ROLL_RATIO = 1.1;
const MIN_ROLL_RATIO = 1.0;
const MAX_ROLL_RATIO = 1.3;

function clampRatio(r: number): number {
  return Math.max(MIN_ROLL_RATIO, Math.min(MAX_ROLL_RATIO, r));
}

function OffTeePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [context, setContext] = useState<MeasurementContext>("range");
  const [device, setDevice] = useState<Device>(RANGE_DEVICES[0]);
  const [shots, setShots] = useState<TeeShot[]>(emptyTeeShots);
  const [index, setIndex] = useState(0);
  const [carry, setCarryRaw] = useState(DEFAULT_CARRY);
  const [total, setTotalRaw] = useState(Math.round(DEFAULT_CARRY * DEFAULT_ROLL_RATIO));
  const [side, setSide] = useState<-1 | 1>(1);
  const [offset, setOffset] = useState(0);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  // Kom ihåg carry och rull-förhållandet (totalt / carry) mellan slagen, så
  // spelaren slipper skriva in samma värden på nytt varje gång.
  const rollRatioRef = useRef(DEFAULT_ROLL_RATIO);
  const totalTouchedRef = useRef(false);
  // Kom ihåg senast valda riktning (vänster/höger) mellan slagen.
  const lastSideRef = useRef<-1 | 1>(1);

  const current = shots[Math.min(index, OFFTEE_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase !== "setup");

  function pickContext(c: MeasurementContext) {
    setContext(c);
    setDevice(c === "simulator" ? SIMULATOR_DEVICES[0] : RANGE_DEVICES[0]);
  }

  /** Ändrar carry – och räknar live om totalt via det ihågkomna rull-förhållandet,
   *  så länge spelaren inte redan justerat totalt manuellt för det här slaget. */
  function setCarry(n: number) {
    setCarryRaw(n);
    if (!totalTouchedRef.current) {
      setTotalRaw(Math.round(n * rollRatioRef.current));
    }
  }

  function setTotal(n: number) {
    setTotalRaw(n);
    totalTouchedRef.current = true;
  }

  function start() {
    const sessions = loadOffTeeSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? last.score : null);
    setShots(emptyTeeShots());
    setIndex(0);
    rollRatioRef.current = DEFAULT_ROLL_RATIO;
    totalTouchedRef.current = false;
    lastSideRef.current = 1;
    setCarryRaw(DEFAULT_CARRY);
    setTotalRaw(Math.round(DEFAULT_CARRY * DEFAULT_ROLL_RATIO));
    setSide(1);
    setOffset(0);
    setReveal(null);
    setPhase("test");
  }

  function commit() {
    const offline = side * offset;
    const next = index + 1;
    const updatedShots = shots.map((s, i) =>
      i === index ? { ...s, carry, total, offline, filled: true } : s,
    );
    setShots(updatedShots);

    // Uppdatera det ihågkomna rull-förhållandet och riktningen från slaget som just registrerades.
    if (carry > 0) {
      rollRatioRef.current = clampRatio(total / carry);
    }
    lastSideRef.current = side;

    if (next >= OFFTEE_TOTAL_SHOTS) {
      const previousSessions = loadOffTeeSessions();
      const previousHcps = previousSessions.map((s) => s.handicap);
      const saved = saveOffTeeSession(updatedShots, context, device);
      const derived = computeRevealState(previousHcps, saved.handicap);
      setReveal({
        state: derived.state,
        hcpLabel: handicapLabel(saved.handicap),
        previousHcpLabel:
          derived.previousHcp !== undefined ? handicapLabel(derived.previousHcp) : undefined,
        deltaLabel: derived.deltaLabel,
        isRetest: previousSessions.length > 0,
      });
      setPhase("processing");
    } else {
      setIndex(next);
      totalTouchedRef.current = false;
      const nextShot = shots[next];
      const nextCarry = nextShot.filled ? nextShot.carry : carry;
      setCarryRaw(nextCarry);
      if (nextShot.filled) {
        setTotalRaw(nextShot.total);
        totalTouchedRef.current = true;
        setSide(nextShot.offline < 0 ? -1 : 1);
        setOffset(Math.abs(nextShot.offline));
      } else {
        setTotalRaw(Math.round(nextCarry * rollRatioRef.current));
        setSide(lastSideRef.current);
        setOffset(0);
      }
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    const s = shots[i];
    setCarryRaw(s.filled ? s.carry : carry);
    setTotalRaw(s.filled ? s.total : total);
    totalTouchedRef.current = true;
    if (s.filled && s.carry > 0) {
      rollRatioRef.current = clampRatio(s.total / s.carry);
    }
    if (s.filled) {
      lastSideRef.current = s.offline < 0 ? -1 : 1;
    }
    setSide(s.offline < 0 ? -1 : 1);
    setOffset(Math.abs(s.offline));
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
        carry={carry}
        total={total}
        side={side}
        offset={offset}
        setCarry={setCarry}
        setTotal={setTotal}
        setSide={setSide}
        setOffset={setOffset}
        onCommit={commit}
        onBack={back}
        onAbort={() => navigate({ to: "/kategori/$slug", params: { slug: "driving" } })}
      />
    );
  if (phase === "processing" && reveal) {
    return (
      <TestResultProcessing
        testLabel="Off the Tee"
        secondaryLabel={`${OFFTEE_TOTAL_SHOTS} / ${OFFTEE_TOTAL_SHOTS} slag`}
        isRetest={reveal.isRetest}
        onDone={() => setPhase("reveal")}
      />
    );
  }

  if (phase === "reveal" && reveal) {
    return (
      <TestResultReveal
        testLabel="Off the Tee"
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
  total,
  side,
  offset,
  setCarry,
  setTotal,
  setSide,
  setOffset,
  onCommit,
  onBack,
  onAbort,
}: {
  current: TeeShot;
  index: number;
  carry: number;
  total: number;
  side: -1 | 1;
  offset: number;
  setCarry: (n: number) => void;
  setTotal: (n: number) => void;
  setSide: (s: -1 | 1) => void;
  setOffset: (n: number) => void;
  onCommit: () => void;
  onBack: () => void;
  onAbort: () => void;
}) {
  const pct = Math.round((index / OFFTEE_TOTAL_SHOTS) * 100);
  const roll = Math.max(0, total - carry);

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

      {index === 0 && (
        <div className="mt-4">
          <FairwaySpec />
        </div>
      )}

      <div className="mt-4 space-y-2">
        <TeeNumberField label="Carry" value={carry} onChange={setCarry} unit="m" />
        <TeeNumberField
          label="Totalt"
          value={total}
          onChange={setTotal}
          unit="m"
          hint={roll > 0 ? `+${roll} m rull` : undefined}
        />

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Sidled från mitten
          </p>
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
          Slaget gick <span className="font-semibold text-foreground">{total} m totalt</span>
          {offset === 0 ? (
            " rakt på linjen"
          ) : (
            <>
              {" "}
              och{" "}
              <span className="font-semibold text-foreground">
                {offset} m {side < 0 ? "vänster" : "höger"}
              </span>
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

function ResultScreen({
  shots,
  prevScore,
  onRestart,
  context,
  device,
}: {
  shots: TeeShot[];
  prevScore: number | null;
  onRestart: () => void;
  context: MeasurementContext;
  device: Device;
}) {
  const result = offTeeResult(shots);
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är sparat
      </p>

      <OffTeeReport result={result} prevScore={prevScore} context={context} device={device} />

      <div className="mt-10 flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Nytt test
        </button>
        <Link
          to="/kategori/$slug"
          params={{ slug: "driving" }}
          className="flex-1 rounded-2xl border border-border py-4 text-center font-[family-name:var(--font-display)] text-2xl text-muted-foreground"
        >
          Klart
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
