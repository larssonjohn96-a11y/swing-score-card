import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Flag, Trophy, Undo2 } from "lucide-react";
import {
  BUNKER_ZONES,
  bunkerAverage,
  bunkerBests,
  bunkerGoal,
  courseHandicap,
  courseStorageKey,
  emptyCourse,
  formatStars,
  holePoints,
  holeStars,
  parseCourse,
  reduceCourse,
  roundPoints,
  roundStars,
  starLevel,
  type CourseAction,
} from "@/lib/bunker-course";
import { handicapLabel } from "@/lib/bunker";
import { mergeBunkerRounds, syncBunkerRounds } from "@/lib/bunker-cloud";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { BunkerStars, BunkerMilestones } from "./bunker-stars";
import { BunkerAnalysis } from "./bunker-analysis";
import { BunkerLeaderboard } from "./bunker-leaderboard";
import { BunkerProgress } from "./bunker-progress";
import { BunkerOnboarding } from "./bunker-onboarding";
import { BunkerRoundImpact } from "./bunker-round-impact";
import { ChipCelebration } from "./chip-celebration";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
const comments = [
  ["Nästa boll, ny chans!", "Fortsätt – greenen väntar!", "Redo för nästa!"],
  ["På green!", "Fin greenträff!", "Bra jobbat!"],
  ["Snyggt nära!", "Bra kontroll!", "Fint bunkerslag!"],
  ["Riktigt nära!", "Vilket bunkerslag!", "Utmärkt precision!"],
  ["Sänkt!", "Rakt i koppen!", "Vilken fullträff!"],
];
function BunkerScene({ second = false }: { second?: boolean }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-3xl bg-emerald-100">
      <img
        src="/bunker-round.svg"
        alt="Golfare i en bunker vid greenen"
        className="h-48 w-full object-cover object-[50%_20%]"
      />
      <div className="absolute bottom-3 left-3 right-3 flex gap-2">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={`flex-1 rounded-xl px-3 py-2 text-center text-sm font-bold ${n === (second ? 2 : 1) ? "bg-blue-600 text-white" : "bg-white/90 text-emerald-900"}`}
          >
            Omgång {n} · 3 bollar
          </span>
        ))}
      </div>
    </div>
  );
}
export function BunkerRoundGame({
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
    [registering, setRegistering] = useState(false),
    [pending, setPending] = useState(false),
    [confirmation, setConfirmation] = useState<{ points: number; text: string } | null>(null),
    [holed, setHoled] = useState(false),
    [storageError, setStorageError] = useState(false),
    [cloud, setCloud] = useState<"local" | "saved" | "loading" | "error">("local");
  const stateRef = useRef(state),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    tap = useRef(0),
    key = courseStorageKey(userId);
  useChipScreenColor(holed);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, registering, state.active?.phase, state.active?.holes.length]);
  useEffect(() => {
    if (!holed) return;
    const t = setTimeout(() => setHoled(false), 2700);
    return () => clearTimeout(t);
  }, [holed]);
  useEffect(() => {
    if (authLoading) return;
    try {
      const restored = parseCourse(localStorage.getItem(key));
      stateRef.current = restored;
      setState(restored);
      setRegistering(!!restored.active?.holes.at(-1)?.length);
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
      void syncBunkerRounds(userId)
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
        const next = mergeBunkerRounds(stateRef.current, restored.history);
        if (JSON.stringify(next.history) === JSON.stringify(stateRef.current.history)) return;
        stateRef.current = next;
        setState(next);
      } catch {
        setStorageError(true);
      }
    };
    window.addEventListener("sg4-bunker-cloud-updated", update);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      alive = false;
      window.removeEventListener("sg4-bunker-cloud-updated", update);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [ready, userId, key]);
  function sync() {
    if (!userId) return;
    setCloud("loading");
    void syncBunkerRounds(userId)
      .then(() => setCloud("saved"))
      .catch(() => setCloud("error"));
  }
  function commit(action: CourseAction) {
    const prev = stateRef.current,
      next = reduceCourse(prev, action);
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
      sync();
    }
  }
  function start() {
    setIntro(false);
    setReviewId(null);
    setFresh(null);
    setConfirmation(null);
    setPending(false);
    setRegistering(false);
    setView("home");
    commit({ type: "start", id: crypto.randomUUID(), at: Date.now() });
  }
  function requestStart() {
    try {
      if (localStorage.getItem(`sg4-bunker-intro-v1:${userId ?? "guest"}`) !== "seen") {
        setIntro(true);
        return;
      }
    } catch {}
    start();
  }
  function finishIntro() {
    try {
      localStorage.setItem(`sg4-bunker-intro-v1:${userId ?? "guest"}`, "seen");
    } catch {}
    start();
  }
  function score(points: number) {
    const a = stateRef.current.active;
    if (Date.now() < tap.current || a?.phase !== "play" || holed) return;
    tap.current = Date.now() + 400;
    const ball = a.holes.at(-1)!.length;
    commit({ type: "score", points });
    setConfirmation({ points, text: comments[points][(state.history.length + index + ball) % 3] });
    if (points === 4) setHoled(true);
    setPending(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPending(false), 1200);
  }
  const active = state.active,
    index = active ? active.holes.length - 1 : 0,
    shots = active?.holes[index] ?? [],
    average = bunkerAverage(state.history),
    best = bunkerBests(state.history),
    round = state.history.find((r) => r.id === reviewId);
  const before = round
    ? state.history.filter(
        (r) =>
          r.id !== round.id &&
          (r.finishedAt < round.finishedAt ||
            (r.finishedAt === round.finishedAt && r.id.localeCompare(round.id) < 0)),
      )
    : [];
  const oldBest = bunkerBests(before),
    oldAverage = bunkerAverage(before),
    points = round ? roundPoints(round) : 0,
    stars = round ? roundStars(round) : 0;
  const pb =
      !!round && round.status === "full" && oldBest.points !== null && points > oldBest.points,
    beatAverage =
      !!round && round.status === "full" && oldAverage.count > 0 && points > oldAverage.points;
  const levelUp = !!round && round.status === "full" && starLevel(stars) > starLevel(oldBest.stars);
  const goal = active ? bunkerGoal(active, state.history) : null;
  const replay =
    round?.status !== "full"
      ? "Redo för en hel runda?"
      : beatAverage
        ? "Du slog ditt snitt – bygg vidare nästa varv!"
        : oldAverage.count && oldAverage.points - points >= 0 && oldAverage.points - points <= 3
          ? `${Math.floor(oldAverage.points) + 1 - points} poäng till över ditt snitt. Ett varv till?`
          : "Redo att samla fler stjärnor?";
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
        <strong className="block text-2xl text-blue-700">{best.points ?? "–"}</strong>
        <p className="text-xs text-slate-500">Högsta poäng · hel runda</p>
      </div>
      <div>
        <strong className="block text-2xl text-amber-600">{formatStars(best.stars)} / 6 ★</strong>
        <p className="text-xs text-slate-500">Flest stjärnor</p>
      </div>
    </div>
  );
  if (!ready) return <main className="p-8 text-center">Laddar Bunkerrundan…</main>;
  return (
    <main className="bunker-game mx-auto min-h-[100dvh] max-w-md bg-slate-50 px-4 pb-5 pt-[max(12px,env(safe-area-inset-top))] text-slate-950">
      <style>{`.bunker-primary,.bunker-secondary,.bunker-black{display:flex;min-height:52px;width:100%;align-items:center;justify-content:center;border-radius:16px;padding:12px 16px;font-weight:800}.bunker-primary{background:#2563eb;color:white}.bunker-black{background:#111827;color:white}.bunker-secondary{border:1px solid #e2e8f0;background:white;color:#1e40af}.bunker-primary:disabled{opacity:.4}.bunker-star-pop{animation:bunkerStar .55s ease-out}.bunker-level-up{transform-origin:bottom;animation:bunkerLevel .8s ease-out both}.bunker-average-win{animation:bunkerWin 1s ease-out 2}@keyframes bunkerStar{50%{transform:scale(1.1)}}@keyframes bunkerLevel{from{transform:scaleY(.25)}to{transform:scaleY(1)}}@keyframes bunkerWin{50%{box-shadow:0 0 20px #60a5fa66;transform:scale(1.02)}}@media(prefers-reduced-motion:reduce){.bunker-star-pop,.bunker-level-up,.bunker-average-win{animation:none}}`}</style>
      {holed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sänkt bunkerslag"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 text-white"
        >
          <ChipCelebration />
          <p className="text-lg font-bold">Vilket bunkerslag!</p>
          <h2 className="my-5 text-6xl font-black">Sänkt!</h2>
          <p className="text-2xl font-bold">+4 poäng</p>
        </div>
      )}
      {active ? (
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
                <strong className="text-2xl">{roundPoints(active)}</strong>
                <p className="text-[10px] font-bold">POÄNG</p>
              </div>
              <div className="text-center">
                <strong className="text-xl">{formatStars(roundStars(active))} ★</strong>
                <p className="text-[10px] font-bold">AV 6 STJÄRNOR</p>
              </div>
            </div>
          </header>
          {!registering ? (
            <>
              <BunkerScene second={index === 1} />
              <section className="mt-4 space-y-4 rounded-3xl border bg-white p-5 text-center">
                <p className="font-bold text-blue-600">Omgång {index + 1} av 2</p>
                <h1 className="text-3xl font-black">
                  {index === 0 ? "Tre bollar från samma plats" : "Tillbaka till bunkern"}
                </h1>
                <p className="text-slate-500">
                  {index === 0
                    ? "Välj en flagga. Slå tre bollar och gå sedan upp till greenen."
                    : "Kratta och slå tre bollar till. Du kan använda samma plats och flagga."}
                </p>
                <button className="bunker-primary" onClick={() => setRegistering(true)}>
                  Registrera bollarna →
                </button>
              </section>
            </>
          ) : (
            <>
              <section className="mt-4 rounded-3xl border bg-white p-4">
                <div className="flex justify-between">
                  <h1 className="text-xl font-black text-blue-700">Omgång {index + 1}</h1>
                  <strong className="text-blue-700">{holePoints(shots)} poäng</strong>
                </div>
                <div className="mt-3 flex justify-center">
                  <BunkerStars
                    count={holeStars(shots)}
                    large
                    zero={shots.length === 3 && holePoints(shots) === 0}
                  />
                </div>
                {holeStars(shots) === 3 && (
                  <p className="mt-2 text-center text-xs font-bold text-amber-700">
                    Full pott på omgången!
                  </p>
                )}
              </section>
              <section className="mt-4">
                <h2 className="text-center text-lg font-black">
                  {shots.length === 3
                    ? "Tre bollar registrerade"
                    : `Boll ${shots.length + 1} · Var hamnade den?`}
                </h2>
                <p className="mt-1 text-center text-xs text-slate-500">
                  Avstånden gäller på green.
                </p>
                <div className="relative mt-3 grid grid-cols-5 gap-1.5">
                  <div aria-hidden className="absolute left-5 right-5 top-8 h-1 bg-blue-200" />
                  {BUNKER_ZONES.map((z) => (
                    <button
                      key={z.points}
                      aria-label={z.label}
                      disabled={active.phase === "result" || holed}
                      onClick={() => score(z.points)}
                      className="relative flex min-h-28 flex-col items-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50 px-0.5 py-3 text-blue-900 disabled:opacity-55"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-500 bg-white">
                        {z.points === 4 ? (
                          <Flag className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        )}
                      </span>
                      <span className="whitespace-nowrap text-[13px] font-black leading-5">
                        {z.top}
                        <br />
                        {z.bottom}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  className="mt-3 flex justify-center gap-3"
                  aria-label={`${shots.length} av 3 bollar registrerade`}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < shots.length ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-400"}`}
                    >
                      {i < shots.length ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                  ))}
                </div>
              </section>
              {confirmation && (
                <div
                  role="status"
                  className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center text-sm font-bold ${confirmation.points ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
                >
                  <Check className="h-4 w-4 shrink-0" />
                  {confirmation.text} +{confirmation.points} poäng
                </div>
              )}
              {goal && active.phase === "play" && (
                <p className="mt-3 rounded-xl bg-amber-100 p-3 text-center text-sm font-bold text-amber-900">
                  {goal}
                </p>
              )}
              {active.phase === "result" && (
                <button
                  className="bunker-primary mt-4"
                  disabled={pending || holed}
                  onClick={() => {
                    setRegistering(false);
                    setConfirmation(null);
                    commit({ type: "next", at: Date.now() });
                  }}
                >
                  {index === 0 ? "Nästa omgång · 3 bollar" : "Se rundans resultat"} →
                </button>
              )}
              <button
                className="mt-2 flex min-h-11 items-center gap-2 text-sm text-slate-500 disabled:opacity-30"
                disabled={!shots.length || holed}
                onClick={() => {
                  if (timer.current) clearTimeout(timer.current);
                  setPending(false);
                  setConfirmation(null);
                  tap.current = 0;
                  commit({ type: "undo" });
                }}
              >
                <Undo2 className="h-4 w-4" />
                Ångra senaste
              </button>
            </>
          )}
        </>
      ) : view === "result" && round ? (
        <div className="space-y-4 pt-5">
          {(pb || stars === 6) && fresh === round.id && <ChipCelebration />}
          <div className="text-center">
            <p className="text-sm font-bold uppercase text-blue-600">
              {round.status === "full" ? "Rundan klar" : "En omgång klar"}
            </p>
            <h1 className="mt-2 text-3xl font-black">
              {pb
                ? "Nytt personbästa!"
                : beatAverage
                  ? "Över ditt snitt!"
                  : stars === 6
                    ? "Alla stjärnor!"
                    : "Bra spelat!"}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-3xl bg-white p-4">
              <div>
                <strong className="text-4xl font-black text-amber-500">
                  {formatStars(stars)} ★
                </strong>
                <p className="mt-2 text-xs text-slate-500">av {round.holes.length * 3} stjärnor</p>
              </div>
              <div>
                <strong className="text-4xl font-black text-blue-700">{points}</strong>
                <p className="mt-2 text-xs text-slate-500">Totalpoäng</p>
              </div>
            </div>
          </div>
          {round.status === "full" && (
            <>
              {levelUp && fresh === round.id && (
                <BunkerMilestones stars={stars} previous={oldBest.stars} />
              )}
              <div
                className={`rounded-2xl bg-blue-50 p-4 text-center ${beatAverage && fresh === round.id ? "bunker-average-win" : ""}`}
              >
                <p className="text-sm font-bold text-blue-700">
                  Rundsnitt · senaste {bunkerAverage([...before, round]).count}
                </p>
                <strong className="text-2xl text-blue-700">
                  {oldAverage.count ? `${formatStars(oldAverage.stars)} → ` : ""}
                  {formatStars(bunkerAverage([...before, round]).stars)} ★
                </strong>
                <p className="mt-1 text-sm text-blue-700">
                  {formatStars(bunkerAverage([...before, round]).points)} poäng i snitt
                </p>
              </div>
            </>
          )}
          <BunkerRoundImpact
            round={round}
            before={before}
            userId={userId}
            fresh={fresh === round.id}
          />
          <BunkerAnalysis round={round} />
          <p className="text-center text-sm font-semibold text-slate-600">{replay}</p>
          <button className="bunker-black" onClick={requestStart}>
            Spela igen · 6 slag
          </button>
          <button
            className="bunker-secondary"
            onClick={() => {
              setView("history");
              setFresh(null);
            }}
          >
            Alla rundor
          </button>
          <button data-local-navigation className="bunker-secondary" onClick={back}>
            Tillbaka till Bunkerrundan
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
                    {r.status === "full" ? "Hel runda" : "En omgång"}
                  </strong>
                  <small className="text-slate-500">
                    {new Date(r.finishedAt).toLocaleDateString("sv-SE")} · Est. HCP{" "}
                    {courseHandicap(r) === null ? "–" : handicapLabel(courseHandicap(r)!)}
                  </small>
                </span>
                <span className="text-right">
                  <strong className="block text-lg text-amber-600">
                    {formatStars(roundStars(r))} ★
                  </strong>
                  <span className="text-sm font-bold text-blue-700">{roundPoints(r)} poäng →</span>
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
          <section className="rounded-3xl border bg-white px-4 pb-4 pt-5">
            <h1 className="text-2xl font-black">Dags för en bunkerrunda?</h1>
            <button className="bunker-primary mt-4" onClick={requestStart}>
              Starta rundan →
            </button>
            <BunkerScene />
          </section>
          <div className="mt-4 rounded-3xl border bg-white p-4">
            <h2 className="font-black">Ditt rundsnitt</h2>
            <p className="mt-2 text-3xl font-black text-blue-700">
              {average.count ? formatStars(average.stars) : "–"}{" "}
              <span className="text-sm text-slate-500">/ 6 ★</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {average.count
                ? `${formatStars(average.points)} poäng · senaste ${average.count} hela rundorna`
                : "Spela din första hela runda."}
            </p>
          </div>
          <div className="mt-4">
            <BunkerMilestones stars={best.stars} />
            <p className="mt-1 text-center text-xs text-slate-500">Din bästa hela runda</p>
          </div>
          <BunkerProgress history={state.history} />
          <div className="mt-4">{records}</div>
          <BunkerLeaderboard userId={userId} history={state.history} playerName={playerName} />
          <button className="bunker-secondary mt-4" onClick={() => setView("history")}>
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
      {intro && <BunkerOnboarding onDone={finishIntro} onClose={() => setIntro(false)} />}
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle className="text-2xl">Så här spelar du</DialogTitle>
          <DialogDescription className="text-lg">
            Två omgångar. Tre bollar i varje.
          </DialogDescription>
          <ol className="space-y-3 text-lg">
            <li>1. Välj en bunker och en flagga.</li>
            <li>2. Slå tre bollar. Gå upp och registrera.</li>
            <li>3. Kratta och spela tre till.</li>
          </ol>
          <div className="space-y-2">
            {BUNKER_ZONES.map((z) => (
              <p key={z.points} className="flex justify-between gap-4 text-sm">
                <span>{z.label}</span>
                <strong className="shrink-0">{z.points} p</strong>
              </p>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            3 poäng fyller en stjärna. Max 3 per omgång och 6 på rundan.
          </p>
          <button className="bunker-primary" onClick={() => setRules(false)}>
            Jag är med!
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={exit} onOpenChange={setExit}>
        <DialogContent className="max-w-sm rounded-3xl bg-white text-slate-950">
          <DialogTitle>Pausa rundan?</DialogTitle>
          <DialogDescription>
            Du fortsätter från samma boll nästa gång. Vid avslut sparas bara hela omgångar.
          </DialogDescription>
          <button
            className="bunker-primary"
            onClick={() => {
              setExit(false);
              onExit();
            }}
          >
            Pausa och gå tillbaka
          </button>
          <button className="bunker-secondary" onClick={() => setExit(false)}>
            Fortsätt spela
          </button>
          <button
            className="min-h-11 text-sm text-slate-500"
            onClick={() => {
              setExit(false);
              commit({ type: "finish", at: Date.now() });
            }}
          >
            Avsluta rundan
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
