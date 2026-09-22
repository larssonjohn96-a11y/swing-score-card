import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Trophy, Undo2 } from "lucide-react";
import {
  courseDistances,
  approachAverage,
  approachBests,
  approachGoal,
  averageMiss,
  courseHandicap,
  courseStorageKey,
  emptyCourse,
  holeStars,
  parseCourse,
  reduceCourse,
  roundStars,
  shotMiss,
  starLevel,
  type CourseAction,
  type CourseShot,
} from "@/lib/approach-course";
import { formatApproachResult } from "@/lib/approach-match";
import { handicapLabel } from "@/lib/precision";
import { syncApproachRounds, mergeApproachRounds } from "@/lib/approach-cloud";
import { ApproachCourseMap } from "./approach-course-map";
import { ApproachStars, ApproachMilestones } from "./approach-stars";
import { ApproachRoundEntry } from "./approach-round-entry";
import { ApproachOnboarding } from "./approach-course-onboarding";
import { ApproachLeaderboard } from "./approach-course-leaderboard";
import { ApproachRoundImpact } from "./approach-course-impact";
import { ApproachCourseAnalysis } from "./approach-course-analysis";
import { ApproachProgress } from "./approach-course-progress";
import { ChipCelebration } from "./chip-celebration";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const comments = [
  ["Nästa hål, ny chans!", "Fortsätt – nya stjärnor väntar!"],
  ["En stjärna till!", "Bra jobbat!"],
  ["Snyggt inspel!", "Fin precision!"],
  ["Full pott!", "Vilket inspel!"],
];
export function ApproachRoundGame({
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
    [moving, setMoving] = useState(false),
    [edit, setEdit] = useState<CourseShot | undefined>(),
    [confirmation, setConfirmation] = useState<string | null>(null),
    [storageError, setStorageError] = useState(false),
    [cloud, setCloud] = useState<"local" | "saved" | "loading" | "error">("local");
  const stateRef = useRef(state),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    tap = useRef(0),
    key = courseStorageKey(userId);
  useEffect(() => {
    if (authLoading) return;
    try {
      const restored = parseCourse(localStorage.getItem(key));
      stateRef.current = restored;
      setState(restored);
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
    window.scrollTo(0, 0);
  }, [view, moving, state.active?.phase, state.active?.holes.length]);
  useEffect(() => {
    if (!ready || !userId) return;
    let alive = true;
    const sync = () => {
      setCloud("loading");
      void syncApproachRounds(userId)
        .then(() => {
          if (alive) setCloud("saved");
        })
        .catch(() => {
          if (alive) setCloud("error");
        });
    };
    const update = (e: Event) => {
      if (!alive || (e as CustomEvent).detail?.userId !== userId) return;
      try {
        const restored = parseCourse(localStorage.getItem(key));
        const next = mergeApproachRounds(stateRef.current, restored.history);
        if (JSON.stringify(next.history) === JSON.stringify(stateRef.current.history)) return;
        stateRef.current = next;
        setState(next);
      } catch {
        setStorageError(true);
      }
    };
    window.addEventListener("sg4-approach-cloud-updated", update);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      alive = false;
      window.removeEventListener("sg4-approach-cloud-updated", update);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [ready, userId, key]);
  function sync() {
    if (!userId) return;
    setCloud("loading");
    void syncApproachRounds(userId)
      .then(() => setCloud("saved"))
      .catch(() => setCloud("error"));
  }
  function commit(action: CourseAction) {
    const prev = stateRef.current,
      next = reduceCourse(prev, action);
    if (next === prev) return false;
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
      sync();
    }
    return true;
  }
  function start() {
    setIntro(false);
    setReviewId(null);
    setFresh(null);
    setConfirmation(null);
    setPending(false);
    setMoving(false);
    setEdit(undefined);
    setView("home");
    commit({ type: "start", id: crypto.randomUUID(), at: Date.now() });
  }
  function requestStart() {
    try {
      if (localStorage.getItem(`sg4-approach-intro-v1:${userId ?? "guest"}`) !== "seen") {
        setIntro(true);
        return;
      }
    } catch {}
    start();
  }
  function finishIntro() {
    try {
      localStorage.setItem(`sg4-approach-intro-v1:${userId ?? "guest"}`, "seen");
    } catch {}
    start();
  }
  function score(shot: CourseShot) {
    if (Date.now() < tap.current || stateRef.current.active?.phase !== "play") return;
    tap.current = Date.now() + 400;
    if (!commit({ type: "score", shot })) return;
    setConfirmation(comments[holeStars([shot], index, distances)][(index + state.history.length) % 2]);
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), 1200);
  }
  const distances = courseDistances(state.active);
  const active = state.active,
    index = active ? active.holes.length - 1 : 0,
    shots = active?.holes[index] ?? [],
    round = state.history.find((r) => r.id === reviewId),
    average = approachAverage(state.history),
    best = approachBests(state.history),
    total = active ? roundStars(active) : 0;
  const before = round
    ? state.history.filter(
        (r) =>
          r.id !== round.id &&
          (r.finishedAt < round.finishedAt ||
            (r.finishedAt === round.finishedAt && r.id.localeCompare(round.id) < 0)),
      )
    : [];
  const oldBest = approachBests(before),
    oldAverage = approachAverage(before),
    stars = round ? roundStars(round) : 0;
  const pb = !!round && round.status === "full" && oldBest.stars !== null && stars > oldBest.stars,
    precisionPB =
      !!round &&
      round.status === "full" &&
      oldBest.miss !== null &&
      averageMiss(round) < oldBest.miss;
  const beatAverage =
      !!round && round.status === "full" && oldAverage.count > 0 && stars > oldAverage.stars,
    levelUp =
      !!round && round.status === "full" && starLevel(stars) > starLevel(oldBest.stars ?? 0);
  const goal = active ? approachGoal(active, state.history) : null;
  const replay =
    round?.status !== "full"
      ? "Redo för alla sex hål?"
      : beatAverage
        ? "Över ditt snitt – bygg vidare nästa runda!"
        : oldAverage.count && oldAverage.stars - stars >= 0 && oldAverage.stars - stars <= 2
          ? `${Math.floor(oldAverage.stars) + 1 - stars} stjärnor till över ditt snitt. En runda till?`
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
    } else onExit();
  }
  const records = (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-blue-50 p-4 text-center">
      <div>
        <strong className="block text-2xl text-amber-600">{best.stars ?? "–"} / 18 ★</strong>
        <p className="text-xs text-slate-500">Bästa hela rundan</p>
      </div>
      <div>
        <strong className="block text-2xl text-blue-700">
          {best.miss === null ? "–" : fmt(best.miss)} m
        </strong>
        <p className="text-xs text-slate-500">Lägsta snittavvikelse</p>
      </div>
    </div>
  );
  if (!ready) return <main className="p-8 text-center">Laddar Inspelsrundan…</main>;
  return (
    <main className="approach-game mx-auto min-h-[100dvh] max-w-md bg-slate-50 px-4 pb-5 pt-[max(12px,env(safe-area-inset-top))] text-slate-950">
      <style>{`.approach-primary,.approach-secondary,.approach-black{display:flex;min-height:52px;width:100%;align-items:center;justify-content:center;border-radius:16px;padding:12px 16px;font-weight:800}.approach-primary{background:#2563eb;color:white}.approach-black{background:#111827;color:white}.approach-secondary{border:1px solid #e2e8f0;background:white;color:#1e40af}.approach-primary:disabled{opacity:.4}.approach-star{animation:approachStar .55s ease-out both}.approach-level-up{transform-origin:bottom;animation:approachLevel .8s ease-out both}.approach-average-win{animation:approachWin 1s ease-out 2}.approach-playing{display:flex;flex-direction:column;gap:8px}.approach-playing .approach-map>div{height:145px;margin:0}.approach-playing .approach-map-hole{transform:scale(.72)}.approach-playing .approach-map-golfer{transform:translateY(16px) scale(.7)}.approach-playing .approach-hole svg{height:36px;width:36px}@keyframes approachStar{0%{opacity:0;transform:scale(.4)}65%{transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}@keyframes approachLevel{from{transform:scaleY(.25)}to{transform:scaleY(1)}}@keyframes approachWin{50%{box-shadow:0 0 20px #60a5fa66;transform:scale(1.02)}}@media(max-height:700px){.approach-playing .approach-map>div{height:125px}.approach-playing{gap:6px}}@media(prefers-reduced-motion:reduce){.approach-star,.approach-level-up,.approach-average-win{animation:none}}`}</style>
      {active ? (
        <div className="approach-playing">
          {active.phase !== "halfway" && (
            <>
              <header className="flex min-h-16 overflow-hidden rounded-2xl border border-blue-600 bg-white shadow-sm">
                <div className="relative flex w-[44%] items-center gap-2 bg-blue-600 px-3 text-white after:absolute after:-right-5 after:top-0 after:h-full after:w-6 after:bg-blue-600 after:[clip-path:polygon(0_0,100%_50%,0_100%)]">
                  <button data-local-navigation aria-label="Tillbaka" onClick={back}>
                    <ArrowLeft />
                  </button>
                  <strong className="truncate">{playerName}</strong>
                </div>
                <div className="flex flex-1 items-center justify-end gap-4 px-3 text-blue-700">
                  <div className="text-center">
                    <strong className="text-2xl">{total} ★</strong>
                    {best.stars !== null && total > best.stars && (
                      <Trophy className="inline h-4 w-4 text-amber-500" />
                    )}
                    <p className="text-[10px] font-bold">AV 18 STJÄRNOR</p>
                  </div>
                  <div className="text-center">
                    <strong className="text-xl">
                      {active.holes.filter((h) => h.length).length}/6
                    </strong>
                    <p className="text-[10px] font-bold">HÅL</p>
                  </div>
                </div>
              </header>
              <div className="approach-map">
                <ApproachCourseMap holes={active.holes} distances={distances} cursor={index} />
              </div>
            </>
          )}
          {active.phase === "halfway" ? (
            <section className="my-12 space-y-4 rounded-3xl border bg-white p-5 text-center">
              <h1 className="text-2xl font-black">Halfway House</h1>
              <p className="font-bold text-emerald-700">
                {total >= 6
                  ? "Vilken start!"
                  : total >= 3
                    ? "Bra jobbat – fortsätt samla!"
                    : "Bra kämpat – tre nya chanser väntar!"}
              </p>
              <strong className="block text-4xl text-amber-500">{total} / 9 ★</strong>
              {goal && <p className="text-sm text-blue-700">{goal}</p>}
              <button
                className="approach-primary"
                onClick={() => {
                  setConfirmation(null);
                  setEdit(undefined);
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
            <section className="space-y-4 rounded-3xl border bg-white p-6 text-center">
              <p className="font-bold text-blue-600">Nästa hål · Hål {index + 1}</p>
              <h1 className="text-6xl font-black">{distances[index]} m</h1>
              <p className="text-slate-500">Ett slag mot det nya målet.</p>
              <button className="approach-primary" onClick={() => setMoving(false)}>
                Spela hål {index + 1} →
              </button>
            </section>
          ) : (
            <>
              <section className="approach-hole rounded-3xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-black text-blue-700">Hål {index + 1}</h1>
                  <strong className="text-xl text-slate-700">
                    Mål {distances[index]} m
                  </strong>
                </div>
                <div className="mt-1 flex justify-center">
                  <ApproachStars
                    key={`${active.id}-${index}-${shots.length}`}
                    count={holeStars(shots, index, distances)}
                    large
                    zero={shots.length === 1 && holeStars(shots, index, distances) === 0}
                  />
                </div>
              </section>
              {active.phase === "play" ? (
                <ApproachRoundEntry
                  key={`${active.id}-${index}`}
                  target={distances[index]}
                  initial={edit}
                  onScore={score}
                />
              ) : (
                <>
                  <div
                    role="status"
                    className={`rounded-2xl p-4 text-center ${holeStars(shots, index, distances) ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                  >
                    <p className="flex items-center justify-center gap-2 font-bold">
                      <Check className="h-4 w-4" />
                      {confirmation ?? "Slaget är registrerat"}
                    </p>
                    <strong className="mt-2 block text-3xl">
                      {fmt(shotMiss(shots[0], index, distances))} m
                    </strong>
                    <p className="text-sm">från målet · +{holeStars(shots, index, distances)} ★</p>
                    <p className="mt-2 text-xs">{formatApproachResult(shots[0])}</p>
                  </div>
                  <button
                    className="approach-primary"
                    disabled={pending}
                    onClick={() => {
                      setConfirmation(null);
                      setEdit(undefined);
                      commit({ type: "next", at: Date.now() });
                      setMoving(index !== 2 && index !== 5);
                    }}
                  >
                    {index === 5
                      ? "Se rundans resultat"
                      : index === 2
                        ? "Till Halfway House"
                        : `Nästa hål · ${distances[index + 1]} m`}{" "}
                    →
                  </button>
                  <button
                    className="flex min-h-11 items-center justify-center gap-2 text-sm text-slate-500"
                    onClick={() => {
                      setEdit(shots[0]);
                      if (timer.current) clearTimeout(timer.current);
                      tap.current = 0;
                      setPending(false);
                      setConfirmation(null);
                      commit({ type: "undo" });
                    }}
                  >
                    <Undo2 className="h-4 w-4" />
                    Ändra slag
                  </button>
                </>
              )}
              {goal && active.phase === "play" && (
                <p className="rounded-xl bg-amber-100 px-3 py-2 text-center text-sm font-bold text-amber-900">
                  {goal}
                </p>
              )}
            </>
          )}
        </div>
      ) : view === "result" && round ? (
        <div className="space-y-4 pt-5">
          {(pb || stars === 18) && fresh === round.id && <ChipCelebration />}
          <div className="text-center">
            <p className="text-sm font-bold uppercase text-blue-600">
              {round.status === "full"
                ? "Rundan klar"
                : round.status === "front"
                  ? "Halv runda klar"
                  : "Rundan avslutad"}
            </p>
            <h1 className="mt-2 text-3xl font-black">
              {pb
                ? "Nytt personbästa!"
                : stars === 18
                  ? "Alla stjärnor!"
                  : precisionPB
                    ? "Din bästa precision!"
                    : beatAverage
                      ? "Över ditt snitt!"
                      : "Bra spelat!"}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-3xl bg-white p-4">
              <div>
                <strong className="text-5xl font-black text-amber-500">{stars}</strong>
                <p className="mt-2 text-xs text-slate-500">av {round.holes.length * 3} stjärnor</p>
              </div>
              <div>
                <strong className="text-4xl font-black text-blue-700">
                  {fmt(averageMiss(round))} m
                </strong>
                <p className="mt-2 text-xs text-slate-500">Snittavvikelse från målet</p>
              </div>
            </div>
          </div>
          {round.status === "full" && (
            <>
              {levelUp && fresh === round.id && (
                <ApproachMilestones stars={stars} previous={oldBest.stars ?? 0} />
              )}
              <div
                className={`rounded-2xl bg-blue-50 p-4 text-center ${(beatAverage || precisionPB) && fresh === round.id ? "approach-average-win" : ""}`}
              >
                <p className="text-sm font-bold text-blue-700">
                  Rundsnitt · senaste {approachAverage([...before, round]).count}
                </p>
                <strong className="text-2xl text-blue-700">
                  {oldAverage.count ? `${fmt(oldAverage.stars)} → ` : ""}
                  {fmt(approachAverage([...before, round]).stars)} ★
                </strong>
              </div>
            </>
          )}
          <ApproachRoundImpact
            round={round}
            before={before}
            userId={userId}
            fresh={fresh === round.id}
          />
          <ApproachCourseAnalysis round={round} />
          <p className="text-center text-sm font-semibold text-slate-600">{replay}</p>
          <button className="approach-black" onClick={requestStart}>
            Spela igen · 6 slag
          </button>
          <button
            className="approach-secondary"
            onClick={() => {
              setView("history");
              setFresh(null);
            }}
          >
            Alla rundor
          </button>
          <button data-local-navigation className="approach-secondary" onClick={back}>
            Tillbaka till Inspelsrundan
          </button>
        </div>
      ) : view === "history" ? (
        <>
          <div className="sticky top-0 z-10 space-y-3 bg-slate-50 pb-3">
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
          {state.history
            .slice()
            .sort((a, b) => b.finishedAt - a.finishedAt)
            .map((r) => (
              <button
                key={r.id}
                className="mb-3 flex w-full items-center justify-between gap-2 rounded-2xl border bg-white p-4 text-left"
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
                    {courseHandicap(r) === null ? "–" : handicapLabel(courseHandicap(r)!)}
                  </small>
                </span>
                <span className="text-right">
                  <strong className="block text-xl text-amber-600">{roundStars(r)} ★</strong>
                  <span className="text-xs text-blue-700">{fmt(averageMiss(r))} m i snitt →</span>
                </span>
              </button>
            ))}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <button
              data-local-navigation
              aria-label="Tillbaka"
              className="flex h-11 w-11 items-center justify-center"
              onClick={back}
            >
              <ArrowLeft />
            </button>
            <button className="min-h-11 font-bold text-blue-600" onClick={() => setRules(true)}>
              Så här spelar du
            </button>
          </div>
          <section className="rounded-3xl border bg-white px-4 pt-5">
            <h1 className="text-2xl font-black">Dags för en inspelsrunda?</h1>
            <button className="approach-primary mt-4" onClick={requestStart}>
              Starta rundan →
            </button>
            <p className="mt-3 text-center text-sm text-slate-500">Nya slumpade avstånd varje runda.</p>
            <ApproachCourseMap holes={[]} cursor={null} />
          </section>
          <div className="mt-4 rounded-3xl border bg-white p-4">
            <h2 className="font-black">Ditt rundsnitt</h2>
            <p className="mt-2 text-3xl font-black text-blue-700">
              {average.count ? fmt(average.stars) : "–"}{" "}
              <span className="text-sm text-slate-500">/ 18 ★</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {average.count
                ? `Senaste ${average.count} hela rundorna`
                : "Spela din första hela runda."}
            </p>
          </div>
          <div className="mt-4">
            <ApproachMilestones stars={best.stars ?? 0} />
            <p className="mt-1 text-center text-xs text-slate-500">Din bästa hela runda</p>
          </div>
          <ApproachProgress history={state.history} />
          <div className="mt-4">{records}</div>
          <ApproachLeaderboard userId={userId} history={state.history} playerName={playerName} />
          <button className="approach-secondary mt-4" onClick={() => setView("history")}>
            Alla rundor · {state.history.length}
          </button>
        </>
      )}
      {storageError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Kunde inte spara på enheten. Håll sidan öppen.{" "}
          <button
            className="underline"
            onClick={() => {
              try {
                localStorage.setItem(key, JSON.stringify(stateRef.current));
                setStorageError(false);
                sync();
              } catch {
                setStorageError(true);
              }
            }}
          >
            Försök igen
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
                ? "Kunde inte synka. Resultatet finns kvar på enheten."
                : "Sparas på den här enheten"}
          {cloud === "error" && (
            <button className="ml-2 text-blue-600" onClick={sync}>
              Försök igen
            </button>
          )}
        </p>
      )}
      {intro && <ApproachOnboarding onDone={finishIntro} onClose={() => setIntro(false)} />}
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle className="text-2xl">Så här spelar du</DialogTitle>
          <DialogDescription className="text-lg">Sex hål. Ett slag på varje.</DialogDescription>
          <ol className="space-y-3 text-lg">
            <li>1. Sikta på avståndet som visas.</li>
            <li>2. Ange total längd och sidled.</li>
            <li>3. Samla stjärnor – ju närmare, desto fler.</li>
          </ol>
          <div className="space-y-2 text-sm">
            <p>Högst 5 m från målet: 3 ★</p>
            <p>Över 5–10 m: 2 ★</p>
            <p>Över 10–20 m: 1 ★</p>
            <p>Över 20 m: 0 ★</p>
          </div>
          <p className="text-sm text-slate-500">
            Appen räknar ut avståndet till målet från längd och sidled. Paus efter tre hål.
          </p>
          <button className="approach-primary" onClick={() => setRules(false)}>
            Jag är med!
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={exit} onOpenChange={setExit}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle>Pausa rundan?</DialogTitle>
          <DialogDescription>
            Dina registrerade slag finns kvar. Du fortsätter från samma hål nästa gång.
          </DialogDescription>
          <button
            className="approach-primary"
            onClick={() => {
              setExit(false);
              onExit();
            }}
          >
            Pausa och gå tillbaka
          </button>
          <button className="approach-secondary" onClick={() => setExit(false)}>
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
