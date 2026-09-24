import { ChipCelebration } from "@/components/chip-celebration";
import { speedStories } from "@/lib/speed-story";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { SpeedComparisonPyramid } from "@/components/speed-comparison-pyramid";
import { SpeedLevelReveal } from "@/components/speed-level-reveal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSubscription } from "@/lib/subscription";
import { loadCardProfile } from "@/lib/rating-card";
import {
  ALL_GOLFERS_BALL_SPEED,
  ballSpeedDistributionForAge,
  handicapFromBallSpeed,
  handicapLabel,
} from "@/lib/speed";
import { objectiveResult, type SpeedUnit, type CourseRound } from "@/lib/speed-course";
import { driverDistancePotential } from "@/lib/driver-distance-potential";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";

function AnimatedDistance({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const start = performance.now();
    if (motion.matches) {
      setDisplay(value);
      return;
    }
    setDisplay(0);
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start - delay) / 1600));
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const stop = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        setDisplay(value);
      }
    };
    motion.addEventListener("change", stop);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", stop);
    };
  }, [value, delay]);
  return (
    <>
      <span className="sr-only">Cirka {value} meter</span>
      <span aria-hidden="true">≈ {display}</span>
    </>
  );
}

type SpeedChallengeAnalysisProps = {
  round: CourseRound;
  unit?: SpeedUnit;
  onRestart: () => void;
  onBackToStart: () => void;
};

export function SpeedChallengeAnalysis(props: SpeedChallengeAnalysisProps) {
  return <SpeedChallengeAnalysisContent key={props.round.id} {...props} />;
}

