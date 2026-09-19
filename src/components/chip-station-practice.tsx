import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Lock,
  RotateCcw,
  Star,
  Target,
  Undo2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActivityReview } from "@/components/activity-review";
import { buildActivityReview, shortGameReviewInput } from "@/lib/activity-review";
import { chipPerformanceFromPoints, recordEngineOutcome } from "@/lib/sg4-engine";
import {
  BALLS_PER_ROUND,
  CHIP_DISTANCES,
  CHIP_LIES,
  CHIP_LIE_HELP,
  CHIP_LIE_LABELS,
  CHIP_ZONES,
  MAX_ROUND_POINTS,
  ROUNDS_PER_GUIDED,
  bestAt,
  chipStorageKey,
  emptyChipProgress,
  goalAt,
  isUnlocked,
  parseChipProgress,
  plannedStations,
  recommendStation,
  reduceChipProgress,
  roundTotal,
  sessionRounds,
  starThresholds,
  starsAt,
  starsFor,
  totalStars,
  unlockRequirement,
  unlockedDistances,
  type ChipAction,
  type ChipLie,
  type ChipPoints,
  type ChipProgress,
  type ChipRound,
} from "@/lib/chip-stations";

type Props = {
  userId: string | null;
  authLoading?: boolean;
  coach: { name: string; emoji: string };
  surface?: CSSProperties;
  onExit: () => void;
};

const card =
  "rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_36px_-24px_rgba(15,23,42,.25)]";
const primary =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition active:scale-[.99] disabled:opacity-35";
const secondary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition active:scale-[.99]";
const uniqueId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `chip-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** 0–4 chip zones mapped onto the shared 0–5 short game review scale. */
const REVIEW_POINTS: Record<ChipPoints, number> = { 4: 5, 3: 4, 2: 3, 1: 2, 0: 0 };

function Stars({ count, size = "sm" }: { count: number; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="flex items-center gap-0.5" aria-label={`${count} av 3 stjärnor`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`${box} ${i < count ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
        />
      ))}
    </span>
  );
}

