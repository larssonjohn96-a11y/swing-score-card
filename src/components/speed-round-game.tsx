import { SpeedDistancePotential } from "@/components/speed-distance-potential";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Trophy, Undo2 } from "lucide-react";
import {
  referenceSpeed,
  roundPoints,
  shotPoints,
  objectiveResult,
  speedAverage,
  speedBests,
  speedGoal,
  courseHandicap,
  courseStorageKey,
  emptyCourse,
  holeStars,
  parseCourse,
  reduceCourse,
  roundStars,
  starLevel,
  type CourseAction,
  type CourseShot,
} from "@/lib/speed-course";
import { formatSpeedResult } from "@/lib/speed-course";
import { handicapLabel } from "@/lib/precision";
import { syncSpeedRounds, mergeSpeedRounds } from "@/lib/speed-cloud";
import { SpeedCourseMap } from "./speed-course-map";
import { SpeedStars, SpeedMilestones } from "./speed-stars";
import { SpeedRoundEntry } from "./speed-round-entry";
import { SpeedOnboarding } from "./speed-course-onboarding";
import { SpeedLeaderboard } from "./speed-course-leaderboard";
import { SpeedRoundImpact } from "./speed-course-impact";
import { SpeedCourseAnalysis } from "./speed-course-analysis";
import { SpeedProgress } from "./speed-course-progress";
import { ChipCelebration } from "./chip-celebration";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const comments = [
  ["Nästa slag, ny chans!", "Fortsätt – nya stjärnor väntar!"],
  ["Bra jobbat!", "Fortsätt samla!"],
  ["Fin fart!", "Snyggt slag!"],
  ["Full fart – full pott!", "Vilken hastighet!"],
];
export function SpeedRoundGame({
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
    [calibrating, setCalibrating] = useState(false),
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
      void syncSpeedRounds(userId)
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
        const next = mergeSpeedRounds(stateRef.current, restored.history);
        if (JSON.stringify(next.history) === JSON.stringify(stateRef.current.history)) return;
        stateRef.current = next;
        setState(next);
      } catch {
        setStorageError(true);
      }
    };
    window.addEventListener("sg4-speed-cloud-updated", update);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      alive = false;
      window.removeEventListener("sg4-speed-cloud-updated", update);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [ready, userId, key]);
  function sync() {
    if (!userId) return;
    setCloud("loading");
    void syncSpeedRounds(userId)
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
    if (referenceSpeed(stateRef.current) === null) {
      setIntro(false);
      setCalibrating(true);
      return;
    }
    setCalibrating(false);
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
      if (localStorage.getItem(`sg4-speed-intro-v1:${userId ?? "guest"}`) !== "seen") {
        setIntro(true);
        return;
      }
    } catch {}
    start();
  }
  function finishIntro() {
    try {
      localStorage.setItem(`sg4-speed-intro-v1:${userId ?? "guest"}`, "seen");
    } catch {}
    start();
  }
  function score(shot: CourseShot) {
    if (Date.now() < tap.current || stateRef.current.active?.phase !== "play") return;
    tap.current = Date.now() + 400;
    if (!commit({ type: "score", shot })) return;
    setConfirmation(
      comments[Math.floor(holeStars([shot], index, stateRef.current.active!.reference))][
        (index + state.history.length) % 2
      ],
    );
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), 1200);
  }
  const active = state.active,
    index = active ? active.holes.length - 1 : 0,
    shots = active?.holes[index] ?? [],
    round = state.history.find((r) => r.id === reviewId),
    average = speedAverage(state.history),
    best = speedBests(state.history),
    reference = referenceSpeed(state),
    total = active ? roundStars(active) : 0;
  const before = round
    ? state.history.filter(
        (r) =>
          r.id !== round.id &&
          (r.finishedAt < round.finishedAt ||
            (r.finishedAt === round.finishedAt && r.id.localeCompare(round.id) < 0)),
      )
    : [];
  const oldBest = speedBests(before),
    oldAverage = speedAverage(before),
    stars = round ? roundStars(round) : 0;
  const pb =
    !!round &&
    round.status === "full" &&
    ((oldBest.points !== null && roundPoints(round) > oldBest.points) ||
      (oldBest.top !== null && objectiveResult(round).topBallSpeed > oldBest.top));
  const beatAverage =
      !!round &&
      round.status === "full" &&
      oldAverage.count > 0 &&
      roundPoints(round) > oldAverage.points,
    levelUp =
      !!round && round.status === "full" && starLevel(stars) > starLevel(oldBest.stars ?? 0);
  const goal = active ? speedGoal(active, state.history) : null;
  const replay =
    round?.status !== "full"
      ? "Redo för alla sex slag?"
      : beatAverage
        ? "Över ditt snitt – bygg vidare nästa runda!"
        : oldAverage.count &&
            oldAverage.points - roundPoints(round!) >= 0 &&
            oldAverage.points - roundPoints(round!) <= 3
          ? `${Math.floor(oldAverage.points) + 1 - roundPoints(round!)} speedpoäng till över ditt snitt. En runda till?`
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
        <p className="text-xs text-slate-500">Personligt stjärnrekord</p>
      </div>
      <div>
        <strong className="block text-2xl text-blue-700">
          {best.points === null ? "–" : best.points}
        </strong>
        <p className="text-xs text-slate-500">Bästa speedpoäng · max 100</p>
      </div>
      <p className="col-span-2 text-sm text-blue-700">
        Snabbaste slag: <strong>{best.top === null ? "–" : fmt(best.top)} mph</strong>
      </p>
    </div>
  );
  if (!ready) return <main className="p-8 text-center">Laddar Speedrundan…</main>;
  return (
    <main className="speed-game mx-auto min-h-[100dvh] max-w-md bg-slate-50 px-4 pb-5 pt-[max(12px,env(safe-area-inset-top))] text-slate-950">
      <style>{`.speed-primary,.speed-secondary,.speed-black{display:flex;min-height:52px;width:100%;align-items:center;justify-content:center;border-radius:16px;padding:12px 16px;font-weight:800}.speed-primary{background:#2563eb;color:white}.speed-black{background:#111827;color:white}.speed-secondary{border:1px solid #e2e8f0;background:white;color:#1e40af}.speed-primary:disabled{opacity:.4}.speed-star{animation:speedStar .55s ease-out both}.speed-level-up{transform-origin:bottom;animation:speedLevel .8s ease-out both}.speed-average-win{animation:speedWin 1s ease-out 2}.speed-playing{display:flex;flex-direction:column;gap:8px}.speed-playing .speed-map>div{height:145px;margin:0}.speed-playing .speed-map-hole{transform:scale(.72)}.speed-playing .speed-map-golfer{transform:translateY(16px) scale(.7)}.speed-playing .speed-hole .speed-star,.speed-playing .speed-hole span.relative.inline-block{height:36px;width:36px}.speed-playing .speed-hole svg{height:36px;width:36px}@keyframes speedStar{0%{opacity:0;transform:scale(.4)}65%{transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}@keyframes speedLevel{from{transform:scaleY(.25)}to{transform:scaleY(1)}}@keyframes speedWin{50%{box-shadow:0 0 20px #60a5fa66;transform:scale(1.02)}}@media(max-height:700px){.speed-playing .speed-map>div{height:125px}.speed-playing{gap:6px}}@media(prefers-reduced-motion:reduce){.speed-star,.speed-level-up,.speed-average-win{animation:none}}`}</style>
      {calibrating && !active ? (
        <section className="space-y-4 rounded-3xl border bg-white p-5">
          <button
            data-local-navigation
            className="speed-secondary"
            onClick={() => setCalibrating(false)}
          >
            Tillbaka
          </button>
          <h1 className="text-2xl font-black">Hitta din referenshastighet</h1>
          <p>Slå tre vanliga drivers efter uppvärmningen. Läs av bollhastigheten på din mätare.</p>
          <p className="font-bold text-blue-700">
            Kalibreringsslag {state.calibration.length + 1} av 3
          </p>
          <SpeedRoundEntry
            key={`calibration-${state.calibration.length}`}
            target={0}
            calibration
            onScore={(shot) => {
              commit({ type: "calibrate", length: shot.ballSpeed });
              if (referenceSpeed(stateRef.current) !== null) start();
            }}
          />
          <p className="text-sm text-slate-500">
            Stjärnorna följer din hastighet. Speedpoängen är samma för alla. Kalibreringen räknas
            inte i rundan.
          </p>
        </section>
      ) : active ? (
        <div className="speed-playing">
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
                    <strong className="text-2xl">{String(total).replace(".", ",")} ★</strong>
                    {best.stars !== null && total > best.stars && (
                      <Trophy className="inline h-4 w-4 text-amber-500" />
                    )}
                    <p className="text-[10px] font-bold">PERSONLIGA ★</p>
                  </div>
                  <div className="text-center">
                    <strong className="text-xl">
                      {active.holes.filter((h) => h.length).length}/6
                    </strong>
                    <p className="text-[10px] font-bold">SLAG</p>
                  </div>
                </div>
              </header>
              <div className="speed-map">
                <SpeedCourseMap holes={active.holes} cursor={index} reference={active.reference} />
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
                className="speed-primary"
                onClick={() => {
                  setConfirmation(null);
                  setEdit(undefined);
                  commit({ type: "continue" });
                  setMoving(true);
                }}
              >
                Spela sista 3 slagen →
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
              <p className="font-bold text-blue-600">Nästa slag · Slag {index + 1}</p>
              <h1 className="text-5xl font-black">Hitta farten</h1>
              <p className="text-slate-500">Redo för nästa slag?</p>
              <button className="speed-primary" onClick={() => setMoving(false)}>
                Spela slag {index + 1} →
              </button>
            </section>
          ) : (
            <>
              <section className="speed-hole rounded-3xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-black text-blue-700">Slag {index + 1}</h1>
                  <strong className="text-lg text-slate-700">Bollhastighet</strong>
                </div>
                <div className="mt-1 flex justify-center">
                  <SpeedStars
                    key={`${active.id}-${index}-${shots.length}`}
                    count={holeStars(shots, index, active.reference)}
                    large
                    zero={shots.length === 1 && holeStars(shots, index, active.reference) === 0}
                  />
                </div>
              </section>
              {active.phase === "play" ? (
                <SpeedRoundEntry
                  key={`${active.id}-${index}`}
                  target={active.reference}
                  initial={edit}
                  onScore={score}
                />
              ) : (
                <>
                  <div
                    role="status"
                    className={`rounded-2xl p-4 text-center ${holeStars(shots, index, active.reference) ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                  >
                    <p className="flex items-center justify-center gap-2 font-bold">
                      <Check className="h-4 w-4" />
                      {confirmation ?? "Slaget är registrerat"}
                    </p>
                    <strong className="mt-2 block text-3xl">{shotPoints(shots[0])} p</strong>
                    <p className="text-sm">
                      speedpoäng · +
                      {String(holeStars(shots, index, active.reference)).replace(".", ",")} ★
                    </p>
                    <p className="mt-2 text-xs">{formatSpeedResult(shots[0])}</p>
                  </div>
                  <button
                    className="speed-primary"
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
                        : `Nästa slag · ${index + 2}`}{" "}
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
                  : beatAverage
                    ? "Över ditt snitt!"
                    : "Bra spelat!"}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-3xl bg-white p-4">
              <div>
                <strong className="text-5xl font-black text-amber-500">
                  {String(stars).replace(".", ",")}
                </strong>
                <p className="mt-2 text-xs text-slate-500">av {round.holes.length * 3} stjärnor</p>
              </div>
              <div>
                <strong className="text-4xl font-black text-blue-700">{roundPoints(round)}</strong>
                <p className="mt-2 text-xs text-slate-500">Speedpoäng · max 100</p>
              </div>
            </div>
          </div>
          {round.status === "full" && (
            <>
              {levelUp && fresh === round.id && (
                <SpeedMilestones stars={stars} previous={oldBest.stars ?? 0} />
              )}
              <div
                className={`rounded-2xl bg-blue-50 p-4 text-center ${beatAverage && fresh === round.id ? "speed-average-win" : ""}`}
              >
                <p className="text-sm font-bold text-blue-700">
                  Rundsnitt · senaste {speedAverage([...before, round]).count}
                </p>
                <strong className="text-2xl text-blue-700">
                  {oldAverage.count ? `${fmt(oldAverage.points)} → ` : ""}
                  {fmt(speedAverage([...before, round]).points)} p
                </strong>
              </div>
            </>
          )}
          <SpeedRoundImpact
            round={round}
            before={before}
            userId={userId}
            fresh={fresh === round.id}
          />
          <p className="text-center text-sm text-slate-500">
            {fmt(objectiveResult(round).avgBallSpeed)} mph i snitt ·{" "}
            {fmt(objectiveResult(round).topBallSpeed)} mph topp
            <br />
            Personlig referens: {fmt(round.reference)} mph
          </p>
          <SpeedDistancePotential ballSpeed={objectiveResult(round).topBallSpeed} />
          <SpeedCourseAnalysis round={round} />
          <p className="text-center text-sm font-semibold text-slate-600">{replay}</p>
          <button className="speed-black" onClick={requestStart}>
            Spela igen · 6 slag
          </button>
          <button
            className="speed-secondary"
            onClick={() => {
              setView("history");
              setFresh(null);
            }}
          >
            Alla rundor
          </button>
          <button data-local-navigation className="speed-secondary" onClick={back}>
            Tillbaka till Speedrundan
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
                        : `${r.holes.length} slag`}
                  </strong>
                  <small className="text-slate-500">
                    {new Date(r.finishedAt).toLocaleDateString("sv-SE")} · Est. HCP{" "}
                    {courseHandicap(r) === null ? "–" : handicapLabel(courseHandicap(r)!)}
                  </small>
                </span>
                <span className="text-right">
                  <strong className="block text-xl text-amber-600">{roundStars(r)} ★</strong>
                  <span className="text-xs text-blue-700">{roundPoints(r)} speedpoäng →</span>
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
          <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white">
            <div className="relative h-52 overflow-hidden bg-slate-900">
              <img src="/Off_the_tee.png" alt="" className="h-full w-full object-cover object-[18%_50%]" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/75">Ball Speed Challenge</p>
                <h1 className="mt-1 font-display text-[40px] leading-none">Hur hårt kan du slå?</h1>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm leading-relaxed text-slate-600">
                Sex slag. Läs av bollhastigheten och försök slå ditt eget rekord. Ju mer fart, desto fler stjärnor.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-3"><strong className="block text-xl">6</strong><span className="text-xs text-slate-500">slag</span></div>
                <div className="rounded-2xl bg-slate-50 p-3"><strong className="block text-xl">18 ★</strong><span className="text-xs text-slate-500">max</span></div>
              </div>
              {reference !== null && (
                <p className="mt-3 text-center text-xs text-slate-500">Din referens: {fmt(reference)} mph</p>
              )}
              <button className="speed-primary mt-4" onClick={requestStart}>Spela →</button>
            </div>
          </section>
          <div className="mt-4 rounded-3xl border bg-white p-4">
            <h2 className="font-black">Ditt rundsnitt</h2>
            <p className="mt-2 text-3xl font-black text-blue-700">
              {average.count ? fmt(average.points) : "–"}{" "}
              <span className="text-sm text-slate-500">speedpoäng</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {average.count
                ? `Senaste ${average.count} hela rundorna`
                : "Spela din första hela runda."}
            </p>
          </div>
          <div className="mt-4">
            <SpeedMilestones stars={best.stars ?? 0} />
            <p className="mt-1 text-center text-xs text-slate-500">Din bästa hela runda</p>
          </div>
          <SpeedProgress history={state.history} />
          <div className="mt-4">{records}</div>
          <SpeedLeaderboard userId={userId} history={state.history} playerName={playerName} />
          <button className="speed-secondary mt-4" onClick={() => setView("history")}>
            Alla rundor · {state.history.length}
          </button>
        </>
      )}
      {storageError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Kunde inte spara på enheten. Slagl sidan öppen.{" "}
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
      {intro && <SpeedOnboarding onDone={finishIntro} onClose={() => setIntro(false)} />}
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle className="text-2xl">Så här spelar du</DialogTitle>
          <DialogDescription className="text-lg">
            Sex slag med driver. Läs av bollhastigheten.
          </DialogDescription>
          <ol className="space-y-3 text-lg">
            <li>1. Värm upp och slå med driver.</li>
            <li>2. Ange bollhastigheten från din mätare.</li>
            <li>3. Samla stjärnor mot din egen hastighet.</li>
          </ol>
          <div className="space-y-2 text-sm">
            <p>80 / 90 / 95 / 98 / 100 % av din referens:</p>
            <p>1 / 1,5 / 2 / 2,5 / 3 ★. Under 80 %: 0 ★.</p>
          </div>
          <p className="text-sm text-slate-500">
            Speedpoäng (0–100) bygger på snittets faktiska bollhastighet. Samma skala för alla. Din
            personliga referens är medianen från senaste fem hela rundorna och låses före start. Du
            behöver en hastighetsmätare.
          </p>
          <button className="speed-primary" onClick={() => setRules(false)}>
            Jag är med!
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={exit} onOpenChange={setExit}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle>Pausa rundan?</DialogTitle>
          <DialogDescription>
            Dina registrerade slag finns kvar. Du fortsätter från samma slag nästa gång.
          </DialogDescription>
          <button
            className="speed-primary"
            onClick={() => {
              setExit(false);
              onExit();
            }}
          >
            Pausa och gå tillbaka
          </button>
          <button className="speed-secondary" onClick={() => setExit(false)}>
            Fortsätt spela
          </button>
          <button
            className="min-h-11 text-sm text-slate-500"
            onClick={() => {
              setExit(false);
              commit({ type: "finish", at: Date.now() });
            }}
          >
            Avsluta och spara spelade slag
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
