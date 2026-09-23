import { unusualSpeed } from "@/lib/speed-challenge-feedback";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Undo2, Check, Trophy, LoaderCircle } from "lucide-react";
import { ChipCelebration } from "@/components/chip-celebration";
import { SpeedLeaderboard } from "@/components/speed-course-leaderboard";
import { Button } from "@/components/ui/button";
import { SpeedChallengeAnalysis } from "@/components/speed-challenge-analysis";
import {
  courseStorageKey,
  emptyCourse,
  fromMph,
  objectiveResult,
  parseCourse,
  reduceCourse,
  speedHistoryBaseline,
  toMph,
  validShot,
  type CourseAction,
  type SpeedUnit,
} from "@/lib/speed-course";
import { mergeSpeedRounds, syncSpeedRounds } from "@/lib/speed-cloud";

const fmt = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");
const unitLabel = (mph: number, unit: SpeedUnit) => `${fmt(fromMph(mph, unit))} ${unit}`;

export function SpeedRoundGame({
  userId,
  authLoading,
  playerName,
}: {
  userId: string | null;
  authLoading: boolean;
  playerName: string;
  onExit: () => void;
}) {
  const [state, setState] = useState(emptyCourse);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"intro" | "test" | "compiling" | "result">("intro");
  const [resultId, setResultId] = useState<string | null>(null);
  const [unit, setUnit] = useState<SpeedUnit>("mph");
  const [value, setValue] = useState("100");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [cloudError, setCloudError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(!!userId);
  const [celebrationId, setCelebrationId] = useState<string | null>(null);
  const [confirmSpeed, setConfirmSpeed] = useState<number | null>(null);
  const [compileStep, setCompileStep] = useState(0);
  const stateRef = useRef(state);
  const key = courseStorageKey(userId);

  useEffect(() => {
    if (authLoading) return;
    try {
      const restored = parseCourse(localStorage.getItem(key));
      if (restored.active && restored.active.baselinePb === undefined) {
        const snapshot = speedHistoryBaseline(restored.history);
        restored.active.baselinePb = snapshot.pb;
        restored.active.baselineAverage = snapshot.average;
      }
      stateRef.current = restored;
      setState(restored);
      const savedUnit = localStorage.getItem("sg4-speed-round-unit");
      const restoredUnit: SpeedUnit = savedUnit === "km/h" ? "km/h" : "mph";
      setUnit(restoredUnit);
      const lastSpeed =
        restored.active?.holes.flat().at(-1)?.ballSpeed ??
        restored.history.at(-1)?.holes.flat().at(-1)?.ballSpeed ??
        100;
      setValue(String(Number(fromMph(lastSpeed, restoredUnit).toFixed(1))));
      if (restored.active) setView("test");
    } catch {
      setStorageError(true);
    } finally {
      setReady(true);
    }
  }, [authLoading, key]);

  useEffect(() => {
    if (!ready || !userId) return;
    let alive = true;
    const sync = () => {
      void syncSpeedRounds(userId)
        .then((synced) => {
          if (!alive) return;
          const next = mergeSpeedRounds(stateRef.current, synced.history);
          stateRef.current = next;
          setState(next);
          setCloudError(false);
          setHistoryLoading(false);
        })
        .catch(() => {
          if (alive) {
            setCloudError(true);
            setHistoryLoading(false);
          }
        });
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    return () => {
      alive = false;
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [ready, userId]);

  const history = state.history.filter(
    (round) => round.status === "full" && round.holes.flat().length === 3,
  );
  const baseline = speedHistoryBaseline(history);
  const active = state.active;
  const shotIndex = active ? active.holes.length - 1 : 0;
  const currentRound = state.history.find((round) => round.id === resultId) ?? null;
  const displayedSpeed = active?.holes.flat().at(-1)?.ballSpeed ?? null;
  const numeric = Number(value.trim().replace(",", "."));
  const mph = toMph(numeric, unit);
  const valid = value.trim() !== "" && validShot({ ballSpeed: mph });

  function commit(action: CourseAction) {
    const previous = stateRef.current;
    const next = reduceCourse(previous, action);
    if (next === previous) return false;
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    if (next.history.length > previous.history.length) {
      const saved = next.history.at(-1);
      if (saved) {
        setResultId(saved.id);
        setView("compiling");
      }
      if (userId)
        void syncSpeedRounds(userId)
          .then(() => setCloudError(false))
          .catch(() => setCloudError(true));
    }
    return true;
  }

  function start() {
    const snapshot = speedHistoryBaseline(stateRef.current.history);
    if (
      !commit({
        type: "start",
        id: crypto.randomUUID(),
        at: Date.now(),
        baselineAverage: snapshot.average,
        baselinePb: snapshot.pb,
      })
    )
      return;
    setFeedback(null);
    setCelebrationId(null);
    setResultId(null);
    setView("test");
  }

  function register(confirmed?: number) {
    if (!valid || saving || !active || active.phase !== "play") return;
    setSaving(true);
    const normalized = confirmed ?? Number(mph.toFixed(1));
    if (
      confirmed === undefined &&
      unusualSpeed(normalized, active.baselineAverage ?? null, active.baselinePb ?? null)
    ) {
      setConfirmSpeed(normalized);
      setSaving(false);
      return;
    }
    setConfirmSpeed(null);
    if (!commit({ type: "score", shot: { ballSpeed: normalized } })) {
      setSaving(false);
      return;
    }
    const average = active.baselineAverage ?? null;
    const pb = active.baselinePb ?? null;
    setFeedback(
      pb !== null && normalized > pb
        ? "Nytt personbästa!"
        : average !== null && normalized > average
          ? `Över ditt snitt! +${unitLabel(normalized - average, unit)}`
          : "Slaget är registrerat",
    );
    if (
      pb !== null &&
      normalized > pb &&
      normalized > Math.max(pb, ...active.holes.flat().map((s) => s.ballSpeed))
    )
      setCelebrationId(`${active.id}-${shotIndex}-${normalized}`);
    setSaving(false);
  }

  function next() {
    if (!active || active.phase !== "result") return;
    setFeedback(null);
    commit({ type: "next", at: Date.now() });
  }

  function changeUnit(next: SpeedUnit) {
    if (value.trim() && Number.isFinite(numeric))
      setValue(String(Number(fromMph(toMph(numeric, unit), next).toFixed(1))));
    setUnit(next);
    try {
      localStorage.setItem("sg4-speed-round-unit", next);
    } catch {
      /* Unit selection still works without storage. */
    }
  }

  const resultData = currentRound ? objectiveResult(currentRound) : null;
  const resultPb = currentRound?.baselinePb ?? null;
  const resultAverage = currentRound?.baselineAverage ?? null;
  const newPb = !!resultData && resultPb !== null && resultData.topBallSpeed > resultPb;
  const aboveAverage =
    !!resultData && resultAverage !== null && resultData.topBallSpeed > resultAverage;
  const firstResult = !!resultData && resultPb === null && resultAverage === null;
  useEffect(() => {
    if (!celebrationId) return;
    const timer = window.setTimeout(() => setCelebrationId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [celebrationId]);
  const shotFeedback =
    active?.phase === "result" && displayedSpeed !== null
      ? active.baselinePb != null && displayedSpeed > active.baselinePb
        ? "Nytt personbästa!"
        : active.baselineAverage != null && displayedSpeed > active.baselineAverage
          ? `Över ditt snitt! +${unitLabel(displayedSpeed - active.baselineAverage, unit)}`
          : "Slaget är registrerat"
      : feedback;
  useEffect(() => {
    if (view !== "compiling") return;
    setCompileStep(0);
    const a = window.setTimeout(() => setCompileStep(1), 900);
    const b = window.setTimeout(() => setCompileStep(2), 1800);
    const c = window.setTimeout(() => setView("result"), 2800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [view]);

  if (!ready) return <main className="p-8 text-center">Laddar Ball Speed Challenge…</main>;
  return (
    <main className="mx-auto min-h-[calc(100dvh-58px)] max-w-md overflow-x-hidden bg-slate-50 px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-4 text-slate-950">
      {celebrationId && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setCelebrationId(null);
          }}
        >
          <DialogContent className="!inset-0 !z-[110] !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !bg-blue-600 !text-white [&>button]:z-[120] [&>button]:text-white">
            <ChipCelebration key={celebrationId} grand />
            <div className="relative z-[60] flex h-full flex-col items-center justify-center text-center">
              <Trophy className="mb-6 h-20 w-20 text-amber-300" />
              <DialogTitle className="text-5xl font-black">Nytt personbästa!</DialogTitle>
              <DialogDescription className="mt-5 text-3xl font-black text-white">
                {unitLabel(displayedSpeed ?? mph, unit)}
              </DialogDescription>
              <p className="mt-4 text-lg">Din snabbaste boll hittills.</p>
              <Button
                onClick={() => setCelebrationId(null)}
                className="mt-8 min-h-12 rounded-full bg-white px-8 text-blue-700 hover:bg-blue-50"
              >
                Fortsätt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Dialog
        open={confirmSpeed !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmSpeed(null);
        }}
      >
        <DialogContent className="!z-[110] w-[calc(100%-32px)] max-w-sm rounded-3xl bg-white p-6 text-slate-950">
          <DialogTitle className="pr-6 text-2xl font-black">Stämmer bollhastigheten?</DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Värdet avviker mycket från ditt snitt eller personbästa. Kontrollera siffran och enheten
            på mätaren.
          </DialogDescription>
          <p className="py-4 text-center text-4xl font-black text-blue-700">
            {unitLabel(confirmSpeed ?? mph, unit)}
          </p>
          <p className="text-sm text-slate-500">
            {active?.baselineAverage != null
              ? `Ditt snitt: ${unitLabel(active.baselineAverage, unit)}`
              : ""}
            {active?.baselinePb != null ? ` · PB: ${unitLabel(active.baselinePb, unit)}` : ""}
          </p>
          <Button
            onClick={() => {
              if (confirmSpeed !== null) register(confirmSpeed);
            }}
            className="min-h-12 rounded-xl bg-blue-600 text-white"
          >
            Ja, siffran stämmer
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmSpeed(null)}
            className="min-h-12 rounded-xl"
          >
            Ändra siffran
          </Button>
        </DialogContent>
      </Dialog>
      {storageError && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          Kunde inte spara på enheten. Behåll sidan öppen.{" "}
          <button
            className="underline"
            onClick={() => {
              try {
                localStorage.setItem(key, JSON.stringify(stateRef.current));
                setStorageError(false);
              } catch {
                setStorageError(true);
              }
            }}
          >
            Försök igen
          </button>
        </p>
      )}
      {cloudError && (
        <p role="status" className="mb-3 text-sm text-slate-500">
          Resultatet finns på enheten. Kontot synkas när anslutningen återkommer.
        </p>
      )}
      {view === "intro" ? (
        <div className="space-y-4">
          <section className="text-center">
            <p className="text-xs font-black uppercase text-blue-600">Ball Speed Challenge</p>
            <h1 className="mt-1 text-4xl font-black">Hur snabb är du?</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
              Testa din speed, upptäck din potentiella längd och se ditt Speed-HCP.
            </p>
          </section>
          <section className="rounded-3xl border border-blue-100 bg-white px-3 pb-5 pt-4 shadow-sm">
            <img
              src="/Off_the_tee.png"
              alt="Golfare slår ut med driver"
              className="mb-4 h-52 w-full rounded-2xl object-cover object-[center_55%]"
              fetchPriority="high"
            />
            <Button
              onClick={start}
              disabled={historyLoading}
              className="mt-4 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700"
            >
              Testa min speed
            </Button>
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">
              3 slag · Driver · Kräver hastighetsmätare
            </p>
          </section>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 text-sm text-slate-600">
            {["Jämför med din åldersgrupp", "Se din potentiella längd", "Få ditt Speed-HCP"].map(
              (label) => (
                <li key={label} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-blue-600" />
                  {label}
                </li>
              ),
            )}
          </ul>
          {baseline.pb !== null && (
            <div className="flex items-center justify-between px-2 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Trophy className="h-4 w-4 text-blue-600" />
                Ditt personbästa
              </span>
              <strong className="text-lg text-blue-700">{unitLabel(baseline.pb, unit)}</strong>
            </div>
          )}
          <SpeedLeaderboard
            userId={userId}
            history={state.history}
            playerName={playerName}
            ballSpeed
            unit={unit}
          />
        </div>
      ) : view === "test" && active ? (
        <div className="space-y-3">
          <section className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">Ball Speed Challenge · 3 slag</p>
              <h1 className="mt-1 text-4xl font-black">Slag {shotIndex + 1}</h1>
            </div>
            <div className="flex rounded-xl bg-blue-50 p-1">
              {(["mph", "km/h"] as const).map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  onClick={() => changeUnit(item)}
                  aria-pressed={unit === item}
                  className={`h-9 rounded-lg px-3 ${unit === item ? "bg-blue-600 text-white hover:bg-blue-600 hover:text-white" : "text-blue-700"}`}
                >
                  {item}
                </Button>
              ))}
            </div>
          </section>
          {shotIndex === 2 && active.phase === "play" && (
            <p className="rounded-2xl bg-yellow-100 px-4 py-3 text-center text-base font-bold text-yellow-950">
              Sista slaget – en chans till att slå ditt rekord!
            </p>
          )}
          <section className="rounded-3xl border border-blue-100 bg-white px-3 py-3">
            <p className="pt-3 text-center text-sm font-semibold text-slate-500">Bollhastighet</p>
            {active.phase === "play" ? (
              <div className="mx-auto max-w-xs">
                <div className="py-8 text-center">
                  <output
                    aria-label="Bollhastighet"
                    aria-live="polite"
                    className="block text-6xl font-black tabular-nums text-blue-700"
                  >
                    {fmt(numeric).replace(/,0$/, "")}
                  </output>
                  <span className="mt-2 block text-lg font-semibold text-slate-500">{unit}</span>
                </div>
                <div className="grid grid-cols-3 gap-2" aria-label="Justera bollhastighet">
                  {[-10, -5, -1, 10, 5, 1].map((delta) => (
                    <Button
                      key={delta}
                      variant="outline"
                      aria-label={`${delta > 0 ? "Öka" : "Minska"} ${Math.abs(delta)} ${unit}`}
                      onClick={() =>
                        setValue((current) =>
                          String(
                            Number(
                              Math.max(
                                1,
                                Math.min(fromMph(250, unit), Number(current) + delta),
                              ).toFixed(1),
                            ),
                          ),
                        )
                      }
                      className={`min-h-14 rounded-xl text-xl font-black ${delta > 0 ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}
                    >
                      {delta > 0 ? "+" : "−"}
                      {Math.abs(delta)}
                    </Button>
                  ))}
                </div>
                <Button
                  disabled={!valid || saving}
                  onClick={() => register()}
                  className="mt-3 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700"
                >
                  Registrera slag
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p
                  className={`text-lg font-black ${shotFeedback?.startsWith("Nytt") ? "text-blue-700" : "text-slate-800"}`}
                >
                  {shotFeedback}
                </p>
                <p className="my-5 text-4xl font-black tabular-nums text-blue-700">
                  {unitLabel(displayedSpeed ?? mph, unit)}
                </p>
                <Button
                  onClick={next}
                  className="mt-3 min-h-14 w-full rounded-2xl bg-blue-600 text-base font-black text-white hover:bg-blue-700"
                >
                  {shotIndex === 2 ? "Sammanställ testet" : `Till slag ${shotIndex + 2}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    commit({ type: "undo" });
                    setFeedback(null);
                    setValue(String(Number(fromMph(displayedSpeed ?? 0, unit).toFixed(1))));
                  }}
                  className="mt-1 min-h-11 text-slate-500"
                >
                  <Undo2 /> Ändra slag
                </Button>
              </div>
            )}
          </section>
        </div>
      ) : view === "compiling" ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 p-6 text-center text-white"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="mb-8 h-12 w-12 motion-safe:animate-spin" />
          <h1 className="text-3xl font-black">
            {
              [
                "Sammanställer testet…",
                "Beräknar din potentiella längd…",
                "Ditt resultat är snart klart",
              ][compileStep]
            }
          </h1>
          <p className="mt-4 text-base text-blue-100">Tre slag. Din speed. Ditt resultat.</p>
        </div>
      ) : currentRound && resultData ? (
        <div className="space-y-4">
          <section
            className={`rounded-3xl border bg-white p-5 text-center shadow-sm ${newPb ? "border-blue-400 shadow-blue-200" : "border-blue-100"}`}
          >
            <p className="text-xs font-black uppercase text-blue-600">Ditt resultat</p>
            <h1 className="mt-1 text-2xl font-black">
              {newPb
                ? "Nytt personbästa!"
                : aboveAverage
                  ? `Över ditt snitt! +${unitLabel(resultData.topBallSpeed - (resultAverage ?? 0), unit)}`
                  : firstResult
                    ? "Din startnivå är satt"
                    : "Ball Speed Challenge klar"}
            </h1>
            <p className="mt-4 text-[clamp(32px,9vw,52px)] font-black tabular-nums text-blue-700">
              {unitLabel(resultData.topBallSpeed, unit)}
            </p>
            <p className="mt-1 text-sm text-slate-500">Bästa bollhastighet</p>
            {resultAverage !== null && (
              <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                <p className="font-bold text-blue-700">
                  {aboveAverage
                    ? `Du slog ditt snitt med ${unitLabel(resultData.topBallSpeed - resultAverage, unit)}!`
                    : resultData.topBallSpeed === resultAverage
                      ? "Du matchade ditt snitt"
                      : "Ditt snitt att utmana"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Ditt snitt: {unitLabel(resultAverage, unit)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Bästa slaget per test · upp till 5 tidigare tester
                </p>
              </div>
            )}
          </section>
          <SpeedChallengeAnalysis round={currentRound} unit={unit} />
          <SpeedLeaderboard
            userId={userId}
            history={state.history}
            playerName={playerName}
            ballSpeed
            unit={unit}
          />
          <Button
            onClick={start}
            className="min-h-14 w-full rounded-2xl bg-slate-950 text-base font-black text-white hover:bg-slate-800"
          >
            <RotateCcw /> Testa igen · 3 slag
          </Button>
        </div>
      ) : null}
    </main>
  );
}
