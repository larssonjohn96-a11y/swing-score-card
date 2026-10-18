import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, LoaderCircle, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { HcpCountdownScreen } from "@/components/hcp-countdown-screen";
import { HcpTestProgress } from "@/components/hcp-test-progress";
import { StandardHcpAnalysis } from "@/components/standard-hcp-analysis";
import {
  BUNKER_INTERVALS,
  BUNKER_TEST_INTERVALS,
  BUNKER_TOTAL_SHOTS,
  computeBunkerResult,
  saveBunkerSession,
  type BunkerShot,
  type BunkerIntervalKey,
} from "@/lib/bunker";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { useTestViewportLock } from "@/lib/use-test-viewport-lock";

type View = "intro" | "countdown" | "test" | "compiling" | "result";
export function BunkerHcpTest({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<View>("intro");
  const [shots, setShots] = useState<BunkerShot[]>([]);
  const [analysis, setAnalysis] = useState(false);
  const [abort, setAbort] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saved = useRef(false);
  const result = computeBunkerResult(shots);
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
    const handler = () => setAbort(true);
    window.addEventListener("sg4-test-abort", handler);
    return () => window.removeEventListener("sg4-test-abort", handler);
  }, []);
  useEffect(() => {
    if (view !== "compiling") return;
    const timer = window.setTimeout(() => setView("result"), 2800);
    return () => window.clearTimeout(timer);
  }, [view]);
  function save(completed: BunkerShot[]) {
    if (saved.current) return;
    try {
      saveBunkerSession(completed);
      saved.current = true;
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  function start() {
    saved.current = false;
    setSaveError(false);
    setShots([]);
    setView("countdown");
  }
  function register(interval: BunkerIntervalKey) {
    if (view !== "test" || shots.length >= BUNKER_TOTAL_SHOTS) return;
    const next = [...shots, { index: shots.length + 1, interval }];
    setShots(next);
    if (next.length === BUNKER_TOTAL_SHOTS) {
      save(next);
      setView("compiling");
    }
  }
  return (
    <main
      className={`mx-auto max-w-md bg-slate-50 px-4 pt-4 text-slate-950 ${view === "test" ? "h-[calc(100dvh-58px)] overflow-y-auto pb-4" : "min-h-[calc(100dvh-58px)] pb-8"}`}
    >
      <Dialog open={abort} onOpenChange={setAbort}>
        <DialogContent className="!z-[140] max-w-sm rounded-3xl bg-white p-6">
          <DialogTitle>Avbryta testet?</DialogTitle>
          <DialogDescription>Dina slag i det här testet sparas inte.</DialogDescription>
          <Button onClick={onExit}>Avbryt test</Button>
          <Button variant="outline" onClick={() => setAbort(false)}>
            Fortsätt testet
          </Button>
        </DialogContent>
      </Dialog>
      {view === "intro" && (
        <div className="space-y-4">
          <section className="text-center">
            <p className="text-xs font-black uppercase text-blue-600">HCP-test</p>
            <h1 className="mt-1 text-4xl font-black">Bunkertest</h1>
            <p className="mt-2 text-sm text-slate-600">
              6 slag från samma läge i en bunker nära green. Lägg upp bollen på nytt inför varje
              slag och registrera avståndet från hålet.
            </p>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
            <img
              src="/bunker-round.svg"
              alt=""
              className="mb-4 h-52 w-full rounded-2xl object-cover"
            />
            <p className="rounded-2xl bg-slate-50 p-4 text-center font-bold">
              6 slag · Avstånd från hålet · HCP-analys
            </p>
            <Button
              onClick={start}
              className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-white"
            >
              Starta bunkertest
            </Button>
          </section>
        </div>
      )}
      {view === "countdown" && (
        <HcpCountdownScreen label="Bunker HCP · 6 slag" onComplete={() => setView("test")} />
      )}
      {view === "test" && (
        <div className="space-y-3">
          <HcpTestProgress current={shots.length + 1} total={BUNKER_TOTAL_SHOTS} label="Bunker" />
          <section className="text-center">
            <h1 className="text-3xl font-black">Slag {shots.length + 1}</h1>
            <p className="mt-1 text-slate-500">Hur nära hålet landade bollen?</p>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              {BUNKER_TEST_INTERVALS.map((option) => (
                <Button
                  key={option.key}
                  variant="outline"
                  onClick={() => register(option.key)}
                  className={`min-h-12 rounded-2xl ${option.key === "not-out" ? "border-red-100 bg-red-50 text-red-800" : ""}`}
                >
                  {option.key === "holed" ? "Sänkt" : option.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              disabled={!shots.length}
              onClick={() => setShots((old) => old.slice(0, -1))}
              className="mt-2 w-full text-slate-500"
            >
              <Undo2 />
              Ändra förra slaget
            </Button>
          </section>
        </div>
      )}
      {view === "compiling" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 p-6 text-center text-white">
            <LoaderCircle className="mb-7 h-12 w-12 motion-safe:animate-spin" />
            <h1 className="text-3xl font-black">Sammanställer testet…</h1>
            <p className="mt-5 text-blue-100">Räknar avstånd och förbereder din HCP-analys.</p>
          </div>,
          document.body,
        )}
      {view === "result" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Ditt resultat</p>
            <h1 className="mt-2 text-3xl font-black">Bunkertest klart</h1>
            <div className="mt-5 rounded-3xl bg-slate-50 p-6">
              <strong className="text-6xl font-black">
                {result.avgProximity.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} m
              </strong>
              <p className="mt-2 text-slate-500">Uppskattat snitt från hålet</p>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {BUNKER_TOTAL_SHOTS - result.notOutCount} av 6 upp ur bunkern ·{" "}
              {
                shots.filter((shot) => ["holed", "within-1m", "1-3m"].includes(shot.interval ?? ""))
                  .length
              }{" "}
              inom 3 m
            </p>
          </section>
          {saveError && (
            <Button variant="outline" onClick={() => save(shots)} className="w-full text-red-700">
              Resultatet kunde inte sparas · Försök igen
            </Button>
          )}
          <Button
            onClick={() => setAnalysis(true)}
            className="min-h-14 w-full rounded-2xl bg-blue-600 font-black text-white"
          >
            Visa min HCP-analys
          </Button>
          <Button onClick={start} className="min-h-14 w-full rounded-2xl bg-slate-950 text-white">
            <RotateCcw />
            Testa igen · 6 slag
          </Button>
          <Button
            variant="outline"
            onClick={onExit}
            className="min-h-14 w-full rounded-2xl bg-white"
          >
            <ArrowLeft />
            Tillbaka till HCP-tester
          </Button>
        </div>
      )}
      {view === "result" && (
        <Dialog open={analysis} onOpenChange={setAnalysis}>
          <DialogContent className="!fixed !inset-0 !h-[100dvh] !max-h-none !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !p-0 text-white [&>button]:text-white">
            <DialogTitle className="sr-only">Bunker HCP-analys</DialogTitle>
            <DialogDescription className="sr-only">
              Uppskattad nivå för ditt bunkertest.
            </DialogDescription>
            <StandardHcpAnalysis
              title="Bunker HCP-analys"
              hcp={result.handicap}
              onClose={() => setAnalysis(false)}
              slides={[
                {
                  key: "summary",
                  content: (
                    <section>
                      <h2 className="text-3xl font-black">Dina sex bunkerslag</h2>
                      <div className="mt-5 space-y-2">
                        {shots.map((shot) => (
                          <div
                            key={shot.index}
                            className="flex justify-between rounded-2xl bg-white/10 p-3"
                          >
                            <span>Slag {shot.index}</span>
                            <strong>
                              {shot.interval === "holed"
                                ? "Sänkt"
                                : BUNKER_INTERVALS.find((option) => option.key === shot.interval)
                                    ?.label}
                            </strong>
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 text-sm text-blue-100">
                        HCP är en uppskattning från avståndsintervall. Slag som stannar i bunkern
                        räknas som 10 m i modellen. Upprepa testet för att följa din utveckling.
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
