import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CHIP_ZONES, type ChipPoints } from "@/lib/chip-stations";
import { courseHandicap, holeStars, roundStars, type CourseRound } from "@/lib/chip-course";
import { chipTestStars, chipStationComplete } from "@/lib/chip-test-progress";
import { BunkerStars } from "@/components/bunker-stars";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import {
  StandardHcpAnalysis,
  ShotAnalysisList,
  BenchmarkStory,
} from "@/components/standard-hcp-analysis";
import { HcpCountdownScreen } from "@/components/hcp-countdown-screen";
import { useTestViewportLock } from "@/lib/use-test-viewport-lock";
const DIST = [8, 12, 18],
  fmt = (n: number) => n.toFixed(1).replace(".", ","),
  CHIP_HISTORY_KEY = "sg4-chip-nine-shot-v1";
export function NineShotChipTest({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<"intro" | "countdown" | "test" | "compiling" | "result">(
      "intro",
    ),
    [station, setStation] = useState(0),
    [balls, setBalls] = useState<ChipPoints[][]>([[], [], []]),
    [compile, setCompile] = useState(0),
    [confirmExit, setConfirmExit] = useState(false),
    [analysis, setAnalysis] = useState(false),
    [hcpReady, setHcpReady] = useState(false);
  const timers = useRef<number[]>([]);
  const lastInput = useRef(0);
  useChipScreenColor(view === "countdown" || view === "compiling" || analysis);
  useTestViewportLock(view === "test");
  useEffect(() => {
    document.documentElement.dataset.sg4TestActive =
      view === "intro" || view === "result" ? "false" : "true";
    return () => {
      delete document.documentElement.dataset.sg4TestActive;
    };
  }, [view]);
  useEffect(() => {
    const handler = () => setConfirmExit(true);
    window.addEventListener("sg4-test-abort", handler);
    return () => window.removeEventListener("sg4-test-abort", handler);
  }, []);
  const done = balls.reduce((a, b) => a + b.length, 0),
    current = balls[station],
    stars = balls.reduce((sum, b, i) => sum + holeStars(b, i, "Fairway", 4), 0);
  const chipHistory =
    typeof window === "undefined"
      ? []
      : (() => {
          try {
            const v = JSON.parse(localStorage.getItem(CHIP_HISTORY_KEY) ?? "[]");
            return Array.isArray(v) ? v : [];
          } catch {
            return [];
          }
        })();
  const chipPb = chipHistory.reduce(
    (m: number, x: any) => Math.max(m, Number(x.stars ?? x.score ?? 0)),
    0,
  );
  const round = useMemo<CourseRound | null>(
    () =>
      done === 9
        ? {
            id: "chip-3x3",
            model: 4,
            lie: "Fairway",
            startedAt: 0,
            finishedAt: Date.now(),
            holes: balls,
            status: "front",
            distances: DIST,
          }
        : null,
    [done, balls],
  );
  const hcp = round ? courseHandicap(round) : null;
  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  useEffect(() => {
    if (view !== "compiling") return;
    setCompile(0);
    clear();
    timers.current = [
      window.setTimeout(() => setCompile(1), 850),
      window.setTimeout(() => setCompile(2), 1750),
      window.setTimeout(() => setCompile(3), 2650),
      window.setTimeout(() => setView("result"), 3400),
    ];
    return clear;
  }, [view]);
  useEffect(() => {
    if (!analysis) return;
    setHcpReady(false);
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      id = window.setTimeout(() => setHcpReady(true), r ? 0 : 1500);
    return () => window.clearTimeout(id);
  }, [analysis]);
  function start() {
    lastInput.current = 0;
    setBalls([[], [], []]);
    setStation(0);
    setView("countdown");
  }
  function score(p: ChipPoints) {
    if (view !== "test" || chipStationComplete(current) || Date.now() - lastInput.current < 350)
      return;
    lastInput.current = Date.now();
    setBalls(balls.map((b, i) => (i === station ? [...b, p] : b)));
  }
  function continueTest() {
    if (!chipStationComplete(current)) return;
    if (station < DIST.length - 1) {
      setStation(station + 1);
      return;
    }
    const completed: CourseRound = {
      id: crypto.randomUUID(),
      model: 4,
      lie: "Fairway",
      startedAt: Date.now(),
      finishedAt: Date.now(),
      holes: balls,
      status: "front",
      distances: DIST,
    };
    try {
      localStorage.setItem(
        CHIP_HISTORY_KEY,
        JSON.stringify([
          ...chipHistory,
          {
            id: completed.id,
            at: Date.now(),
            balls,
            stars: roundStars(completed),
            hcp: courseHandicap(completed),
          },
        ]),
      );
    } catch {
      toast.error("Resultatet kunde inte sparas på den här enheten.");
    }
    setView("compiling");
  }
  function undo() {
    if (current.length) setBalls((a) => a.map((b, i) => (i === station ? b.slice(0, -1) : b)));
    else if (station > 0) {
      setStation(station - 1);
      setBalls((a) => a.map((b, i) => (i === station - 1 ? b.slice(0, -1) : b)));
    }
  }
  function abort() {
    clear();
    setConfirmExit(false);
    onExit();
  }
  return (
    <main
      className={`mx-auto max-w-md bg-slate-50 px-4 pt-4 text-slate-950 ${view === "test" ? "h-[calc(100dvh-58px)] overflow-hidden pb-4" : "min-h-[calc(100dvh-58px)] pb-[max(24px,env(safe-area-inset-bottom))]"}`}
    >
      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent className="!z-[140] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6">
          <DialogTitle className="text-2xl font-black">Avbryta testet?</DialogTitle>
          <DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription>
          <Button onClick={abort} className="min-h-12 bg-slate-950 text-white">
            Avbryt test
          </Button>
          <Button variant="outline" onClick={() => setConfirmExit(false)}>
            Fortsätt testet
          </Button>
        </DialogContent>
      </Dialog>
      {view === "intro" ? (
        <div className="space-y-4">
          <section className="text-center">
            <p className="text-xs font-black uppercase text-blue-600">Chippningstest</p>
            <h1 className="mt-1 text-4xl font-black">Hur nära chippar du?</h1>
            <p className="mt-2 text-sm text-slate-600">
              9 chippar progressivt: 8 m → 12 m → 18 m. 3 slag per avstånd. Få ditt chipp-HCP.
            </p>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
            <img
              src="/0d286fd4-99fa-47eb-b39c-a7ff718ebdd6.png"
              alt=""
              className="mb-4 h-52 w-full rounded-2xl object-cover"
            />
            <div className="grid grid-cols-3 divide-x rounded-2xl bg-slate-50 py-3 text-center">
              {DIST.map((d) => (
                <div key={d}>
                  <strong className="text-lg">{d} m</strong>
                  <p className="text-[10px] text-slate-500">3 bollar</p>
                </div>
              ))}
            </div>
            <Button
              onClick={start}
              className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white"
            >
              Starta chippningstest
            </Button>
          </section>
          {chipPb > 0 && (
            <div className="flex justify-between px-2 py-2 text-sm font-semibold">
              <span>
                <Trophy className="mr-2 inline h-4 w-4" />
                Ditt personbästa
              </span>
              <strong>{chipPb} ★</strong>
            </div>
          )}
          <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white">
            <div className="border-b border-blue-100 p-4">
              <h2 className="font-black">Topplista</h2>
              <p className="text-xs text-slate-500">Dina Chipping-test</p>
            </div>
            <p className="p-4 text-sm text-slate-500">
              {chipHistory.length
                ? `${chipHistory.length} test registrerade`
                : "Gör ditt första test för att sätta high score."}
            </p>
          </section>
        </div>
      ) : view === "countdown" ? (
        <HcpCountdownScreen label="Chippning HCP · 9 slag" onComplete={() => setView("test")} />
      ) : view === "test" ? (
        <div className="space-y-4">
          <div
            className="grid grid-cols-3 gap-3"
            aria-label="Tre avstånd med tre bollar per avstånd"
          >
            {DIST.map((distance, index) => (
              <div
                key={distance}
                aria-current={index === station ? "step" : undefined}
                className={index === station ? "text-blue-700" : "text-slate-400"}
              >
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span>{distance} m</span>
                  {chipStationComplete(balls[index]) && <Check className="h-4 w-4" />}
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((ball) => (
                    <span
                      key={ball}
                      className={`h-2 flex-1 rounded-full ${ball < balls[index].length ? "bg-blue-600" : index === station ? "bg-blue-200" : "bg-slate-200"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <section className="text-center">
            <p className="text-sm font-bold text-slate-500">Avstånd {station + 1} av 3</p>
            <h1 className="mt-1 text-5xl font-black text-blue-700">{DIST[station]} m</h1>
            <p className="mt-1 font-bold">
              {chipStationComplete(current)
                ? "Alla 3 bollar registrerade"
                : `Boll ${current.length + 1} av 3`}
            </p>
            <div className="mt-3 flex justify-center">
              <BunkerStars count={chipTestStars(current)} large />
            </div>
            <p className="mt-1 text-xs text-slate-500">{fmt(chipTestStars(current))} / 3 ★</p>
            <p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold text-blue-700">
              {current.length > 0
                ? `Boll ${current.length} registrerad · ${CHIP_ZONES.find((z) => z.points === current[current.length - 1])?.label}`
                : "Registrera tre bollar från detta avstånd"}
            </p>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white p-4">
            {chipStationComplete(current) ? (
              <div className="text-center">
                <p className="mb-3 font-bold">
                  {DIST[station]} m klart · {fmt(chipTestStars(current))} stjärnor
                </p>
                <Button
                  onClick={continueTest}
                  className="min-h-14 w-full rounded-2xl bg-blue-600 font-bold text-white"
                >
                  {station < DIST.length - 1
                    ? `Nästa avstånd · ${DIST[station + 1]} m →`
                    : "Se mitt resultat →"}
                </Button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-center text-sm font-semibold text-slate-500">
                  Hur nära hålet?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CHIP_ZONES.map((z) => (
                    <Button
                      key={z.points}
                      variant="outline"
                      onClick={() => score(z.points)}
                      className="min-h-12 justify-between rounded-2xl px-4"
                    >
                      <span className="font-bold">{z.label}</span>
                      <span className="text-slate-400">+{z.points} p</span>
                    </Button>
                  ))}
                </div>
              </>
            )}
            {done > 0 && (
              <Button variant="ghost" onClick={undo} className="mt-2 w-full text-slate-500">
                <Undo2 />
                Ändra förra bollen
              </Button>
            )}
          </section>
        </div>
      ) : view === "compiling" ? (
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 p-6 text-center text-white">
            <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-white text-blue-600">
              {compile >= 3 ? (
                <Check className="h-9 w-9" />
              ) : (
                <LoaderCircle className="h-9 w-9 motion-safe:animate-spin" />
              )}
            </span>
            <h1 className="text-3xl font-black">
              {compile >= 3 ? "Resultatet klart" : "Sammanställer testet…"}
            </h1>
            <div className="mt-6 space-y-4 text-left text-blue-100">
              {[
                "Sammanställer dina nio chippar",
                "Räknar dina stjärnor",
                "Förbereder din HCP-analys",
              ].map((x, i) => (
                <p key={x} className={`flex gap-3 ${i <= compile ? "opacity-100" : "opacity-0"}`}>
                  {i < compile || compile >= 3 ? (
                    <Check />
                  ) : (
                    <LoaderCircle className="motion-safe:animate-spin" />
                  )}
                  {x}
                </p>
              ))}
            </div>
          </div>,
          document.body,
        )
      ) : view === "result" && round ? (
        <div className="space-y-4">
          <section className="rounded-3xl border border-blue-100 bg-white p-5 text-center">
            <p className="text-xs font-black uppercase text-blue-600">CHIPPNINGSTEST KLART</p>
            <h1 className="mt-1 text-3xl font-black">Ditt resultat</h1>
            <p className="mt-4 text-5xl font-black text-amber-500">{fmt(stars)} ★</p>
            <p className="text-sm text-slate-500">av 9 stjärnor</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {balls.map((b, i) => (
                <div key={DIST[i]} className="rounded-2xl bg-slate-50 p-3">
                  <strong>{DIST[i]} m</strong>
                  <p className="mt-1 text-lg font-black text-amber-500">
                    {fmt(holeStars(b, i, "Fairway", 4))} ★
                  </p>
                </div>
              ))}
            </div>
          </section>
          <Button
            onClick={() => setAnalysis(true)}
            className="min-h-14 w-full rounded-2xl bg-blue-600 font-black text-white"
          >
            Visa min HCP-analys
          </Button>
          <Button onClick={start} className="min-h-14 w-full rounded-2xl bg-slate-950 text-white">
            <RotateCcw />
            Testa igen · 9 slag
          </Button>
          <Button
            variant="outline"
            onClick={onExit}
            className="min-h-14 w-full rounded-2xl border-slate-200 bg-white text-slate-900"
          >
            <ArrowLeft />
            Tillbaka till HCP-tester
          </Button>
        </div>
      ) : null}
      {round && (
        <Dialog open={analysis} onOpenChange={setAnalysis}>
          <DialogContent className="!fixed !inset-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !p-0 text-white [&>button]:text-white">
            <DialogTitle className="sr-only">Chipp HCP-analys</DialogTitle>
            <DialogDescription className="sr-only">
              Ditt estimerade chipp-handicap.
            </DialogDescription>
            <StandardHcpAnalysis
              title="Chipp HCP-analys"
              hcp={hcp ?? 0}
              onClose={() => setAnalysis(false)}
              slides={[
                {
                  key: "shots",
                  content: (
                    <ShotAnalysisList
                      title="Dina nio chippar"
                      rows={balls.flatMap((b, si) =>
                        b.map((p, bi) => ({
                          label: `${DIST[si]} m · boll ${bi + 1}`,
                          value:
                            p === 4
                              ? "Sänkt"
                              : p === 3
                                ? "Inom 1 m"
                                : p === 2
                                  ? "1–2 m"
                                  : p === 1
                                    ? "2–3 m"
                                    : "Över 3 m",
                          grade:
                            p === 4
                              ? "exceptionell"
                              : p === 3
                                ? "briljant"
                                : p === 2
                                  ? "bra"
                                  : p === 1
                                    ? "förväntat"
                                    : p === 0
                                      ? "stort tapp"
                                      : "svag",
                        })),
                      )}
                    />
                  ),
                },
                {
                  key: "profile",
                  content: (
                    <section>
                      <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
                        Din profil idag
                      </p>
                      <h2 className="mt-3 text-3xl font-black">Chipping per avstånd</h2>
                      <div className="mt-5 space-y-3">
                        {balls.map((b, i) => (
                          <div
                            key={DIST[i]}
                            className="flex justify-between rounded-2xl bg-white/10 p-4"
                          >
                            <strong>{DIST[i]} m</strong>
                            <span>{fmt(holeStars(b, i, "Fairway", 4))} / 3 ★</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ),
                },
                {
                  key: "benchmark",
                  content: (
                    <BenchmarkStory
                      title="Mot hög nivå"
                      hcp={hcp ?? 0}
                      tourLabel="Referens"
                      tourValue="Proximity"
                    />
                  ),
                },
                {
                  key: "potential",
                  content: (
                    <section className="text-center">
                      <p className="text-sm font-bold uppercase tracking-widest text-blue-100">
                        Din potential
                      </p>
                      <h2 className="mt-4 text-3xl font-black">Din chipping idag</h2>
                      <div className="mt-7 text-6xl font-black">{fmt(roundStars(round))} ★</div>
                      <p className="mt-2 text-blue-100">av 9 stjärnor</p>
                      <p className="mt-5 text-blue-100">
                        Bygg vidare på de slag som redan ligger på Bra nivå eller bättre.
                      </p>
                    </section>
                  ),
                },
              ]}
            />
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
