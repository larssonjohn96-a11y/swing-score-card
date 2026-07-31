import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PRECISION_TARGETS,
  PRECISION_TOTAL_SHOTS,
  emptyPrecisionShots,
  type PrecisionShot,
} from "@/lib/precision";
import { loadPrecisionSessions, savePrecisionSession } from "@/lib/precision-store";
import { GreenHero, NumberField } from "@/components/precision-visuals";
import { PrecisionReport } from "@/components/precision-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

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

type Phase = "intro" | "test" | "result";

function PrecisionPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [shots, setShots] = useState<PrecisionShot[]>(emptyPrecisionShots);
  const [index, setIndex] = useState(0);
  const [carry, setCarry] = useState(0);
  const [side, setSide] = useState<-1 | 1>(1);
  const [offset, setOffset] = useState(0);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const savedRef = useRef(false);

  const current = shots[Math.min(index, PRECISION_TOTAL_SHOTS - 1)];

  useHideBottomNav(phase === "intro" || phase === "test");

  function start() {
    const sessions = loadPrecisionSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? (last.score ?? 0) : null);
    setShots(emptyPrecisionShots());
    setIndex(0);
    setCarry(PRECISION_TARGETS[0]);
    setSide(1);
    setOffset(0);
    savedRef.current = false;
    setPhase("test");
  }

  function commit() {
    const offline = side * offset;
    const next = index + 1;
    setShots((p) => p.map((s, i) => (i === index ? { ...s, carry, offline, filled: true } : s)));
    if (next >= PRECISION_TOTAL_SHOTS) {
      setPhase("result");
    } else {
      setIndex(next);
      setCarry(shots[next].target);
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

  useEffect(() => {
    if (phase === "result" && !savedRef.current) {
      savedRef.current = true;
      savePrecisionSession(shots);
    }
  }, [phase, shots]);

  if (phase === "intro") return <Intro onStart={start} />;
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
        onAbort={() => setPhase("intro")}
      />
    );
  return <ResultScreen shots={shots} prevScore={prevScore} onRestart={start} />;
}

/* ---------------------------------------------------------------- intro */

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-20 pt-10">
      <GreenHero />

      <header className="mt-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Approach</p>
        <h1 className="mt-2 text-5xl leading-none">Inspelstest</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Slå 18 inspel och se exakt hur nära flaggan du landar – avstånd för avstånd.
        </p>
      </header>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6">
        <ul className="space-y-3 text-sm leading-relaxed">
          <Bullet>18 slag: nio avstånd, 55–165 m, i två varv</Bullet>
          <Bullet>Ett slag i taget – du matar in carry och sidled</Bullet>
          <Bullet>Cirka 20 minuter på range eller simulator</Bullet>
          <Bullet>Resultatet visas först när alla slag är klara</Bullet>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl leading-none">Efter testet får du</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed">
          <Bullet>Precision Score 0–100</Bullet>
          <Bullet>Uppskattad handicapnivå</Bullet>
          <Bullet>Spridningsanalys</Bullet>
          <Bullet>Identifierade styrkor</Bullet>
          <Bullet>Förbättringsområden</Bullet>
          <Bullet>Personliga träningsrekommendationer</Bullet>
        </ul>
      </section>

      <button
        onClick={onStart}
        className="mt-10 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        Starta test
      </button>

      <div className="mt-8 flex justify-center gap-6 text-sm text-muted-foreground">
        <Link to="/precision-historik" className="underline-offset-4 hover:underline">
          Se historik
        </Link>
        <Link
          to="/kategori/$slug"
          params={{ slug: "approach" }}
          className="underline-offset-4 hover:underline"
        >
          Tillbaka
        </Link>
      </div>
    </main>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
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
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-10 pt-6">
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

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            Slag {index + 1}{" "}
            <span className="text-muted-foreground">av {PRECISION_TOTAL_SHOTS}</span>
          </span>
          <span className="text-muted-foreground">{pct} %</span>
        </div>
        <div className="mt-2 flex gap-2">
          {[1, 2].map((round) => {
            const filledInRound = Math.min(perRound, Math.max(0, done - (round - 1) * perRound));
            return (
              <div key={round} className="flex-1">
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(filledInRound / perRound) * 100}%` }}
                  />
                </div>
                <p
                  className={`mt-1 text-[11px] uppercase tracking-[0.2em] ${
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

      <div className="mt-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Måldistans</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-7xl leading-none text-flag">
          {current.target}
          <span className="ml-2 text-xl text-muted-foreground">m</span>
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <NumberField
          label="Carry"
          value={carry}
          onChange={setCarry}
          unit="m"
          hint={diff === 0 ? "på måldistans" : `${diff > 0 ? "+" : ""}${diff} m`}
        />

        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Riktning</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                { v: -1 as const, label: "Vänster" },
                { v: 1 as const, label: "Höger" },
              ]
            ).map((o) => (
              <button
                key={o.label}
                onClick={() => setSide(o.v)}
                className={`rounded-xl py-3 text-sm font-semibold transition-colors ${
                  side === o.v
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <NumberField
          label="Sidled"
          value={offset}
          onChange={setOffset}
          unit="m"
          hint={offset === 0 ? "rakt på" : side < 0 ? "vänster" : "höger"}
        />
      </div>

      <button
        onClick={onCommit}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
      >
        {index + 1 === PRECISION_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
        <ArrowRight className="h-5 w-5" />
      </button>
    </main>
  );
}

/* --------------------------------------------------------------- result */

function ResultScreen({
  shots,
  prevScore,
  onRestart,
}: {
  shots: PrecisionShot[];
  prevScore: number | null;
  onRestart: () => void;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är sparat
      </p>

      <PrecisionReport shots={shots} prevScore={prevScore} />

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
    </main>
  );
}
