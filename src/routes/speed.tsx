import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gauge, Radar, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  RANGE_DEVICES,
  SIMULATOR_DEVICES,
  SPEED_TOTAL_SHOTS,
  ALL_GOLFERS_BALL_SPEED,
  ballSpeedDistributionForAge,
  computeSpeedResult,
  emptySpeedShots,
  handicapFromBallSpeed,
  handicapLabel,
  loadSpeedSessions,
  saveSpeedSession,
  type Device,
  type MeasurementContext,
  type SpeedShot,
} from "@/lib/speed";
import { loadCardProfile } from "@/lib/rating-card";
import { SpeedComparisonBellCurve } from "@/components/speed-bell-curve";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { TeeNumberField } from "@/components/offtee-visuals";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import type { RevealState } from "@/components/test-reveal";
import { SpeedProcessing } from "@/components/speed-processing";
import { SpeedHcpReveal } from "@/components/speed-hcp-reveal";
import { computeRevealState } from "@/lib/test-reveal-helpers";

export const Route = createFileRoute("/speed")({
  head: () => ({
    meta: [
      { title: "Speed Test – 3 drives | SG4" },
      {
        name: "description",
        content:
          "Speed Test: 3 drives, ball speed och valfri club head speed. Speed HCP och analys mätt i simulator eller på range.",
      },
    ],
  }),
  component: SpeedPage,
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

const DEFAULT_BALL_SPEED = 140;

function SpeedPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");
  const [context, setContext] = useState<MeasurementContext>("simulator");
  const [device, setDevice] = useState<Device>(SIMULATOR_DEVICES[0]);
  const [shots, setShots] = useState<SpeedShot[]>(emptySpeedShots);
  const [index, setIndex] = useState(0);
  const [ballSpeed, setBallSpeedRaw] = useState(DEFAULT_BALL_SPEED);
  const [clubSpeedEnabled, setClubSpeedEnabled] = useState(false);
  const [clubSpeed, setClubSpeed] = useState(0);

  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [age, setAge] = useState<number | undefined>(() => loadCardProfile().age);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  const lastBallSpeedRef = useRef(DEFAULT_BALL_SPEED);
  const lastClubSpeedRef = useRef(0);
  const lastClubEnabledRef = useRef(false);

  useHideBottomNav(phase !== "setup");

  useEffect(() => {
    const sessions = loadSpeedSessions();
    const last = sessions[sessions.length - 1];
    setPrevScore(last ? last.score : null);
  }, []);

  function setBallSpeed(n: number) {
    setBallSpeedRaw(n);
  }

  function pickContext(c: MeasurementContext) {
    setContext(c);
    setDevice(c === "simulator" ? SIMULATOR_DEVICES[0] : RANGE_DEVICES[0]);
  }

  function startTest() {
    setPhase("test");
  }

  function commit() {
    const updated = shots.map((s, i) =>
      i === index ? { ...s, ballSpeed, clubSpeed: clubSpeedEnabled ? clubSpeed : undefined } : s,
    );
    setShots(updated);
    lastBallSpeedRef.current = ballSpeed;
    lastClubSpeedRef.current = clubSpeed;
    lastClubEnabledRef.current = clubSpeedEnabled;

    const next = index + 1;
    if (next >= SPEED_TOTAL_SHOTS) {
      const previousSessions = loadSpeedSessions();
      const previousHcps = previousSessions.map((s) => s.handicap);
      const savedSession = saveSpeedSession(updated, context, device);
      const derived = computeRevealState(previousHcps, savedSession.handicap);
      setReveal({
        state: derived.state,
        hcp: savedSession.handicap,
        hcpLabel: handicapLabel(savedSession.handicap),
        previousHcpLabel:
          derived.previousHcp !== undefined ? handicapLabel(derived.previousHcp) : undefined,
        deltaLabel: derived.deltaLabel,
        isRetest: previousSessions.length > 0,
      });
      setPhase("processing");
    } else {
      setIndex(next);
      const nextShot = shots[next];
      if (nextShot.ballSpeed > 0) {
        setBallSpeedRaw(nextShot.ballSpeed);
        setClubSpeedEnabled(typeof nextShot.clubSpeed === "number");
        setClubSpeed(nextShot.clubSpeed ?? lastClubSpeedRef.current);
      } else {
        setBallSpeedRaw(lastBallSpeedRef.current);
        setClubSpeedEnabled(lastClubEnabledRef.current);
        setClubSpeed(lastClubSpeedRef.current);
      }
    }
  }

  function back() {
    if (index === 0) return;
    const i = index - 1;
    setIndex(i);
    const s = shots[i];
    setBallSpeedRaw(s.ballSpeed || lastBallSpeedRef.current);
    setClubSpeedEnabled(typeof s.clubSpeed === "number");
    setClubSpeed(s.clubSpeed ?? lastClubSpeedRef.current);
  }

  function restart() {
    setShots(emptySpeedShots());
    setIndex(0);
    setBallSpeedRaw(DEFAULT_BALL_SPEED);
    setClubSpeedEnabled(false);
    setClubSpeed(0);
    lastBallSpeedRef.current = DEFAULT_BALL_SPEED;
    lastClubSpeedRef.current = 0;
    lastClubEnabledRef.current = false;
    setReveal(null);
    setPhase("setup");
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
            <h1 className="text-4xl leading-none">Speed Test</h1>
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

        <button
          onClick={startTest}
          className="mt-8 w-full rounded-2xl bg-primary py-5 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
        >
          Starta Speed Test
        </button>
      </main>
    );
  }

  if (phase === "test") {
    const pct = Math.round((index / SPEED_TOTAL_SHOTS) * 100);

    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-44 pt-4">
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
            onClick={() => navigate({ to: "/kategori/$slug", params: { slug: "driving" } })}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Avbryt test
          </button>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              Slag {index + 1} <span className="text-muted-foreground">av {SPEED_TOTAL_SHOTS}</span>
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

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          {context === "simulator" ? "Simulator" : "Range"} · {device}
        </p>

        <div className="mt-4 space-y-2">
          <TeeNumberField label="Ball speed" value={ballSpeed} onChange={setBallSpeed} unit="mph" />

          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Club head speed
              </p>
              <button
                type="button"
                onClick={() => setClubSpeedEnabled((v) => !v)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  clubSpeedEnabled
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {clubSpeedEnabled ? "Anges" : "Valfritt – av"}
              </button>
            </div>
            {clubSpeedEnabled && (
              <div className="mt-2">
                <TeeNumberField
                  label=""
                  value={clubSpeed}
                  onChange={setClubSpeed}
                  unit="mph"
                  steps={[-5, -1, 1, 5]}
                />
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-6 pb-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <p className="mb-3 text-center text-sm leading-snug text-muted-foreground">
            Slaget hade <span className="font-semibold text-foreground">{ballSpeed} mph</span> ball
            speed
            {clubSpeedEnabled ? (
              <>
                {" "}
                och <span className="font-semibold text-foreground">{clubSpeed} mph</span> club head
                speed
              </>
            ) : null}
            .
          </p>
          <button
            onClick={commit}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-[family-name:var(--font-display)] text-2xl text-primary-foreground"
          >
            {index + 1 === SPEED_TOTAL_SHOTS ? "Avsluta test" : "Nästa slag"}
          </button>
        </div>
      </main>
    );
  }

  if (phase === "processing" && reveal) {
    return (
      <SpeedProcessing
        totalShots={SPEED_TOTAL_SHOTS}
        resultReady
        onSeeResult={() => setPhase("reveal")}
      />
    );
  }

  if (phase === "reveal" && reveal) {
    return <SpeedHcpReveal hcp={reveal.hcp} onContinue={() => setPhase("result")} />;
  }

  const result = computeSpeedResult(shots);
  const ageDist = age ? ballSpeedDistributionForAge(age) : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-16 pt-10">
      <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-glow)]">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Speed HCP</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-8xl leading-none text-primary">
          {handicapLabel(result.handicap)}
        </p>
      </section>

      <div className="mt-4">
        <SpeedComparisonBellCurve
          ballSpeed={result.avgBallSpeed}
          allGolfers={{
            label: "Alla golfare",
            note: `Alla golfare – uppskattning, snittet ligger runt ${ALL_GOLFERS_BALL_SPEED.mean} mph.`,
            mean: ALL_GOLFERS_BALL_SPEED.mean,
            sd: ALL_GOLFERS_BALL_SPEED.sd,
          }}
          ageGroup={
            age && ageDist
              ? {
                  label: `${age} år`,
                  note: `${age} år – uppskattning baserad på ålder, snittet ligger runt ${ageDist.mean} mph.`,
                  mean: ageDist.mean,
                  sd: ageDist.sd,
                }
              : undefined
          }
        />

        {!age && (
          <div className="mt-3">
            <AgeInlinePrompt
              title="Ange din ålder"
              description="Lägg till din åldersgrupp i jämförelsen ovan"
              onSaved={(n) => setAge(n)}
            />
          </div>
        )}
      </div>

      <SpeedBestShotHighlight topBallSpeed={result.topBallSpeed} />

      <div className="mt-6">
        <button
          onClick={restart}
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

/** Ego boost: samma princip som Approach-testets BestShotHighlight – lyfter
 *  fram testets snabbaste enskilda slag med dess motsvarande HCP-nivå. */
function SpeedBestShotHighlight({ topBallSpeed }: { topBallSpeed: number }) {
  if (!topBallSpeed) return null;
  const bestHcp = handicapFromBallSpeed(topBallSpeed);

  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-flag/30 bg-flag/5 p-5 text-center">
      <div
        className="pointer-events-none absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-flag/25 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-flag/20 text-flag">
          <Trophy className="h-5 w-5" strokeWidth={2} />
        </span>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-flag">
          Snabbaste slaget
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          HCP-nivå
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-display)] text-6xl leading-none text-flag">
          {handicapLabel(bestHcp)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {topBallSpeed.toFixed(0)} mph – du slog som en spelare med HCP {handicapLabel(bestHcp)}.
          Snyggt jobbat! 🎉
        </p>
      </div>
    </section>
  );
}