export function ChipStationPractice({
  userId,
  authLoading = false,
  coach,
  surface,
  onExit,
}: Props) {
  const [progress, setProgress] = useState<ChipProgress>(emptyChipProgress);
  const stateRef = useRef(progress);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [stationSheet, setStationSheet] = useState<number | null>(null);
  const [rulesDialog, setRulesDialog] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const tapUntil = useRef(0);
  const recorded = useRef<Set<string>>(new Set());
  const key = chipStorageKey(userId);
  const recordedKey = `${key}:recorded`;

  useEffect(() => {
    if (authLoading) return;
    let stored = emptyChipProgress();
    try {
      stored = parseChipProgress(window.localStorage.getItem(key));
      const raw: unknown = JSON.parse(window.localStorage.getItem(recordedKey) ?? "[]");
      recorded.current = new Set(Array.isArray(raw) ? raw.filter((v) => typeof v === "string") : []);
    } catch {
      setStorageError(true);
    }
    stateRef.current = stored;
    setProgress(stored);
    setReady(true);
  }, [key, recordedKey, authLoading]);

  /** Each completed round is written to shot analytics exactly once, retries included. */
  function recordRound(round: ChipRound) {
    if (recorded.current.has(round.id)) return;
    recorded.current.add(round.id);
    for (const points of round.shots) {
      recordEngineOutcome({
        skill: "chip",
        distance: round.distance,
        performance: chipPerformanceFromPoints(points),
        context: "practice",
        activityId: "coach-chipping",
      });
    }
    try {
      window.localStorage.setItem(
        recordedKey,
        JSON.stringify([...recorded.current].slice(-300)),
      );
    } catch {
      /* analytics de-duplication is best effort */
    }
  }

  function commit(action: ChipAction) {
    if (!ready) return;
    const next = reduceChipProgress(stateRef.current, action);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setProgress(next);
    const finished = next.session?.current;
    if (finished && finished.shots.length === BALLS_PER_ROUND && next.session?.phase === "result")
      recordRound(finished);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  const session = progress.session;
  const phase = session?.phase ?? "map";
  const current = session?.current;
  const lie = session?.lie ?? progress.lie;
  const rounds = sessionRounds(progress);
  const open = unlockedDistances(progress, lie);
  const stars = totalStars(progress, lie);
  const recommendation = recommendStation(progress, lie);
  const distance = current?.distance ?? recommendation.distance;
  const total = current ? roundTotal(current) : 0;

  const before = current
    ? { ...progress, rounds: progress.rounds.filter((r) => r.id !== current.id) }
    : progress;
  const beforeBest = bestAt(before, distance, lie);
  const beforeStars = starsAt(before, distance, lie);
  const afterStars = starsFor(distance, lie, Math.max(total, beforeBest ?? 0));
  const newRecord = phase === "result" && total > (beforeBest ?? -1);
  const newStars = phase === "result" ? afterStars - beforeStars : 0;
  const unlockedNow =
    phase === "result"
      ? unlockedDistances(progress, lie).filter((d) => !unlockedDistances(before, lie).includes(d))
      : [];
  const goal = goalAt(phase === "result" ? before : progress, distance, lie);
  const guided = session?.mode === "guided";
  const doneRounds = rounds.length;
  const roundNumber = Math.min(ROUNDS_PER_GUIDED, doneRounds + (phase === "result" ? 0 : 1));
  const lastGuidedRound = guided && doneRounds >= ROUNDS_PER_GUIDED;
  const upcoming = useMemo(
    () => (guided ? plannedStations(progress, lie, Math.max(0, ROUNDS_PER_GUIDED - doneRounds)) : []),
    [progress, lie, guided, doneRounds],
  );

  const highlight = unlockedNow.length
    ? { tone: "unlock", text: `${unlockedNow[0]} m är upplåst.` }
    : newStars > 0
      ? {
          tone: "star",
          text: `${newStars === 1 ? "Ny stjärna" : `${newStars} nya stjärnor`} på ${distance} m.`,
        }
      : newRecord
        ? {
            tone: "record",
            text:
              beforeBest === null
                ? "Första resultatet på stationen sparat."
                : `Nytt rekord · tidigare ${beforeBest}/12.`,
          }
        : {
            tone: "goal",
            text:
              goal.star === null
                ? "Alla stjärnor är redan tagna här."
                : `${goal.points - total} p kvar till ${goal.star === 1 ? "första" : goal.star === 2 ? "andra" : "tredje"} stjärnan.`,
          };

  const coachText =
    phase === "map"
      ? session
        ? "Välj en upplåst station. Tre bollar, samma plats."
        : `Samma underlag hela rundan. ${CHIP_LIE_HELP[lie]}`
      : phase === "play"
        ? "Slå alla tre bollarna först. Registrera sedan vid hålet."
        : phase === "result"
          ? highlight.text
          : "Rundan är klar. Här är vad som faktiskt hände.";

  function startGuided() {
    commit({
      type: "startGuided",
      id: uniqueId(),
      roundId: uniqueId(),
      distance: recommendStation(stateRef.current, lie, []).distance,
      lie,
      at: Date.now(),
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startStandalone(target: number) {
    setStationSheet(null);
    if (stateRef.current.session) commit({ type: "next", roundId: uniqueId(), distance: target, at: Date.now() });
    else
      commit({
        type: "startStandalone",
        id: uniqueId(),
        roundId: uniqueId(),
        distance: target,
        lie,
        at: Date.now(),
      });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function nextRound(target: number) {
    commit({ type: "next", roundId: uniqueId(), distance: target, at: Date.now() });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function score(points: ChipPoints) {
    if (Date.now() < tapUntil.current) return;
    tapUntil.current = Date.now() + 320;
    commit({ type: "score", points });
  }
  function finish() {
    setEndDialog(false);
    commit({ type: "finish" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function leaveSession() {
    setEndDialog(false);
    commit({ type: "exit" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function back() {
    if (!session || phase === "summary") onExit();
    else if (!rounds.length && !current?.shots.length) leaveSession();
    else setEndDialog(true);
  }

  const summaryRounds = rounds;
  const summaryShots = summaryRounds.flatMap((r) =>
    r.shots.map((points) => ({ distance: r.distance, points: REVIEW_POINTS[points], lie: CHIP_LIE_LABELS[r.lie] })),
  );
  const summaryReview = summaryShots.length
    ? buildActivityReview(shortGameReviewInput("Chippning", summaryShots))
    : null;

  return (
    <main
      data-chip-stations="v2"
      style={{ ...surface, colorScheme: "light" }}
      className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-gradient-to-b from-sky-50 via-white to-white px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] text-slate-950"
    >
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Tillbaka"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">
            Practice Mode
          </p>
          <h1 className="text-lg font-black">Chippning</h1>
        </div>
        {session && phase !== "summary" ? (
          <button
            type="button"
            onClick={() => setEndDialog(true)}
            className="min-h-11 text-xs font-bold text-slate-600"
          >
            Avsluta
          </button>
        ) : (
          <span className="w-11" />
        )}
      </header>

      {!ready ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Laddar dina stationer…
        </p>
      ) : (
        <>
          {storageError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              Resultaten finns kvar i rundan men kunde inte sparas på enheten.
            </p>
          ) : null}

          <section
            aria-label={`${coach.name}, din coach`}
            className={`${card} mt-4 flex min-h-[84px] items-center gap-3 px-4 py-3`}
          >
            <span aria-hidden="true" className="shrink-0 text-[38px] leading-none">
              {coach.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                {coach.name}
              </p>
              <p className="mt-1 text-[13px] font-medium leading-5 text-slate-700">{coachText}</p>
            </div>
          </section>

          {phase === "map" ? (
            <>
              <section className="mt-4 flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <Star aria-hidden="true" className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <p className="text-sm font-black">
                    {stars.earned}
                    <span className="text-slate-400"> / {stars.available}</span>
                  </p>
                  <span className="text-[11px] font-semibold text-slate-500">stjärnor</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500">
                  {open.length} av {CHIP_DISTANCES.length} stationer
                </p>
              </section>

              {!session ? (
                <section className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">
                    Underlag
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {CHIP_LIES.map((option) => (
                      <button
                        type="button"
                        key={option}
                        aria-pressed={lie === option}
                        onClick={() => commit({ type: "setLie", lie: option })}
                        className={`min-h-[72px] rounded-[20px] border px-3 py-3 text-left transition ${lie === option ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white"}`}
                      >
                        <span className="flex items-center gap-1.5 text-base font-black">
                          {lie === option ? <Check className="h-4 w-4 text-blue-600" /> : null}
                          {CHIP_LIE_LABELS[option]}
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                          {CHIP_LIE_HELP[option]}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className={`${card} mt-4 overflow-hidden`}>
                <div className="bg-blue-600 px-5 py-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-blue-100">
                    Nästa utmaning · {CHIP_LIE_LABELS[lie]}
                  </p>
                  <p className="mt-1 text-[40px] font-black leading-none">
                    {recommendation.distance}
                    <span className="ml-1 text-lg font-bold">m</span>
                  </p>
                  <p className="mt-2 text-[13px] font-semibold text-blue-50">
                    {goalAt(progress, recommendation.distance, lie).label} ·{" "}
                    {goalAt(progress, recommendation.distance, lie).points} p av 12
                  </p>
                </div>
                <div className="px-5 py-4">
                  <button type="button" onClick={startGuided} className={primary}>
                    Starta runda · 9 bollar <ChevronRight className="h-5 w-5" />
                  </button>
                  <p className="mt-2 text-center text-[11px] text-slate-500">
                    3 stationer × 3 bollar. {recommendation.reason}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStationSheet(recommendation.distance)}
                    className={`${secondary} mt-3`}
                  >
                    <Target className="h-4 w-4" /> Välj station · 3 bollar
                  </button>
                </div>
              </section>

              <section className="mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black">Din väg till 30 m</h2>
                  <button
                    type="button"
                    onClick={() => setRulesDialog(true)}
                    className="min-h-11 text-xs font-bold text-blue-600"
                  >
                    Så funkar stjärnorna
                  </button>
                </div>
                <ol className="relative mt-3 space-y-2.5">
                  {CHIP_DISTANCES.map((d, index) => {
                    const unlockedStation = open.includes(d);
                    const earned = starsAt(progress, d, lie);
                    const currentNode = d === recommendation.distance && unlockedStation;
                    const left = index % 2 === 0;
                    return (
                      <li key={d} className="relative">
                        {index > 0 ? (
                          <span
                            aria-hidden="true"
                            className={`absolute -top-2.5 left-1/2 h-2.5 w-0.5 -translate-x-1/2 ${unlockedStation ? "bg-blue-300" : "bg-slate-200"}`}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setStationSheet(d)}
                          aria-label={`${d} meter, ${unlockedStation ? `${earned} av 3 stjärnor` : "låst"}`}
                          className={`flex min-h-[72px] w-[86%] items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition active:scale-[.99] ${left ? "mr-auto" : "ml-auto"} ${
                            !unlockedStation
                              ? "border-slate-200 bg-slate-100/70 text-slate-400"
                              : currentNode
                                ? "border-blue-500 bg-blue-50 shadow-[0_0_0_6px_rgba(59,130,246,.12)]"
                                : earned === 3
                                  ? "border-emerald-200 bg-emerald-50/70"
                                  : "border-slate-200 bg-white"
                          }`}
                        >
                          <span
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black ${
                              !unlockedStation
                                ? "bg-slate-200 text-slate-500"
                                : currentNode
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-900 text-white"
                            }`}
                          >
                            {unlockedStation ? d : <Lock className="h-5 w-5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-black">
                                {d} m {unlockedStation ? null : "· Låst"}
                              </span>
                              {unlockedStation ? <Stars count={earned} /> : null}
                            </span>
                            <span className="mt-1 block truncate text-[11px] text-slate-500">
                              {unlockedStation
                                ? `Rekord ${bestAt(progress, d, lie) ?? 0}/12 · ${goalAt(progress, d, lie).label}`
                                : unlockRequirement(d, lie)}
                            </span>
                          </span>
                          {currentNode ? (
                            <span className="rounded-full bg-blue-600 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">
                              Här
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
              {session ? (
                <button type="button" onClick={leaveSession} className={`${secondary} mt-5`}>
                  Avbryt och gå tillbaka
                </button>
              ) : null}
            </>
          ) : null}

          {phase === "play" && current ? (
            <section className="mt-4">
              <div className={`${card} px-5 py-4`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>
                    {guided ? `Runda ${roundNumber}/${ROUNDS_PER_GUIDED}` : "Fristående försök"}
                  </span>
                  <span>{CHIP_LIE_LABELS[current.lie]}</span>
                </div>
                <p className="mt-2 text-[56px] font-black leading-none tracking-tight">
                  {current.distance}
                  <span className="ml-2 text-xl font-bold">m</span>
                </p>
                <p className="mt-2 text-[13px] font-semibold text-slate-600">
                  Tre bollar från samma plats. Slå alla tre innan du registrerar.
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-600">
                    Rekord {bestAt(progress, current.distance, current.lie) ?? 0}/12
                  </span>
                  <span className="text-sm font-black text-blue-700">
                    {goal.label} · {goal.points} p
                  </span>
                </div>
              </div>

              <div className="my-4 flex items-center justify-between gap-3">
                <h2 aria-live="polite" className="text-base font-black">
                  Registrera boll {Math.min(BALLS_PER_ROUND, current.shots.length + 1)} av 3
                </h2>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      aria-label={`Boll ${i + 1}: ${current.shots[i] === undefined ? "kvar" : `${current.shots[i]} poäng`}`}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${current.shots[i] !== undefined ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-400"}`}
                    >
                      {current.shots[i] === undefined ? i + 1 : `${current.shots[i]}p`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {CHIP_ZONES.map((zone) => (
                  <button
                    type="button"
                    key={zone.points}
                    onClick={() => score(zone.points)}
                    aria-label={`${zone.label}, ${zone.points} poäng. ${zone.detail}`}
                    className={`flex min-h-[64px] items-center justify-between gap-2 rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-900 transition active:scale-[.98] active:bg-blue-100 ${zone.points === 4 ? "col-span-2 !border-blue-600 !bg-blue-600 !text-white" : ""}`}
                  >
                    <span className="text-sm font-bold">{zone.label}</span>
                    <span className="text-xl font-black">
                      {zone.points}
                      <span className="ml-1 text-xs font-bold">p</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  disabled={!current.shots.length}
                  onClick={() => commit({ type: "undo" })}
                  className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-slate-600 disabled:opacity-30"
                >
                  <Undo2 className="h-4 w-4" />
                  Ångra senaste
                </button>
                <button
                  type="button"
                  onClick={() => setRulesDialog(true)}
                  className="min-h-11 text-xs font-bold text-blue-600"
                >
                  Poängzoner
                </button>
              </div>
              {!current.shots.length ? (
                <button
                  type="button"
                  onClick={() => commit({ type: "map" })}
                  className="min-h-11 w-full text-xs font-bold text-slate-500"
                >
                  Byt station innan du börjar
                </button>
              ) : null}
            </section>
          ) : null}

          {phase === "result" && current ? (
            <section className="mt-4">
              <div className={`${card} px-5 py-6 text-center`}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {current.distance} m · {CHIP_LIE_LABELS[current.lie]} · 3 bollar
                </p>
                <div className="mt-3 text-[68px] font-black leading-none tracking-tight text-blue-600 duration-500 animate-in fade-in zoom-in-95 motion-reduce:animate-none">
                  {total}
                  <span className="text-2xl text-slate-400">/{MAX_ROUND_POINTS}</span>
                </div>
                <div className="mt-3 flex justify-center">
                  <Stars count={afterStars} size="lg" />
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  {current.shots.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      Boll {i + 1}: {p} p
                    </span>
                  ))}
                </div>
                <p
                  role="status"
                  className={`mt-4 rounded-[16px] px-3 py-3 text-sm font-black ${
                    highlight.tone === "unlock"
                      ? "bg-blue-600 text-white"
                      : highlight.tone === "star"
                        ? "bg-amber-50 text-amber-700"
                        : highlight.tone === "record"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {highlight.text}
                </p>
              </div>

              {guided ? (
                <p className="my-4 text-center text-xs font-semibold text-slate-500">
                  {doneRounds} av {ROUNDS_PER_GUIDED} stationer klara
                  {upcoming.length ? ` · härnäst ${upcoming.join(" m, ")} m` : ""}
                </p>
              ) : (
                <div className="my-4" />
              )}

              {guided && lastGuidedRound ? (
                <button type="button" onClick={finish} className={primary}>
                  Se din runda <ChevronRight className="h-5 w-5" />
                </button>
              ) : guided ? (
                <button
                  type="button"
                  onClick={() => nextRound(upcoming[0] ?? recommendation.distance)}
                  className={primary}
                >
                  Nästa station · {upcoming[0] ?? recommendation.distance} m
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => nextRound(current.distance)}
                  className={primary}
                >
                  <RotateCcw className="h-4 w-4" /> Försök igen · 3 bollar
                </button>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => commit({ type: "map" })}
                  className={secondary}
                >
                  Välj station
                </button>
                <button type="button" onClick={finish} className={secondary}>
                  Avsluta
                </button>
              </div>
              <button
                type="button"
                onClick={() => commit({ type: "undo" })}
                className="mt-2 min-h-11 w-full text-xs font-bold text-slate-500"
              >
                Rätta senaste bollen
              </button>
            </section>
          ) : null}

          {phase === "summary" ? (
            <section className="mt-5">
              <div className={`${card} p-5 text-center`}>
                <h2 className="text-2xl font-black">Din runda</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {summaryRounds.length} stationer · {summaryRounds.length * BALLS_PER_ROUND} chippar
                  · {CHIP_LIE_LABELS[lie]}
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xl font-black text-blue-600">
                      {summaryRounds.reduce((sum, r) => sum + roundTotal(r), 0)}
                      <span className="text-xs text-slate-400">
                        /{summaryRounds.length * MAX_ROUND_POINTS}
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">Poäng</p>
                  </div>
                  <div>
                    <p className="text-xl font-black">
                      {
                        summaryRounds.filter(
                          (r) => roundTotal(r) === bestAt(progress, r.distance, r.lie),
                        ).length
                      }
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">Rekord</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-amber-500">{stars.earned}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">Stjärnor totalt</p>
                  </div>
                </div>
              </div>

              {summaryRounds.length ? (
                <div className={`${card} mt-4 overflow-hidden`}>
                  {summaryRounds.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                    >
                      <p className="text-sm font-black">{r.distance} m</p>
                      <p className="text-sm font-bold">{roundTotal(r)}/12</p>
                      <Stars count={starsAt(progress, r.distance, r.lie)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="my-5 text-center text-sm text-slate-500">
                  Inga fullständiga försök registrerade.
                </p>
              )}

              {summaryReview ? (
                <div className="mt-4">
                  <ActivityReview input={summaryReview} />
                </div>
              ) : null}

              <div className={`${card} mt-4 p-4`}>
                <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                  Nästa gång
                </p>
                <p className="mt-1 text-lg font-black">{recommendation.distance} m</p>
                <p className="mt-1 text-xs text-slate-500">{recommendation.reason}</p>
              </div>

              <button
                type="button"
                onClick={() => startStandalone(recommendation.distance)}
                className={`${primary} mt-4`}
              >
                Testa {recommendation.distance} m · 3 bollar
              </button>
              <button type="button" onClick={leaveSession} className={`${secondary} mt-3`}>
                Ny runda · 9 bollar
              </button>
              <button
                type="button"
                onClick={onExit}
                className="mt-2 min-h-12 w-full text-sm font-bold text-slate-600"
              >
                Tillbaka till Practice Mode
              </button>
            </section>
          ) : null}

          {phase !== "play" ? (
            <p className="mt-5 text-center text-[10px] leading-4 text-slate-400">
              Stationer och stjärnor sparas {userId ? "för ditt konto" : "som gäst"} på denna enhet.
              Ingen HCP-testdata påverkas.
            </p>
          ) : null}
        </>
      )}

      <Dialog open={stationSheet !== null} onOpenChange={(v) => !v && setStationSheet(null)}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-[24px] border-slate-200 bg-white text-slate-950">
          {stationSheet !== null ? (
            <>
              <DialogTitle>
                {stationSheet} m · {CHIP_LIE_LABELS[lie]}
              </DialogTitle>
              {isUnlocked(progress, stationSheet, lie) ? (
                <>
                  <DialogDescription className="text-slate-600">
                    Personbästa {bestAt(progress, stationSheet, lie) ?? 0}/12 ·{" "}
                    {goalAt(progress, stationSheet, lie).label} (
                    {goalAt(progress, stationSheet, lie).points} p)
                  </DialogDescription>
                  <div className="flex items-center gap-3">
                    <Stars count={starsAt(progress, stationSheet, lie)} size="lg" />
                    <span className="text-xs text-slate-500">
                      Stjärnor vid {starThresholds(stationSheet, lie).join(" / ")} p
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startStandalone(stationSheet)}
                    className={primary}
                  >
                    Starta {stationSheet} m · 3 bollar
                  </button>
                </>
              ) : (
                <DialogDescription className="text-slate-600">
                  {unlockRequirement(stationSheet, lie)}
                </DialogDescription>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={endDialog} onOpenChange={setEndDialog}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-[24px] border-slate-200 bg-white text-slate-950">
          <DialogTitle>Avsluta rundan?</DialogTitle>
          <DialogDescription className="text-slate-600">
            {current && phase === "play" && current.shots.length
              ? `De ${current.shots.length} registrerade bollarna i det pågående försöket räknas inte. Klara försök är sparade.`
              : "Dina klara försök, stjärnor och upplåsta stationer är sparade."}
          </DialogDescription>
          <button type="button" onClick={finish} className={primary}>
            Visa resultat
          </button>
          <button type="button" onClick={() => setEndDialog(false)} className={secondary}>
            Fortsätt träna
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={rulesDialog} onOpenChange={setRulesDialog}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-[24px] border-slate-200 bg-white text-slate-950">
          <DialogTitle>Poäng & stjärnor</DialogTitle>
          <DialogDescription className="text-slate-600">
            Tre bollar per station, max 12 poäng. Första stjärnan låser upp nästa avstånd för samma
            underlag. Du behöver aldrig full pott.
          </DialogDescription>
          <div>
            {CHIP_ZONES.map((z) => (
              <div
                key={z.points}
                className="flex justify-between border-b border-slate-100 py-2 text-sm"
              >
                <span>{z.label}</span>
                <strong>{z.points} p</strong>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Gränserna är inkluderande: exakt 1 m ger 3 p, exakt 2 m ger 2 p och exakt 3 m ger 1 p.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <caption className="pb-3 text-left text-sm font-bold text-slate-800">
                Stjärnkrav · {CHIP_LIE_LABELS[lie]}
              </caption>
              <thead>
                <tr className="text-slate-500">
                  <th className="p-1.5">m</th>
                  <th className="p-1.5">★</th>
                  <th className="p-1.5">★★</th>
                  <th className="p-1.5">★★★</th>
                </tr>
              </thead>
              <tbody>
                {CHIP_DISTANCES.map((d) => (
                  <tr key={d} className="border-t border-slate-100">
                    <th className="p-2">{d}</th>
                    {starThresholds(d, lie).map((points, i) => (
                      <td key={i} className="p-2">
                        {points}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Kortklippt och ruff har separata stjärnor och upplåsningar. Målen är en träningsmodell
            som kan kalibreras, inte en HCP-skala.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
