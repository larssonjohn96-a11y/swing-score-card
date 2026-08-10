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
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PRECISION_TARGETS,
  PRECISION_TOTAL_SHOTS,
  emptyPrecisionShots,
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
import { ApproachShotVisual } from "@/components/approach-shot-visual";
import { PrecisionReport } from "@/components/precision-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { ApproachProcessing } from "@/components/approach-processing";
import { ApproachCelebration, type ApproachPRResult } from "@/components/approach-celebration";
import { computeAchievements, type ProgressItem } from "@/lib/trophy-room";

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

type Phase = "setup" | "test" | "processing" | "result";

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
  const [pr, setPr] = useState<ApproachPRResult | null>(null);
  const [newAchievement, setNewAchievement] = useState<ProgressItem | null>(null);
  /** true när alla 18 slag registrerats men användaren ännu inte slutfört testet */
  const [allRegistered, setAllRegistered] = useState(false);
  /** bara ETT steg bakåt tillåts – spärras tills nästa slag sparats */
  const [undoUsed, setUndoUsed] = useState(false);

  const current = shots[Math.min(index, PRECISION_TOTAL_SHOTS - 1)];

  useHideBottomNav(true);

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
    setPr(null);
    setNewAchievement(null);
    setAllRegistered(false);
    setUndoUsed(false);
    setPhase("test");
  }

  function commit() {
    const offline = side * offset;
    const next = index + 1;
    const updatedShots = shots.map((s, i) =>
      i === index ? { ...s, carry, offline, filled: true } : s,
    );
    setShots(updatedShots);
    setUndoUsed(false);

    if (next >= PRECISION_TOTAL_SHOTS) {
      // Testet låses INTE här – användaren får en sista chans att ändra
      // slag 18 innan analysen körs (se finalize).
      setAllRegistered(true);
    } else {
      // Om nästa slag redan är registrerat (användaren gick ett steg bakåt)
      // förifylls dess tidigare värden istället för måldistansen.
      const n = updatedShots[next];
      setIndex(next);
      setCarry(n.filled ? n.carry : n.target);
      setSide(n.filled && n.offline < 0 ? -1 : 1);
      setOffset(n.filled ? Math.abs(n.offline) : 0);
    }
  }

  function finalize(finalShots: PrecisionShot[]) {
    // Jämför alltid mot historiken FÖRE det här testet inkluderas, annars
    // riskerar det nya resultatet att jämföras mot sig självt.
    const previousSessions = loadPrecisionSessions();
    const previousHcps = previousSessions
      .map((s) => s.handicap)
      .filter((v): v is number => typeof v === "number");
    const previousScores = previousSessions
      .map((s) => s.score)
      .filter((v): v is number => typeof v === "number");
    const previousBestHcp = previousHcps.length ? Math.min(...previousHcps) : undefined;
    const previousBestScore = previousScores.length ? Math.max(...previousScores) : undefined;
    const achievementsBefore = computeAchievements();

    // Beräkningen (allt synkron JS) är klar direkt – processing-skärmen
    // spelar ändå ut sin egen sekvens innan den visar CTA:n, se
    // ApproachProcessing. Sparas direkt så resultatet garanterat finns
    // klart innan användaren kan trycka "Se mitt resultat".
    const saved = savePrecisionSession(finalShots, context, device);

    const isFirstTest = previousSessions.length === 0;
    // Ett resultat som MATCHAR (delar) tidigare rekord räknas nu också
    // som PR, inte bara ett som slår det – bara ett sämre resultat är
    // inget PR.
    const hcpPR =
      !isFirstTest &&
      typeof saved.handicap === "number" &&
      previousBestHcp !== undefined &&
      saved.handicap <= previousBestHcp + 0.05
        ? { newHcp: saved.handicap, previousBest: previousBestHcp }
        : undefined;
    const scorePR =
      !isFirstTest &&
      typeof saved.score === "number" &&
      previousBestScore !== undefined &&
      saved.score >= previousBestScore - 0.05
        ? { newScore: saved.score, previousBest: previousBestScore }
        : undefined;
    setPr({ isFirstTest, hcpPR, scorePR });

    const achievementsAfter = computeAchievements();
    const justUnlocked = achievementsAfter.find(
      (a) =>
        a.status === "unlocked" &&
        achievementsBefore.find((b) => b.id === a.id)?.status !== "unlocked",
    );
    setNewAchievement(justUnlocked ?? null);

    setPhase("processing");
  }

  /** Ett steg bakåt till senast registrerade slag, med värdena förifyllda. */
  function back() {
    if (allRegistered) {
      // Slag 18 är registrerat men testet inte slutfört – ändra det slaget.
      setAllRegistered(false);
      const i = PRECISION_TOTAL_SHOTS - 1;
      setIndex(i);
      setCarry(shots[i].filled ? shots[i].carry : shots[i].target);
      setSide(shots[i].offline < 0 ? -1 : 1);
      setOffset(Math.abs(shots[i].offline));
      setUndoUsed(true);
      return;
    }
    if (index === 0 || undoUsed) return;
    const i = index - 1;
    setIndex(i);
    setCarry(shots[i].filled ? shots[i].carry : shots[i].target);
    setSide(shots[i].offline < 0 ? -1 : 1);
    setOffset(Math.abs(shots[i].offline));
    setUndoUsed(true);
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
        canUndo={allRegistered || (index > 0 && !undoUsed)}
        allRegistered={allRegistered}
        onFinalize={() => finalize(shots)}
        onAbort={() => navigate({ to: "/kategori/$slug", params: { slug: "approach" } })}
      />
    );
  if (phase === "processing") {
    return (
      <ApproachProcessing
        totalShots={PRECISION_TOTAL_SHOTS}
        resultReady
        onSeeResult={() => setPhase("result")}
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
      pr={pr}
      newAchievement={newAchievement}
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
  canUndo,
  allRegistered,
  onFinalize,
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
  /** ett steg bakåt tillåtet just nu */
  canUndo: boolean;
  /** alla 18 slag registrerade – väntar på att användaren slutför testet */
  allRegistered: boolean;
  onFinalize: () => void;
  onAbort: () => void;
}) {
  const done = allRegistered ? PRECISION_TOTAL_SHOTS : index;
  const pct = Math.round((done / PRECISION_TOTAL_SHOTS) * 100);
  const diff = carry - current.target;
  const perRound = PRECISION_TOTAL_SHOTS / 2;
  const isPerfect = diff === 0 && offset === 0;
  const landingDistanceM = Math.sqrt(diff * diff + offset * offset);
  const isBirdieRange = !isPerfect && landingDistanceM <= 4;

  const [flying, setFlying] = useState(false);

  function handleCommitClick() {
    if (flying) return;
    setFlying(true);
    const delay = isPerfect ? 1350 : isBirdieRange ? 1950 : 700;
    window.setTimeout(() => {
      setFlying(false);
      onCommit();
    }, delay);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-32 pt-3">
      <div className="flex items-center justify-end">
        <button
          onClick={onAbort}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Avbryt test
        </button>
      </div>

      <div className="mt-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">
            {allRegistered ? (
              `${PRECISION_TOTAL_SHOTS}/${PRECISION_TOTAL_SHOTS} slag registrerade`
            ) : (
              <>
                Slag {index + 1}{" "}
                <span className="text-muted-foreground">av {PRECISION_TOTAL_SHOTS}</span>
              </>
            )}
          </span>
          <span className="text-muted-foreground">{pct} %</span>
        </div>

        {canUndo && (
          <button
            type="button"
            onClick={onBack}
            disabled={flying}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-3 w-3" />
            {allRegistered ? "Ändra senaste slag" : "Ändra föregående slag"}
          </button>
        )}

        <div className="mt-1 flex gap-2">
          {[1, 2].map((round) => {
            const filledInRound = Math.min(perRound, Math.max(0, done - (round - 1) * perRound));
            return (
              <div key={round} className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(filledInRound / perRound) * 100}%` }}
                  />
                </div>
                <p
                  className={`mt-0.5 text-[9px] uppercase tracking-[0.2em] ${
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

      <div className="mt-2">
        <ApproachShotVisual
          target={current.target}
          diff={diff}
          offset={offset}
          side={side}
          touched={diff !== 0 || offset !== 0}
          flying={flying}
        />
      </div>

      <div className="mt-1.5 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Måldistans</p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-4xl leading-none text-flag">
          {current.target}
          <span className="ml-1.5 text-base text-muted-foreground">m</span>
        </p>
      </div>

      <div
        className={`mt-2 space-y-1.5 ${allRegistered ? "pointer-events-none opacity-50" : ""}`}
        aria-hidden={allRegistered}
      >
        <NumberField
          label="Carry"
          value={carry}
          onChange={setCarry}
          unit="m"
          hint={diff === 0 ? "på måldistans" : `${diff > 0 ? "+" : ""}${diff} m`}
        />

        <div className="rounded-2xl border border-border bg-card p-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Sidled</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              { v: -1 as const, label: "Vänster", Icon: ChevronLeft },
              { v: 1 as const, label: "Höger", Icon: ChevronRight },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setSide(o.v)}
                aria-pressed={side === o.v}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-semibold transition-colors ${
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

      <div className="flex-1" />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-6 pb-5 pt-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <p className="mb-2 text-center text-xs leading-snug text-muted-foreground">
          {allRegistered ? (
            <>
              Alla {PRECISION_TOTAL_SHOTS} slag är registrerade. Kontrollera senaste slaget innan du
              slutför.
            </>
          ) : (
            <>
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
            </>
          )}
        </p>
        <button
          onClick={allRegistered ? onFinalize : handleCommitClick}
          disabled={flying}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-[family-name:var(--font-display)] text-xl text-primary-foreground disabled:opacity-70"
        >
          {allRegistered
            ? "Slutför test"
            : index + 1 === PRECISION_TOTAL_SHOTS
              ? "Spara slag"
              : "Nästa slag"}
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span
            className={`font-[family-name:var(--font-display)] text-3xl leading-none transition-[color,transform] duration-200 ${
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted"
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
  pr,
  newAchievement,
}: {
  shots: PrecisionShot[];
  prevScore: number | null;
  onRestart: () => void;
  context: MeasurementContext;
  device: Device;
  pr: ApproachPRResult | null;
  newAchievement: ProgressItem | null;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <p className="mb-6 flex items-center justify-center gap-1 text-xs text-primary">
        <Check className="h-4 w-4" /> Testet är sparat
      </p>

      {pr && <ApproachCelebration pr={pr} />}

      <PrecisionReport shots={shots} prevScore={prevScore} context={context} device={device} />

      {newAchievement && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-flag/40 bg-flag/5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flag/15 text-flag">
            <Trophy className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-flag">Achievement unlocked</p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg leading-none">
              {newAchievement.title.toUpperCase()}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{newAchievement.description}</p>
          </div>
          <Link
            to="/trophy"
            className="shrink-0 rounded-full border border-flag/40 px-3 py-1.5 text-xs font-semibold text-flag"
          >
            Trophy Room
          </Link>
        </div>
      )}

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
