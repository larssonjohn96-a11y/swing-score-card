import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Trophy, Undo2 } from "lucide-react";
import {
  COURSE_DISTANCES,
  totalPutts,
  puttsLabel,
  exactPutts,
  puttStats,
  starLevel,
  puttCountGoal,
  courseHandicap,
  courseStorageKey,
  emptyCourse,
  holeStars,
  maxStars,
  parseCourse,
  puttAverage,
  puttGoal,
  reduceCourse,
  roundStars,
  type CourseAction,
  type CourseRound,
} from "@/lib/putt-course";
import { syncPuttRounds, mergePuttRounds } from "@/lib/putt-cloud";
import { PuttCourseMap } from "./putt-course-map";
import { PuttStars, PuttMilestones } from "./putt-stars";
import { PuttOnboarding } from "./putt-onboarding";
import { PuttLeaderboard } from "./putt-leaderboard";
import { PuttRoundImpact } from "./putt-round-impact";
import { PuttAnalysis } from "./putt-analysis";
import { PuttProgress } from "./putt-progress";
import { ChipCelebration } from "./chip-celebration";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const comments = [
  ["Snygg sänkning!", "Mitt i koppen!", "Vilken putt!"],
  ["Fint avslut!", "Bra jobbat!", "Hålet i mål!"],
  ["Vidare mot nästa!", "Nästa hål, ny chans!", "Fortsätt samla stjärnor!"],
];
export function PuttRoundGame({
  userId,
  authLoading,
  playerName,
  onExit,
}: {
  userId: string | null;
  authLoading: boolean;
  playerName: string;
  onExit: () => void;
}) {
  const [state, setState] = useState(emptyCourse),
    [ready, setReady] = useState(false),
    [view, setView] = useState<"home" | "history" | "result">("home"),
    [reviewId, setReviewId] = useState<string | null>(null),
    [fresh, setFresh] = useState<string | null>(null),
    [intro, setIntro] = useState(false),
    [rules, setRules] = useState(false),
    [exit, setExit] = useState(false),
    [pending, setPending] = useState(false),
    [confirmation, setConfirmation] = useState<string | null>(null),
    [storageError, setStorageError] = useState(false),
    [cloud, setCloud] = useState<"local" | "saved" | "loading" | "error">("local");
  const [longPutt, setLongPutt] = useState<number | null>(null),
    [moving, setMoving] = useState(false),
    [many, setMany] = useState<number | null>(null);
  useChipScreenColor(longPutt !== null);
  useEffect(() => {
    if (longPutt === null) return;
    const t = setTimeout(() => setLongPutt(null), 2700);
    return () => clearTimeout(t);
  }, [longPutt]);
  const stateRef = useRef(state),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    tap = useRef(0),
    key = courseStorageKey(userId);
  useEffect(() => {
    if (authLoading) return;
    try {
      const s = parseCourse(localStorage.getItem(key));
      stateRef.current = s;
      setState(s);
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [authLoading, key]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!ready || !userId) return;
    let alive = true;
    const sync = () => {
      setCloud("loading");
      void syncPuttRounds(userId)
        .then(() => {
          if (alive) setCloud("saved");
        })
        .catch(() => {
          if (alive) setCloud("error");
        });
    };
    const update = (e: Event) => {
      if ((e as CustomEvent).detail?.userId !== userId || !alive) return;
      try {
        const restored = parseCourse(localStorage.getItem(key));
        const next = mergePuttRounds(stateRef.current, restored.history);
        if (JSON.stringify(next.history) === JSON.stringify(stateRef.current.history)) return;
        stateRef.current = next;
        setState(next);
      } catch {
        setStorageError(true);
      }
    };
    window.addEventListener("sg4-putt-cloud-updated", update);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      alive = false;
      window.removeEventListener("sg4-putt-cloud-updated", update);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [ready, userId, key]);
  function commit(action: CourseAction) {
    const prev = stateRef.current;
    const next = reduceCourse(prev, action);
    if (next === prev) return;
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    if (next.history.length > prev.history.length) {
      const r = next.history.at(-1)!;
      setReviewId(r.id);
      setFresh(r.id);
      setView("result");
      if (userId) {
        setCloud("loading");
        void syncPuttRounds(userId)
          .then(() => setCloud("saved"))
          .catch(() => setCloud("error"));
      }
    }
  }
  function start() {
    setIntro(false);
    setMoving(false);
    setLongPutt(null);
    setReviewId(null);
    setFresh(null);
    setConfirmation(null);
    setPending(false);
    setView("home");
    commit({ type: "start", id: crypto.randomUUID(), at: Date.now() });
  }
  function requestStart() {
    try {
      if (localStorage.getItem(`sg4-putt-intro-v1:${userId ?? "guest"}`) !== "seen") {
        setIntro(true);
        return;
      }
    } catch {}
    start();
  }
  function finishIntro() {
    try {
      localStorage.setItem(`sg4-putt-intro-v1:${userId ?? "guest"}`, "seen");
    } catch {}
    start();
  }
  function score(putts: number) {
    if (Date.now() < tap.current || stateRef.current.active?.phase !== "play") return;
    tap.current = Date.now() + 450;
    commit({ type: "score", putts });
    setMany(null);
    if (putts === 1 && COURSE_DISTANCES[index] > 5) setLongPutt(COURSE_DISTANCES[index]);
    setConfirmation(
      comments[Math.min(2, putts - 1)][(index + Math.floor(state.history.length / 2)) % 3],
    );
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), 1100);
  }
  const active = state.active,
    index = active ? active.holes.length - 1 : 0,
    shots = active?.holes[index] ?? [],
    total = active ? roundStars(active) : 0;
  const round = state.history.find((r) => r.id === reviewId),
    full = state.history.filter((r) => r.status === "full"),
    average = puttAverage(state.history),
    best = full.length ? Math.max(...full.map(roundStars)) : null;
  const stats = puttStats(state.history);
  const countGoal = active ? puttCountGoal(active, state.history) : null;
  const completed = active?.holes.filter((h) => h.length).length ?? 0;
  const holeHistory = state.history.filter((r) => r.holes[index]?.length);
  const holeBest = holeHistory.length
    ? Math.max(...holeHistory.map((r) => holeStars(r.holes[index], index)))
    : null;
  const holeGoal =
    holeBest !== null && holeBest < maxStars(index)
      ? `En sänkning slår ditt bästa på hål ${index + 1}.`
      : null;
  const pbGoal = active ? puttGoal(active, state.history) : null,
    avgGoal = active ? puttGoal(active, state.history, true) : null;
  const before = round
    ? state.history.filter(
        (r) =>
          r.status === "full" &&
          r.id !== round.id &&
          (r.finishedAt < round.finishedAt ||
            (r.finishedAt === round.finishedAt && r.id.localeCompare(round.id) < 0)),
      )
    : [];
  const previousAvg = puttAverage(before),
    roundTotal = round ? roundStars(round) : 0,
    previousBest = before.length ? Math.max(...before.map(roundStars)) : null;
  const previousPutts = puttStats(before),
    resultPutts = round ? totalPutts(round) : 0;
  const puttPB =
    !!round &&
    round.status === "full" &&
    exactPutts(round) &&
    previousPutts.best !== null &&
    resultPutts < previousPutts.best;
  const beatPuttAverage =
    !!round &&
    round.status === "full" &&
    exactPutts(round) &&
    previousPutts.average !== null &&
    resultPutts < previousPutts.average;
  const levelUp =
    !!round && round.status === "full" && starLevel(roundTotal) > starLevel(previousBest ?? 0);
  const isPB =
    !!round && round.status === "full" && previousBest !== null && roundTotal > previousBest;
  const beatAverage =
    !!round && round.status === "full" && previousAvg.count > 0 && roundTotal > previousAvg.stars;
  const difference = previousAvg.stars - roundTotal;
  const replay =
    round?.status !== "full"
      ? "Redo för alla sex hål?"
      : puttPB
        ? "Nytt puttrekord – hur lågt når du nästa gång?"
        : beatPuttAverage
          ? "Färre puttar än ditt snitt. Fortsätt så!"
          : previousPutts.average !== null &&
              round &&
              exactPutts(round) &&
              resultPutts >= previousPutts.average &&
              resultPutts - previousPutts.average <= 2
            ? `${resultPutts - Math.ceil(previousPutts.average) + 1} färre puttar slår ditt tidigare snitt. En runda till?`
            : beatAverage
              ? "Över ditt snitt – bygg vidare nästa runda!"
              : previousAvg.count && difference >= 0 && difference <= 2
                ? `${Math.floor(previousAvg.stars) + 1 - roundTotal} stjärnor till över ditt tidigare snitt. En runda till?`
                : "Nästa runda kan bli din bästa.";
  function back() {
    if (active) {
      setExit(true);
      return;
    }
    if (view !== "home") {
      setView("home");
      setReviewId(null);
      setFresh(null);
      return;
    }
    onExit();
  }
  const records = (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-blue-50 p-4 text-center">
      <div>
        <strong className="block text-2xl text-blue-700">
          {best ?? "–"}
          <span className="text-sm"> / 16 ★</span>
        </strong>
        <span className="text-xs text-slate-500">Bästa hela rundan</span>
      </div>
      <div>
        <strong className="block text-2xl text-blue-700">
          {average.count ? fmt(average.stars) : "–"} ★
        </strong>
        <span className="text-xs text-slate-500">Snitt · senaste {average.count || 5}</span>
      </div>
      <div>
        <strong className="block text-2xl text-blue-700">{stats.best ?? "–"}</strong>
        <span className="text-xs text-slate-500">Puttrekord · lägst är bäst</span>
      </div>
      <div>
        <strong className="block text-2xl text-blue-700">
          {stats.average === null ? "–" : fmt(stats.average)}
        </strong>
        <span className="text-xs text-slate-500">Puttsnitt · senaste {stats.count || 5}</span>
      </div>
    </div>
  );
  if (!ready) return <main className="p-8 text-center">Laddar Puttrundan…</main>;
  return (
    <main
      className={`putt-game mx-auto min-h-[100dvh] max-w-md bg-slate-50 px-4 pb-5 pt-[max(12px,env(safe-area-inset-top))] text-slate-950 ${active?.phase === "play" || active?.phase === "result" ? "putt-playing" : ""}`}
    >
      <style>{`.putt-primary,.putt-secondary,.putt-black{display:flex;width:100%;min-height:52px;align-items:center;justify-content:center;border-radius:16px;padding:12px 16px;font-weight:800}.putt-primary{background:#2563eb;color:white}.putt-black{background:#111827;color:white}.putt-secondary{background:white;border:1px solid #e2e8f0;color:#1e40af}.putt-primary:disabled{opacity:.45}.putt-playing{display:flex;flex-direction:column;gap:10px}.putt-playing .putt-map>div{height:clamp(145px,24dvh,220px);margin:0}.putt-star{animation:puttStar .55s cubic-bezier(.2,.8,.3,1.2) both}.putt-average-win{animation:puttShine 1.2s ease-out 2}@keyframes puttLevel{0%{transform:scaleY(.25);filter:brightness(1.8)}100%{transform:scaleY(1);filter:brightness(1)}}.putt-level-up{transform-origin:bottom;animation:puttLevel .8s ease-out both}.putt-game:has(>section.my-auto){display:flex;flex-direction:column}.putt-playing:has(h1.text-6xl){gap:16px}@keyframes puttStar{0%{opacity:0;transform:scale(.4)}65%{transform:scale(1.17)}100%{opacity:1;transform:scale(1)}}@keyframes puttShine{50%{box-shadow:0 0 28px #60a5fa66;transform:scale(1.02)}}@media(max-height:700px){.putt-playing{gap:8px}.putt-playing .putt-map>div{height:145px}.putt-playing .putt-hole{padding:10px}.putt-playing .putt-hole svg{height:36px;width:36px}.putt-playing .putt-entry{min-height:60px}}@media(prefers-reduced-motion:reduce){.putt-star,.putt-average-win,.putt-level-up{animation:none}}`}</style>
      {longPutt !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sänkt långputt"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 text-center text-white"
        >
          <ChipCelebration />
          <p className="text-lg font-bold">Vilken putt!</p>
          <strong className="my-4 text-7xl font-black">{longPutt} m</strong>
          <h2 className="text-3xl font-black">Sänkt!</h2>
        </div>
      )}
      {active ? (
        <>
          {active.phase !== "halfway" && (
            <>
              <header className="flex min-h-16 overflow-hidden rounded-2xl border border-blue-600 bg-white shadow-sm">
                <div className="relative flex w-[44%] items-center gap-2 bg-blue-600 px-3 text-white after:absolute after:-right-5 after:top-0 after:h-full after:w-6 after:bg-blue-600 after:[clip-path:polygon(0_0,100%_50%,0_100%)]">
                  <button data-local-navigation aria-label="Tillbaka" onClick={back}>
                    <ArrowLeft />
                  </button>
                  <strong className="truncate">{playerName}</strong>
                </div>
                <div className="flex flex-1 items-center justify-end gap-3 px-3 text-blue-700">
                  <div className="text-center">
                    <strong className="text-2xl">{total} ★</strong>
                    {best !== null && total > best && (
                      <Trophy className="inline h-4 w-4 text-amber-500" />
                    )}
                    <p className="text-[10px] font-bold">AV 16 STJÄRNOR</p>
                  </div>
                  <div className="text-center">
                    <strong className="text-lg">{puttsLabel(active)}</strong>
                    <p className="text-[10px] font-bold">PUTTAR</p>
                  </div>
                </div>
              </header>
              <div className="putt-map">
                <PuttCourseMap holes={active.holes} cursor={index} />
              </div>
            </>
          )}
          {active.phase === "halfway" ? (
            <section className="my-auto space-y-4 rounded-3xl border bg-white p-5 text-center">
              <h1 className="text-2xl font-black">Halfway House</h1>
              <p className="font-bold text-emerald-700">
                {total >= 6
                  ? "Vilken start!"
                  : total >= 3
                    ? "Bra jobbat – fortsätt samla!"
                    : "Bra kämpat – tre nya chanser väntar!"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <strong className="text-3xl text-amber-500">{total} / 8 ★</strong>
                <div>
                  <strong className="text-3xl text-blue-700">{puttsLabel(active)}</strong>
                  <p className="text-sm text-slate-500">puttar</p>
                </div>
              </div>
              {pbGoal && (
                <p className="text-sm text-blue-700">
                  {pbGoal.need === 0
                    ? "Över personbästa – hur högt når du?"
                    : `${pbGoal.need} stjärnor till personbästa.`}
                </p>
              )}
              <button
                className="putt-primary"
                onClick={() => {
                  setConfirmation(null);
                  commit({ type: "continue" });
                  setMoving(true);
                }}
              >
                Spela sista 3 hålen →
              </button>
              <button
                className="min-h-11 text-sm text-slate-500"
                onClick={() => commit({ type: "finish", at: Date.now() })}
              >
                Avsluta halv runda
              </button>
            </section>
          ) : moving ? (
            <section className="rounded-3xl border bg-white p-6 text-center">
              <p className="font-bold text-blue-600">Nästa hål · Hål {index + 1}</p>
              <h1 className="my-4 text-6xl font-black">{COURSE_DISTANCES[index]} m</h1>
              <p className="mb-5 text-slate-500">En boll från den nya platsen.</p>
              <button className="putt-primary" onClick={() => setMoving(false)}>
                Spela hål {index + 1} →
              </button>
            </section>
          ) : (
            <>
              <section className="putt-hole rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-black text-blue-700">Hål {index + 1}</h1>
                    <p className="text-lg font-bold text-slate-500">
                      {COURSE_DISTANCES[index]} m från hålet
                    </p>
                  </div>
                  <strong className="text-blue-700">{holeStars(shots, index)} ★</strong>
                </div>
                <div className="mt-2 flex justify-center">
                  <PuttStars
                    key={`${active.id}-${index}-${shots[0] ?? "empty"}`}
                    count={holeStars(shots, index)}
                    max={maxStars(index)}
                    large
                    zero={shots.length > 0 && holeStars(shots, index) === 0}
                  />
                </div>
                {shots[0] === 1 && (
                  <p className="mt-1 text-center text-xs font-bold text-amber-700">
                    Full pott på hålet!
                  </p>
                )}
              </section>
              <section>
                <h2 className="mb-2 text-center text-lg font-black">Hur många puttar till hål?</h2>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      className={`putt-entry min-h-20 rounded-2xl border-2 text-center disabled:opacity-60 ${shots[0] === p || (p === 4 && shots[0] > 4) ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-800"}`}
                      disabled={active.phase !== "play"}
                      onClick={() => (p === 4 ? setMany(4) : score(p))}
                      aria-label={`${p === 4 ? "4 eller fler" : p} ${p === 1 ? "putt" : "puttar"}`}
                    >
                      <strong className="block text-3xl">{p === 4 ? "4+" : p}</strong>
                      <span className="text-xs">{p === 1 ? "putt" : "puttar"}</span>
                    </button>
                  ))}
                </div>
              </section>
              {confirmation && (
                <div
                  role="status"
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${holeStars(shots, index) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                >
                  <Check className="h-4 w-4" />
                  {confirmation}{" "}
                  {holeStars(shots, index) > 0 ? `+${holeStars(shots, index)} ★` : ""}
                </div>
              )}
              {active.phase === "play" && !(avgGoal || pbGoal || countGoal) && holeGoal && (
                <p className="rounded-xl bg-blue-50 px-3 py-2 text-center text-sm font-bold text-blue-700">
                  {holeGoal}
                </p>
              )}
              {active.phase === "play" && (avgGoal || pbGoal || countGoal) && (
                <div className="rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-bold text-amber-900">
                  {countGoal ??
                    ((avgGoal ?? pbGoal)!.need === 0
                      ? `Över ditt ${avgGoal ? "snitt" : "personbästa"} – fortsätt samla!`
                      : `${(avgGoal ?? pbGoal)!.need} ★ till över ditt ${avgGoal ? "snitt" : "personbästa"}${6 - completed === 1 ? " på sista hålet" : ""}.`)}
                </div>
              )}
              {active.phase === "result" && (
                <>
                  <button
                    className="putt-primary"
                    disabled={pending || longPutt !== null}
                    onClick={() => {
                      setConfirmation(null);
                      commit({ type: "next", at: Date.now() });
                      setMoving(index !== 2 && index !== 5);
                    }}
                  >
                    {index === 5
                      ? "Se rundans resultat"
                      : index === 2
                        ? "Till Halfway House"
                        : `Nästa hål · ${COURSE_DISTANCES[index + 1]} m`}{" "}
                    →
                  </button>
                  <button
                    className="flex min-h-9 items-center justify-center gap-2 text-sm text-slate-500"
                    onClick={() => {
                      setConfirmation(null);
                      setPending(false);
                      if (timer.current) clearTimeout(timer.current);
                      commit({ type: "undo" });
                    }}
                  >
                    <Undo2 className="h-4 w-4" />
                    Ändra antal puttar
                  </button>
                </>
              )}
            </>
          )}
        </>
      ) : view === "result" && round ? (
        <div className="space-y-4 pt-5">
          {(isPB || puttPB || roundTotal === 16) && fresh === round.id && <ChipCelebration />}
          <div className="text-center">
            <p className="text-sm font-bold uppercase text-blue-600">
              {round.status === "full"
                ? "Rundan klar"
                : round.status === "front"
                  ? "Halv runda klar"
                  : "Rundan avslutad"}
            </p>
            <h1 className="mt-2 text-3xl font-black">
              {puttPB
                ? "Nytt puttrekord!"
                : isPB
                  ? "Nytt personbästa!"
                  : beatPuttAverage
                    ? "Under ditt puttsnitt!"
                    : beatAverage
                      ? "Över ditt snitt!"
                      : roundTotal === 16
                        ? "Alla stjärnor!"
                        : "Bra spelat!"}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-3xl bg-white p-4">
              <div>
                <strong className="text-5xl font-black text-amber-500">{roundTotal}</strong>
                <p className="mt-2 text-xs text-slate-500">
                  av {round.holes.reduce((n, _, i) => n + maxStars(i), 0)} stjärnor
                </p>
              </div>
              <div>
                <strong className="text-5xl font-black text-blue-700">{puttsLabel(round)}</strong>
                <p className="mt-2 text-xs text-slate-500">Totalt antal puttar · lägre är bättre</p>
              </div>
            </div>
          </div>
          {round.status === "full" && (
            <>
              {levelUp && fresh === round.id && (
                <PuttMilestones stars={roundTotal} previous={previousBest ?? 0} />
              )}
              <div
                className={`rounded-2xl bg-blue-50 p-4 text-center ${(beatAverage || beatPuttAverage) && fresh === round.id ? "putt-average-win" : ""}`}
              >
                <p className="text-sm font-bold text-blue-700">
                  Ditt rundsnitt · senaste {puttAverage([...before, round]).count}
                </p>
                <strong className="text-2xl text-blue-700">
                  {previousAvg.count ? `${fmt(previousAvg.stars)} → ` : ""}
                  {fmt(puttAverage([...before, round]).stars)} ★
                </strong>
                {exactPutts(round) && (
                  <>
                    <p className="mt-3 text-sm font-bold text-blue-700">
                      Puttsnitt · senaste {puttStats([...before, round]).count}
                    </p>
                    <strong className="text-2xl text-blue-700">
                      {previousPutts.average !== null ? `${fmt(previousPutts.average)} → ` : ""}
                      {fmt(puttStats([...before, round]).average!)} puttar
                    </strong>
                    {beatPuttAverage &&
                      previousPutts.average !== null &&
                      puttStats([...before, round]).average! > previousPutts.average && (
                        <p className="mt-1 text-xs text-slate-500">
                          En äldre runda med färre puttar lämnar snittet.
                        </p>
                      )}
                  </>
                )}
              </div>
            </>
          )}
          <PuttRoundImpact
            round={round}
            before={before}
            userId={userId}
            fresh={fresh === round.id}
          />
          <PuttAnalysis round={round} />
          <p className="text-center text-sm font-semibold text-slate-600">{replay}</p>
          <button className="putt-black" onClick={requestStart}>
            Spela igen
          </button>
          <button
            className="putt-secondary"
            onClick={() => {
              setView("history");
              setFresh(null);
            }}
          >
            Alla rundor
          </button>
          <button data-local-navigation className="putt-secondary" onClick={back}>
            Tillbaka till Puttrundan
          </button>
        </div>
      ) : view === "history" ? (
        <>
          <div className="sticky top-0 z-10 space-y-3 bg-slate-50 pb-3 pt-2">
            <button
              data-local-navigation
              className="flex min-h-11 items-center gap-2 text-blue-700"
              onClick={back}
            >
              <ArrowLeft />
              Tillbaka
            </button>
            <h1 className="text-2xl font-black">Dina rundor</h1>
            {records}
          </div>
          <div className="space-y-3">
            {state.history
              .slice()
              .sort((a, b) => b.finishedAt - a.finishedAt)
              .map((r) => (
                <button
                  key={r.id}
                  className="flex w-full items-center justify-between rounded-2xl border bg-white p-4 text-left"
                  onClick={() => {
                    setReviewId(r.id);
                    setView("result");
                    setFresh(null);
                  }}
                >
                  <span>
                    <strong className="block">
                      {r.status === "full"
                        ? "Hel runda"
                        : r.status === "front"
                          ? "Halv runda"
                          : `${r.holes.length} hål`}
                    </strong>
                    <small className="text-slate-500">
                      {new Date(r.finishedAt).toLocaleDateString("sv-SE")} · Est. HCP{" "}
                      {courseHandicap(r)?.toFixed(1).replace(".", ",") ?? "–"}
                    </small>
                  </span>
                  <span className="text-right">
                    <strong className="block text-xl text-amber-600">{roundStars(r)} ★</strong>
                    <span className="text-sm font-bold text-blue-700">
                      {puttsLabel(r)} puttar →
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <button
              data-local-navigation
              className="flex h-11 w-11 items-center justify-center"
              aria-label="Tillbaka"
              onClick={back}
            >
              <ArrowLeft />
            </button>
            <button className="min-h-11 font-bold text-blue-600" onClick={() => setRules(true)}>
              Så här spelar du
            </button>
          </div>
          <section className="overflow-hidden rounded-3xl border bg-white px-4 pt-5">
            <h1 className="text-2xl font-black">Dags för en puttrunda?</h1>
            <button className="putt-primary mt-4" onClick={requestStart}>
              Starta rundan →
            </button>
            <PuttCourseMap holes={[]} cursor={null} />
          </section>
          <div className="mt-4 rounded-3xl border bg-white p-4">
            <h2 className="font-black">Ditt rundsnitt</h2>
            <p className="mt-2 text-2xl font-black text-blue-700">
              {stats.average === null ? "–" : fmt(stats.average)}{" "}
              <span className="text-sm text-slate-500">puttar · lägre är bättre</span>
            </p>
            <p className="mt-1 text-3xl font-black text-blue-700">
              {average.count ? fmt(average.stars) : "–"}{" "}
              <span className="text-sm text-slate-500">/ 16 ★</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {average.count
                ? `Senaste ${average.count} hela rundorna${average.count < 5 ? " · bygger ditt snitt" : ""}`
                : "Spela din första hela runda."}
            </p>
          </div>
          <div className="mt-4">{records}</div>
          <div className="mt-4">
            <PuttMilestones stars={best ?? 0} />
            <p className="mt-1 text-center text-xs text-slate-500">Din bästa hela runda</p>
          </div>
          <PuttProgress history={state.history} />
          <PuttLeaderboard userId={userId} history={state.history} playerName={playerName} />
          <button className="putt-secondary mt-4" onClick={() => setView("history")}>
            Alla rundor · {state.history.length}
          </button>
        </>
      )}
      {storageError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Resultatet kunde inte sparas på enheten. Håll sidan öppen.{" "}
          <button
            className="ml-1 underline"
            onClick={() => {
              try {
                localStorage.setItem(key, JSON.stringify(stateRef.current));
                setStorageError(false);
                if (userId)
                  void syncPuttRounds(userId)
                    .then(() => setCloud("saved"))
                    .catch(() => setCloud("error"));
              } catch {
                setStorageError(true);
              }
            }}
          >
            Försök spara igen
          </button>
        </p>
      )}
      {!active && (
        <p className="mt-4 text-center text-xs text-slate-400">
          {cloud === "loading"
            ? "Synkar rundor…"
            : cloud === "saved"
              ? "Sparat på ditt konto"
              : cloud === "error"
                ? "Kunde inte synka. Din runda finns kvar på enheten."
                : "Sparas på den här enheten"}
          {cloud === "error" && (
            <button
              className="ml-2 text-blue-600"
              onClick={() => {
                if (userId) {
                  setCloud("loading");
                  void syncPuttRounds(userId)
                    .then(() => setCloud("saved"))
                    .catch(() => setCloud("error"));
                }
              }}
            >
              Försök igen
            </button>
          )}
        </p>
      )}
      <Dialog
        open={many !== null}
        onOpenChange={(v) => {
          if (!v) setMany(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle>Hur många puttar?</DialogTitle>
          <DialogDescription>Välj det faktiska antalet för rätt totalscore.</DialogDescription>
          <div className="flex items-center justify-center gap-6">
            <button
              className="h-12 w-12 rounded-full bg-blue-50 text-2xl disabled:opacity-30"
              aria-label="Färre puttar"
              disabled={many === 4}
              onClick={() => setMany((n) => Math.max(4, (n ?? 4) - 1))}
            >
              −
            </button>
            <strong className="text-5xl">{many}</strong>
            <button
              className="h-12 w-12 rounded-full bg-blue-50 text-2xl disabled:opacity-30"
              aria-label="Fler puttar"
              disabled={many === 99}
              onClick={() => setMany((n) => Math.min(99, (n ?? 4) + 1))}
            >
              +
            </button>
          </div>
          <button className="putt-primary" onClick={() => score(many ?? 4)}>
            Registrera {many} puttar
          </button>
        </DialogContent>
      </Dialog>
      {intro && <PuttOnboarding onDone={finishIntro} onClose={() => setIntro(false)} />}
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle className="text-2xl">Så här spelar du</DialogTitle>
          <DialogDescription className="text-lg">
            En boll. Sex hål. Samla 16 stjärnor.
          </DialogDescription>
          <ol className="space-y-3 text-lg">
            <li>1. Ställ bollen på avståndet som visas.</li>
            <li>2. Putta tills bollen är i hål.</li>
            <li>3. Tryck på antalet puttar.</li>
          </ol>
          <table className="text-center text-sm">
            <thead>
              <tr>
                <th>Avstånd</th>
                <th>1 putt</th>
                <th>2 puttar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2–3 m</td>
                <td>2 ★</td>
                <td>1 ★</td>
              </tr>
              <tr>
                <td>4 m</td>
                <td>3 ★</td>
                <td>1 ★</td>
              </tr>
              <tr>
                <td>8–12 m</td>
                <td>3 ★</td>
                <td>2 ★</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-slate-500">
            3 puttar eller fler: 0 stjärnor. Paus efter tre hål.
          </p>
          <button className="putt-primary" onClick={() => setRules(false)}>
            Jag är med!
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={exit} onOpenChange={setExit}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle>Pausa rundan?</DialogTitle>
          <DialogDescription>Du kan fortsätta från samma hål nästa gång.</DialogDescription>
          <button
            className="putt-primary"
            onClick={() => {
              setExit(false);
              onExit();
            }}
          >
            Pausa och gå tillbaka
          </button>
          <button className="putt-secondary" onClick={() => setExit(false)}>
            Fortsätt spela
          </button>
          <button
            className="min-h-11 text-sm text-slate-500"
            onClick={() => {
              setExit(false);
              commit({ type: "finish", at: Date.now() });
            }}
          >
            Avsluta och spara spelade hål
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
