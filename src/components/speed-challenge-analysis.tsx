import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AgeInlinePrompt } from "@/components/age-inline-prompt";
import { SpeedComparisonPyramid } from "@/components/speed-comparison-pyramid";
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
  speedLevelLabel,
} from "@/lib/speed";
import { fromMph, objectiveResult, type SpeedUnit, type CourseRound } from "@/lib/speed-course";
import { driverDistancePotential } from "@/lib/driver-distance-potential";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";

export function SpeedChallengeAnalysis({
  round,
  unit = "mph",
}: {
  round: CourseRound;
  unit?: SpeedUnit;
}) {
  const { canViewDetailedBreakdowns } = useSubscription();
  const [open, setOpen] = useState(false);
  const [story, setStory] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [age, setAge] = useState<number | undefined>(() => loadCardProfile().age);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useChipScreenColor(open && canViewDetailedBreakdowns);
  const result = objectiveResult(round);
  const hcp = handicapFromBallSpeed(result.avgBallSpeed);
  const distribution = age ? ballSpeedDistributionForAge(age) : undefined;
  const potential = driverDistancePotential(result.topBallSpeed);
  useEffect(() => {
    if (!open || !canViewDetailedBreakdowns) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setRevealed(true), reduced ? 0 : 1600);
    return () => window.clearTimeout(timer);
  }, [open, round.id, canViewDetailedBreakdowns]);
  function next() {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    if (story === 3) setOpen(false);
    else setStory((s) => Math.min(3, s + 1));
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setStory(0);
          setRevealed(false);
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
          Ditt Speed-HCP, din åldersgrupp, alla golfare och din potentiella driverlängd.
        </DialogDescription>
        {canViewDetailedBreakdowns ? (
          <div
            className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(80px,calc(env(safe-area-inset-top)+72px))]"
            onKeyDown={(event) => {
              if ((event.target as HTMLElement).closest("input,select,textarea")) return;
              if (event.key === "ArrowRight") {
                event.preventDefault();
                next();
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setStory((s) => Math.max(0, s - 1));
              }
            }}
          >
            <div
              className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-4"
              onTouchStart={(event) => {
                if ((event.target as HTMLElement).closest("button,input,select,a")) return;
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
                  else setStory((s) => Math.max(0, s - 1));
                }
              }}
            >
              {story === 0 && (
                <section className="text-center" aria-live="polite">
                  <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
                    Dagens speednivå
                  </p>
                  <h2 className="mt-4 text-3xl font-black">Ditt Speed-HCP</h2>
                  <div className="my-8 flex h-36 items-center justify-center text-[clamp(80px,25vw,120px)] font-black tabular-nums">
                    {revealed ? (
                      handicapLabel(hcp)
                    ) : (
                      <>
                        <span className="sr-only">Beräknar ditt Speed-HCP</span>
                        <span aria-hidden className="block h-24 overflow-hidden">
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
                      </>
                    )}
                  </div>
                  <p className="text-xl font-bold">
                    {revealed ? speedLevelLabel(result.score) : "Ditt resultat är på väg…"}
                  </p>
                  <p className="mx-auto mt-4 max-w-xs text-sm text-blue-100">
                    Din nivå utifrån bollhastigheten i dagens test, inte ditt golfhandicap.
                  </p>
                </section>
              )}
              {story === 1 && (
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
                    <div className="rounded-3xl bg-white p-5 text-slate-950">
                      <AgeInlinePrompt
                        title="Din åldersgrupp"
                        description="Ange din ålder för att se din nivå"
                        onSaved={setAge}
                      />
                    </div>
                  )}
                  <p className="text-center text-xs text-blue-100">
                    Uppskattad nivå enligt SG4:s referensmodell.
                  </p>
                </section>
              )}
              {story === 2 && (
                <section className="space-y-4">
                  <SpeedComparisonPyramid
                    title="Bland alla golfare"
                    ballSpeed={result.avgBallSpeed}
                    mean={ALL_GOLFERS_BALL_SPEED.mean}
                    sd={ALL_GOLFERS_BALL_SPEED.sd}
                  />
                  <p className="text-center text-xs text-blue-100">
                    Uppskattad nivå enligt SG4:s referensmodell.
                  </p>
                </section>
              )}
              {story === 3 && (
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
                            ≈ {potential.carry}
                          </p>
                          <p className="mt-2 text-sm">meter i luften</p>
                        </div>
                        <div className="rounded-3xl border border-white/30 bg-white/10 px-3 py-6">
                          <p className="font-semibold">Totalt</p>
                          <p className="mt-3 text-4xl font-black tabular-nums">
                            ≈ {potential.total}
                          </p>
                          <p className="mt-2 text-sm text-blue-100">meter med rull</p>
                        </div>
                      </div>
                      <p className="mt-6 text-base font-semibold">
                        Utifrån ditt bästa slag:{" "}
                        {fromMph(result.topBallSpeed, unit).toFixed(1).replace(".", ",")} {unit}.
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-blue-100">
                        Uppskattad potential vid bra launch och spinn. Underlag påverkar rullen.
                        {potential.extrapolated
                          ? " Utanför referenstabellen är uppskattningen extra osäker."
                          : ""}
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
            <nav aria-label="Analysens stories" className="mt-4 flex shrink-0 items-center gap-3">
              {story > 0 && (
                <Button
                  aria-label="Föregående story"
                  onClick={() => setStory((s) => Math.max(0, s - 1))}
                  className="h-14 w-14 shrink-0 rounded-full border border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <ArrowLeft />
                </Button>
              )}
              <Button
                onClick={next}
                className="min-h-14 flex-1 rounded-full bg-white text-base font-bold text-blue-700 hover:bg-blue-50"
              >
                {!revealed
                  ? "Visa mitt resultat"
                  : story === 3
                    ? "Tillbaka till resultatet"
                    : "Nästa"}
                {story < 3 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </nav>
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
