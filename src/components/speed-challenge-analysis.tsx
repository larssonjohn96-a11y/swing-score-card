import { useEffect, useState } from "react";
import { ArrowRight, Lock, X } from "lucide-react";
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
import { useChipScreenColor } from "@/lib/use-chip-screen-color";

const fmt = (value: number) => value.toFixed(1).replace(".", ",");

export function SpeedChallengeAnalysis({
  round,
  history,
  unit = "mph",
}: {
  round: CourseRound;
  history: CourseRound[];
  unit?: SpeedUnit;
}) {
  const { canViewDetailedBreakdowns } = useSubscription();
  const [open, setOpen] = useState(false);
  const [skip, setSkip] = useState(false);
  const [stage, setStage] = useState<"counting" | "result" | "fade" | "details">("counting");
  const [age, setAge] = useState<number | undefined>(() => loadCardProfile().age);
  useChipScreenColor(open && canViewDetailedBreakdowns && stage !== "details");
  const result = objectiveResult(round);
  const hcp = handicapFromBallSpeed(result.avgBallSpeed);
  const ageDistribution = age ? ballSpeedDistributionForAge(age) : undefined;
  const completed = history
    .filter((item) => item.status === "full" && item.holes.flat().length === 3)
    .slice()
    .sort((a, b) => a.finishedAt - b.finishedAt || a.id.localeCompare(b.id));

  useEffect(() => {
    if (!open || !canViewDetailedBreakdowns || skip) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage(reduced ? "result" : "counting");
    const timers = [
      window.setTimeout(() => setStage("result"), reduced ? 0 : 1600),
      window.setTimeout(() => setStage("fade"), reduced ? 850 : 3600),
      window.setTimeout(() => setStage("details"), reduced ? 850 : 4250),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [open, round.id, canViewDetailedBreakdowns, skip]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setSkip(false);
          setStage("counting");
        }
      }}
    >
      <style>{`@keyframes speedHcpDial{from{transform:translateY(0)}to{transform:translateY(-85.7%)}}.speed-hcp-dial{animation:speedHcpDial .65s linear infinite;line-height:96px}@media(prefers-reduced-motion:reduce){.speed-hcp-dial{animation:none}}`}</style>
      <DialogTrigger asChild>
        <Button className="min-h-14 w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white shadow-md hover:bg-blue-700">
          {!canViewDetailedBreakdowns && <Lock className="h-4 w-4" />}
          Analys – se ditt Speed-HCP <ArrowRight className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!z-[100] !fixed !inset-0 !left-0 !top-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !gap-0 overflow-hidden !rounded-none !border-0 !bg-transparent !p-0 !animate-none text-slate-950 [&>button]:hidden">
        <div className="absolute right-4 top-[max(12px,env(safe-area-inset-top))] z-50">
          <DialogClose asChild>
            <Button
              aria-label="Stäng analys"
              variant="outline"
              className="h-12 w-12 rounded-full border-slate-200 bg-white text-slate-900 shadow-md"
            >
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        </div>
        <DialogTitle className="sr-only">Ball Speed-analys</DialogTitle>
        <DialogDescription className="sr-only">
          Speed-HCP, åldersjämförelse och historisk utveckling.
        </DialogDescription>
        {canViewDetailedBreakdowns ? (
          <>
            <div
              className={`${stage === "details" ? "flex" : "hidden"} h-full items-center justify-center px-3 pb-4 pt-[max(76px,calc(env(safe-area-inset-top)+64px))]`}
            >
              <div className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-5 shadow-xl">
                <section>
                  <h2 className="text-2xl font-black">Din speedanalys</h2>
                  <div className="mt-3 rounded-2xl bg-blue-50 p-4 text-center text-blue-700">
                    <span className="block text-xs font-bold uppercase">Speed-HCP</span>
                    <strong className="mt-1 block text-4xl">{handicapLabel(hcp)}</strong>
                    <p className="mt-2 text-xs text-slate-600">
                      En nivå beräknad endast från bollhastighet – inte ditt golfhandicap.
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {speedLevelLabel(result.score)}. Testets snitt är{" "}
                    {fmt(fromMph(result.avgBallSpeed, unit))} {unit} och snabbaste slaget{" "}
                    {fmt(fromMph(result.topBallSpeed, unit))} {unit}.
                  </p>
                </section>
                {age && ageDistribution ? (
                  <SpeedComparisonPyramid
                    title="Din åldersgrupp"
                    ageGroup
                    ballSpeed={result.avgBallSpeed}
                    mean={ageDistribution.mean}
                    sd={ageDistribution.sd}
                  />
                ) : (
                  <AgeInlinePrompt
                    title="Din åldersgrupp"
                    description="Ange din ålder för att se din nivå"
                    onSaved={setAge}
                  />
                )}
                <SpeedComparisonPyramid
                  title="Alla golfare"
                  ballSpeed={result.avgBallSpeed}
                  mean={ALL_GOLFERS_BALL_SPEED.mean}
                  sd={ALL_GOLFERS_BALL_SPEED.sd}
                />
                <p className="text-xs text-slate-500">
                  Uppskattad nivå enligt SG4:s referensmodell.
                </p>
                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-black">Utveckling</h3>
                  {completed.length > 1 ? (
                    <div
                      className="mt-3 flex h-28 items-end gap-2"
                      aria-label="Historisk utveckling i bästa bollhastighet"
                    >
                      {completed.slice(-5).map((item) => {
                        const best = objectiveResult(item).topBallSpeed;
                        const maximum = Math.max(
                          ...completed
                            .slice(-5)
                            .map((entry) => objectiveResult(entry).topBallSpeed),
                        );
                        return (
                          <div
                            key={item.id}
                            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                          >
                            <span className="text-xs tabular-nums text-slate-500">
                              {fmt(fromMph(best, unit))}
                            </span>
                            <span
                              className="w-full rounded-t bg-blue-500"
                              style={{ height: `${Math.max(14, (best / maximum) * 82)}px` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Gör ett test till för att börja se din utveckling.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Bästa bollhastighet ({unit}) per slutfört test, upp till fem senaste.
                  </p>
                </section>
              </div>
            </div>
            {stage !== "details" && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center bg-blue-600 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-center text-white transition-opacity duration-700 motion-reduce:transition-none ${stage === "fade" ? "pointer-events-none opacity-0" : "opacity-100"}`}
              >
                <p className="text-sm font-bold uppercase tracking-widest">
                  Ditt test är analyserat
                </p>
                <p className="mt-5 text-lg">
                  {stage === "counting" ? "Sammanställer ditt resultat…" : "Ditt Speed-HCP"}
                </p>
                <div
                  className="relative my-8 h-40 w-full max-w-sm"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 flex items-center justify-center overflow-hidden text-8xl font-black transition-all duration-700 motion-reduce:transition-none ${stage === "counting" ? "opacity-100" : "opacity-0 blur-sm"}`}
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
                    className={`absolute inset-0 flex items-center justify-center text-[clamp(88px,27vw,132px)] font-black leading-none tabular-nums transition-all duration-1000 ease-out motion-reduce:transition-none ${stage === "counting" ? "scale-95 opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"}`}
                  >
                    {stage === "counting" ? (
                      <span className="sr-only">Beräknar</span>
                    ) : (
                      handicapLabel(hcp)
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSkip(true);
                    setStage("details");
                  }}
                  className="min-h-12 rounded-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  {stage === "counting" ? "Visa analys direkt" : "Se hela analysen"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col justify-center bg-white p-6 text-center">
            <Lock className="mx-auto h-10 w-10 text-blue-600" />
            <h2 className="mt-4 text-2xl font-black">Lås upp din speedanalys</h2>
            <p className="mt-2 text-slate-500">
              Se Speed-HCP, åldersjämförelse och utveckling med SG4+.
            </p>
            <Button asChild className="mt-5 rounded-2xl bg-blue-600 p-4 text-white">
              <Link to="/premium">Se SG4+</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
