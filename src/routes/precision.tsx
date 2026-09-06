import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Radar,
  Trophy,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  EXTENDED_PRECISION_ROUNDS,
  EXTENDED_PRECISION_TARGETS,
  PRECISION_ROUNDS,
  PRECISION_TARGETS,
  emptyPrecisionShots,
  type PrecisionShot,
} from "@/lib/precision";
import { loadPrecisionSessions, savePrecisionSession } from "@/lib/precision-store";
import { NumberField } from "@/components/precision-visuals";
import { ApproachShotVisual } from "@/components/approach-shot-visual";
import { PrecisionReport } from "@/components/precision-report";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { ApproachProcessing } from "@/components/approach-processing";
import { ApproachHcpReveal } from "@/components/approach-hcp-reveal";
import { ApproachCelebration, type ApproachPRResult } from "@/components/approach-celebration";
import { computeAchievements, type ProgressItem } from "@/lib/trophy-room";

export const Route = createFileRoute("/precision")({
  head: () => ({
    meta: [
      { title: "Inspelstest – Approach Precision Test | SG4" },
      {
        name: "description",
        content:
          "18 inspel över nio avstånd från 55 till 165 meter. Få din Approach-HCP och se var du ligger i handicapfördelningen.",
      },
      { property: "og:title", content: "Inspelstest – Approach Precision Test" },
      {
        property: "og:description",
        content: "18 slag, en siffra: din Approach-HCP och var du ligger jämfört med andra golfare.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrecisionPage,
});

type Phase = "setup" | "test" | "processing" | "reveal" | "result";
type TestMode = "main" | "extended";

function PrecisionPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<TestMode>("extended");
  const [shots, setShots] = useState<PrecisionShot[]>(() =>
    emptyPrecisionShots(EXTENDED_PRECISION_TARGETS, EXTENDED_PRECISION_ROUNDS),
  );
  const [index, setIndex] = useState(0);
  const [carry, setCarry] = useState<number>(EXTENDED_PRECISION_TARGETS[0]);
  const [side, setSide] = useState<-1 | 1>(1);
  const [offset, setOffset] = useState(0);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [revealHcp, setRevealHcp] = useState(36);
  const [pr, setPr] = useState<ApproachPRResult | null>(null);
  const [newAchievement, setNewAchievement] = useState<ProgressItem | null>(null);
  const [allRegistered, setAllRegistered] = useState(false);
  const [undoUsed, setUndoUsed] = useState(false);

  const totalShots = shots.length;
  const current = shots[Math.min(index, totalShots - 1)];

  useHideBottomNav(true);

  function start(selectedMode: TestMode = mode) {
    const sessions = loadPrecisionSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? (last.score ?? 0) : null);
    const targets = selectedMode === "extended" ? EXTENDED_PRECISION_TARGETS : PRECISION_TARGETS;
    const rounds = selectedMode === "extended" ? EXTENDED_PRECISION_ROUNDS : PRECISION_ROUNDS;
    setMode(selectedMode);
    setShots(emptyPrecisionShots(targets, rounds));
    setIndex(0);
    setCarry(targets[0]);
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

    if (next >= totalShots) {
      setAllRegistered(true);
    } else {
      const n = updatedShots[next];
      setIndex(next);
      setCarry(n.filled ? n.carry : n.target);
      setSide(n.filled && n.offline < 0 ? -1 : 1);
      setOffset(n.filled ? Math.abs(n.offline) : 0);
    }
  }

  function finalize(finalShots: PrecisionShot[]) {
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
    const saved = savePrecisionSession(finalShots);

    const isFirstTest = previousSessions.length === 0;
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
    setRevealHcp(typeof saved.handicap === "number" ? saved.handicap : 36);
    setPhase("processing");
  }

  function back() {
    if (allRegistered) {
      setAllRegistered(false);
      const i = totalShots - 1;
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
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-8">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Innan du börjar</p>
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
        <h2 className="mt-4 text-center text-xl leading-tight text-muted-foreground">Välj testlängd</h2>

        <button onClick={() => start("extended")} className="mt-6 w-full rounded-2xl bg-primary py-5 text-left">
          <span className="flex items-center justify-between px-6">
            <span>
              <span className="block font-[family-name:var(--font-display)] text-2xl text-primary-foreground">Standard</span>
              <span className="block text-sm text-primary-foreground/70">18 slag · 55–165 m</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-primary-foreground" />
          </span>
        </button>

        <button
          onClick={() => start("main")}
          className="mt-3 w-full rounded-2xl border-2 border-border py-5 text-left transition-colors hover:border-primary"
        >
          <span className="flex items-center justify-between px-6">
            <span>
              <span className="block font-[family-name:var(--font-display)] text-2xl">Snabbtest</span>
              <span className="block text-sm text-muted-foreground">5 slag · 50–150 m</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </span>
        </button>
      </main>
    );
  }

  if (phase === "test") {
    return (
      <TestScreen
        current={current}
        index={index}
        totalShots={totalShots}
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
  }

  if (phase === "processing") {
    return <ApproachProcessing totalShots={totalShots} resultReady onSeeResult={() => setPhase("reveal")} />;
  }
  if (phase === "reveal") {
    return <ApproachHcpReveal hcp={revealHcp} onContinue={() => setPhase("result")} />;
  }

  return (
    <ResultScreen shots={shots} prevScore={prevScore} onRestart={start} pr={pr} newAchievement={newAchievement} />
  );
}

function TestScreen({
  current,
  index,
  totalShots,
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
  totalShots: number;
  carry: number;
  side: -1 | 1;
  offset: number;
  setCarry: (n: number) => void;
  setSide: (s: -1 | 1) => void;
  setOffset: (n: number) => void;
  onCommit: () => void;
  onBack: () => void;
  canUndo: boolean;
  allRegistered: boolean;
  onFinalize: () => void;
  onAbort: () => void;
}) {
  const done = allRegistered ? totalShots : index;
  const pct = Math.round((done / totalShots) * 100);
  const diff = carry - current.target;
  const isPerfect = diff === 0 && offset === 0;
  const landingDistanceM = Math.sqrt(diff * diff + offset * offset);
  const isBirdieRange = !isPerfect && landingDistanceM <= 4;
  const isStandard = totalShots === EXTENDED_PRECISION_TARGETS.length * EXTENDED_PRECISION_ROUNDS;
  const shotsPerRound = isStandard ? EXTENDED_PRECISION_TARGETS.length : PRECISION_TARGETS.length;
  const activeRound = isStandard ? Math.floor(index / shotsPerRound) + 1 : 1;
  const positionInRound = index % shotsPerRound;
  const nextTarget = index + 1 < totalShots
    ? isStandard
      ? EXTENDED_PRECISION_TARGETS[(index + 1) % shotsPerRound]
      : PRECISION_TARGETS[index + 1]
    : undefined;

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

  if (allRegistered) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        <div className="flex items-center justify-end">
          <button onClick={onAbort} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-3xl leading-tight">Alla {totalShots} slag registrerade!</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Redo att se ditt resultat? Du kan ändra det senaste slaget en sista gång innan du slutför.
          </p>

          {canUndo && (
            <button type="button" onClick={onBack} className="mt-5 flex items-center gap-1.5 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors active:bg-muted">
              <Undo2 className="h-3.5 w-3.5" /> Ändra senaste slag
            </button>
          )}

          <button onClick={onFinalize} className="mt-8 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground">
            Slutför test <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-32 pt-3">
      <div className="flex items-center justify-end">
        <button onClick={onAbort} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-3.5 w-3.5" /> Avbryt test
        </button>
      </div>

      <section className="mt-4 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {isStandard ? `Varv ${activeRound} av 2` : "Snabbtest"}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-4xl leading-none text-primary">{current.target} m</span>
              <span className="text-xs text-muted-foreground">nu</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">Slag {index + 1} av {totalShots}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{pct} % klart</p>
          </div>
        </div>

        {isStandard ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[1, 2].map((round) => {
              const completedInRound = round < activeRound ? shotsPerRound : round > activeRound ? 0 : positionInRound;
              const width = (completedInRound / shotsPerRound) * 100;
              return (
                <div key={round}>
                  <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em]">
                    <span className={round === activeRound ? "text-primary" : "text-muted-foreground"}>Varv {round}</span>
                    {round < activeRound && <span className="text-primary">Klart</span>}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Nu</p>
            <p className="mt-0.5 text-sm font-semibold">{current.target} m</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Nästa</p>
            <p className="mt-0.5 text-sm font-semibold">{nextTarget !== undefined ? `${nextTarget} m` : "Sista slaget"}</p>
          </div>
        </div>
      </section>

      {canUndo && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onBack}
            disabled={flying}
            className="flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
          >
            <Undo2 className="h-3 w-3" /> Föregående slag
          </button>
        </div>
      )}

      <div className="mt-4">
        <ApproachShotVisual
          target={current.target}
          diff={diff}
          offset={offset}
          side={side}
          touched={diff !== 0 || offset !== 0}
          flying={flying}
        />
      </div>

      <div className="mt-4 space-y-1.5">
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
          Slaget landade <span className="font-semibold text-foreground">{carry} m</span>
          {offset === 0 ? (
            " rakt på målet"
          ) : (
            <>
              {" "}och{" "}
              <span className="font-semibold text-foreground">{offset} m {side < 0 ? "vänster" : "höger"}</span>{" "}
              om målet
            </>
          )}
          .
        </p>
        <button
          onClick={handleCommitClick}
          disabled={flying}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-[family-name:var(--font-display)] text-xl text-primary-foreground disabled:opacity-70"
        >
          {index + 1 === totalShots ? "Spara slag" : "Nästa slag"}
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border active:bg-muted disabled:opacity-30 disabled:active:bg-transparent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-baseline justify-center gap-1">
          <span className={`font-[family-name:var(--font-display)] text-3xl leading-none transition-[color,transform] duration-200 ${flash ? "scale-110 text-flag" : "scale-100 text-foreground"}`}>
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

function ResultScreen({
  shots,
  prevScore,
  onRestart,
  pr,
  newAchievement,
}: {
  shots: PrecisionShot[];
  prevScore: number | null;
  onRestart: () => void;
  pr: ApproachPRResult | null;
  newAchievement: ProgressItem | null;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      {pr && <ApproachCelebration pr={pr} />}
      <PrecisionReport shots={shots} prevScore={prevScore} />

      {newAchievement && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-flag/40 bg-flag/5 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flag/15 text-flag">
            <Trophy className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-flag">Achievement unlocked</p>
            <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg leading-none">{newAchievement.title.toUpperCase()}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{newAchievement.description}</p>
          </div>
          <Link to="/trophy" className="shrink-0 rounded-full border border-flag/40 px-3 py-1.5 text-xs font-semibold text-flag">Trophy Room</Link>
        </div>
      )}

      <div className="mt-8">
        <button onClick={onRestart} className="w-full rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground">Nytt test</button>
      </div>

      <div className="mt-3 flex gap-3">
        <Link to="/" className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Startsida</Link>
        <Link to="/utveckling" className="flex-1 rounded-2xl border border-border py-3 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Utveckling</Link>
      </div>
    </main>
  );
}