function SpeedChallengeAnalysisContent({
  round,
  unit = "mph",
  onRestart,
  onBackToStart,
}: SpeedChallengeAnalysisProps) {
  const { canViewDetailedBreakdowns } = useSubscription();
  const [open, setOpen] = useState(false);
  const [story, setStory] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const onLevelComplete = useCallback(() => setLevelComplete(true), []);
  const [age, setAge] = useState<number | undefined>(() => loadCardProfile().age);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useChipScreenColor(open && canViewDetailedBreakdowns);
  const result = objectiveResult(round);
  const hcp = handicapFromBallSpeed(result.avgBallSpeed);
  const distribution = age ? ballSpeedDistributionForAge(age) : undefined;
  const potential = driverDistancePotential(result.topBallSpeed);
  const stories = speedStories(result.avgBallSpeed, age);
  const currentStory = stories[story];
  const lastStory = stories.length - 1;
  useEffect(() => {
    if (!open || !canViewDetailedBreakdowns) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRevealed(true), reduced ? 0 : 1600);
    const completion = window.setTimeout(() => setRevealComplete(true), reduced ? 0 : 3000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(completion);
    };
  }, [open, round.id, canViewDetailedBreakdowns]);
  const nextBlocked = (currentStory === "hcp" && !revealComplete) ||
    (currentStory === "level" && !levelComplete);
  function showStory(index: number) {
    const target = Math.max(0, Math.min(lastStory, index));
    if (target === story) return;
    // All entry paths (button, keyboard, swipe, backward) reset the reveal gate.
    setLevelComplete(false);
    touch.current = null;
    setStory(target);
  }
  function previous() { showStory(story - 1); }
  function next() {
    if (!nextBlocked) showStory(story + 1);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setStory(0);
          setRevealed(false);
          setRevealComplete(false);
          setLevelComplete(false);
          touch.current = null;
        }
      }}
    >
      <style>{`@keyframes speedHcpDial{from{transform:translateY(0)}to{transform:translateY(-85.7%)}}.speed-hcp-dial{animation:speedHcpDial .65s linear infinite;line-height:96px}@media(prefers-reduced-motion:reduce){.speed-hcp-dial{animation:none}}`}</style>
      <DialogTrigger asChild>
        <Button className="min-h-14 w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white shadow-md hover:bg-blue-700">
          {!canViewDetailedBreakdowns && <Lock className="h-4 w-4" />}Visa min HCP-analys{" "}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!fixed !inset-0 !z-[100] !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !gap-0 !overflow-hidden !rounded-none !border-0 !bg-blue-600 !p-0 !animate-none text-white [&>button]:hidden">
        <div className="absolute right-4 top-[max(12px,env(safe-area-inset-top))] z-50">
          <DialogClose asChild>
            <Button
              aria-label="Stäng analys"
              variant="outline"
              className="h-12 w-12 rounded-full border-white/30 bg-white text-blue-700 shadow-md"
            >
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        </div>
        <DialogTitle className="sr-only">Dagens Speed-HCP-analys</DialogTitle>
        <DialogDescription className="sr-only">
          Ditt Speed-HCP, jämförelser, din bollhastighet och din potentiella driverlängd.
        </DialogDescription>
        {canViewDetailedBreakdowns ? (
          <div
            className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(80px,calc(env(safe-area-inset-top)+72px))]"
            onKeyDown={(event) => {
              if ((event.target as HTMLElement).closest("input,select,textarea,summary,a")) return;
              if (event.key === "ArrowRight") {
                event.preventDefault();
                next();
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                previous();
              }
            }}
          >
            <div
              className={`flex min-h-0 flex-1 flex-col overflow-y-auto py-4 ${currentStory === "level" ? "justify-start" : "justify-center"}`}
              onTouchCancel={() => { touch.current = null; }}
              onTouchStart={(event) => {
                touch.current = null;
                if ((event.target as HTMLElement).closest("button,input,select,a,summary")) return;
                touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
              }}
              onTouchEnd={(event) => {
                const start = touch.current;
                touch.current = null;
                if (!start) return;
                const dx = event.changedTouches[0].clientX - start.x,
                  dy = event.changedTouches[0].clientY - start.y;
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                  if (dx < 0) next();
                  else previous();
                }
              }}
            >
              {currentStory === "hcp" && (
                <section className="text-center" aria-live="polite">
                  {revealComplete && <ChipCelebration confettiOnly />}
                  <h2 className="mt-4 text-3xl font-black">Ditt Speed-HCP</h2>
                  <div
                    className="relative my-6 h-36 text-[clamp(80px,25vw,120px)] font-black tabular-nums"
                    aria-live="polite"
                  >
                    <span className="sr-only">
                      {revealed
                        ? `Ditt Speed-HCP: ${handicapLabel(hcp)}`
                        : "Beräknar ditt Speed-HCP"}
                    </span>
                    <div
                      aria-hidden="true"
                      className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-out motion-reduce:transition-none ${revealed ? "scale-105 opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"}`}
                    >
                      <span className="block h-24 overflow-hidden">
                        <span className="block speed-hcp-dial">
                          40
                          <br />
                          32
                          <br />
                          24
                          <br />
                          16
                          <br />8<br />0<br />
                          +6
                        </span>
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className={`absolute inset-0 flex items-center justify-center transition-all duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${revealed ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-3 scale-95 opacity-0 blur-md"}`}
                    >
                      {handicapLabel(hcp)}
                    </div>
                  </div>
                </section>
              )}
              {currentStory === "level" && (
                <SpeedLevelReveal
                  speedMph={result.topBallSpeed}
                  unit={unit}
                  active={open}
                  onComplete={onLevelComplete}
                />
              )}
              {currentStory === "age" && (
                <section className="space-y-4">
                  {age && distribution ? (
                    <SpeedComparisonPyramid
                      title="Din åldersgrupp"
                      ageGroup
                      ballSpeed={result.avgBallSpeed}
                      mean={distribution.mean}
                      sd={distribution.sd}
                    />
                  ) : (
                    <div>
                      <AgeInlinePrompt
                        variant="reveal"
                        title="Din åldersgrupp"
                        description="Ange din ålder för att se din nivå"
                        onSaved={setAge}
                      />
                    </div>
                  )}
                </section>
              )}
              {currentStory === "all" && (
                <section className="space-y-4">
                  <SpeedComparisonPyramid
                    title="Bland alla golfare"
                    ballSpeed={result.avgBallSpeed}
                    mean={ALL_GOLFERS_BALL_SPEED.mean}
                    sd={ALL_GOLFERS_BALL_SPEED.sd}
                  />
                </section>
              )}
              {currentStory === "distance" && (
                <section className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
                    Din speed. Din potential.
                  </p>
                  <h2 className="mt-4 text-3xl font-black">Så långt kan din driver nå</h2>
                  {potential ? (
                    <>
                      <div className="mt-8 grid grid-cols-2 gap-3">
                        <div className="rounded-3xl bg-white px-3 py-6 text-blue-700">
                          <p className="font-semibold">Carry</p>
                          <p className="mt-3 text-4xl font-black tabular-nums">
                            <AnimatedDistance value={potential.carry} />
                          </p>
                          <p className="mt-2 text-sm">meter i luften</p>
                        </div>
                        <div className="rounded-3xl border border-white/30 bg-white/10 px-3 py-6">
                          <p className="font-semibold">Totalt</p>
                          <p className="mt-3 text-4xl font-black tabular-nums">
                            <AnimatedDistance value={potential.total} delay={250} />
                          </p>
                          <p className="mt-2 text-sm text-blue-100">meter med rull</p>
                        </div>
                      </div>
                      <p className="mt-6 text-base text-blue-100">
                        Baserat på ditt bästa slag och optimala förhållanden.
                      </p>
                    </>
                  ) : (
                    <p className="mt-6 text-lg">
                      Din bollhastighet ligger utanför längdmodellens intervall.
                    </p>
                  )}
                </section>
              )}
            </div>
            {currentStory === "level" ? (
              <div className="mt-5 shrink-0 space-y-3 text-center">
                <h3 className="text-xl font-bold">Kan du slå ditt resultat?</h3>
                <p className="text-sm text-blue-100">Gör testet igen – tre nya slag.</p>
                <Button
                  data-local-navigation
                  onClick={() => {
                    setOpen(false);
                    onRestart();
                  }}
                  className="min-h-14 w-full rounded-full bg-white text-base font-bold text-blue-700 hover:bg-blue-50"
                >
                  Nytt test
                </Button>
                <Button
                  data-local-navigation
                  onClick={() => {
                    setOpen(false);
                    onBackToStart();
                  }}
                  variant="ghost"
                  className="min-h-12 w-full rounded-full text-base font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  Tillbaka till speed
                </Button>
              </div>
            ) : (
              <nav
                aria-label="Analysens stories"
                className="mt-4 flex shrink-0 items-center gap-3"
              >
                {story > 0 && (
                  <Button
                    data-local-navigation
                    aria-label="Föregående story"
                    onClick={previous}
                    className="h-14 w-14 shrink-0 rounded-full border border-white/30 bg-transparent text-white hover:bg-white/10"
                  >
                    <ArrowLeft />
                  </Button>
                )}
                <Button
                  data-local-navigation
                  onClick={next}
                  disabled={nextBlocked}
                  aria-hidden={nextBlocked}
                  tabIndex={nextBlocked ? -1 : 0}
                  className={`min-h-14 flex-1 rounded-full bg-white text-base font-bold text-blue-700 transition-opacity duration-300 hover:bg-blue-50 motion-reduce:transition-none ${nextBlocked ? "invisible opacity-0" : "visible opacity-100"}`}
                >
                  {currentStory === "age" && !age ? "Hoppa över" : "Nästa"}
                  {story < lastStory && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </nav>
            )}
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col justify-center p-6 text-center">
            <Lock className="mx-auto h-10 w-10" />
            <h2 className="mt-4 text-2xl font-black">Lås upp din speedanalys</h2>
            <p className="mt-3 text-blue-100">
              Se Speed-HCP, åldersjämförelse och din driverpotential med SG4+.
            </p>
            <Button asChild className="mt-5 rounded-2xl bg-white p-4 text-blue-700">
              <Link to="/premium">Se SG4+</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
