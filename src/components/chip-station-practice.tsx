import { handicapLabel } from "@/lib/shortgame";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Coffee,
  Flag,
  History,
  Star,
  Trophy,
  Undo2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActivityReview } from "@/components/activity-review";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-review";
import { CHIP_ZONES, type ChipLie, type ChipPoints } from "@/lib/chip-stations";
import {
  courseDistances,
  courseHandicap,
  liveStars,
  beatsScore,
  courseRecord,
  courseStorageKey,
  emptyCourse,
  holePoints,
  holeStars,
  holeTargets,
  parseCourse,
  reduceCourse,
  roundStars,
  segmentScore,
  type CourseAction,
  type Segment,
} from "@/lib/chip-course";

type Props = {
  userId: string | null;
  authLoading?: boolean;
  coach: { name: string; emoji: string };
  surface?: CSSProperties;
  onExit: () => void;
};
const card =
  "rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,.3)]";
const primary =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-blue-800 bg-blue-600 px-4 py-3 text-base font-bold text-white active:translate-y-0.5 active:border-b-2 disabled:opacity-40";
const secondary =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-700";
const segmentNames: Record<Segment, string> = {
  full: "Hela rundan",
  front: "Första tre",
  back: "Sista tre",
};
const starLabel = (value: number) => value.toFixed(1).replace(".", ",");
const uid = () => crypto.randomUUID();
const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
function Stars({
  count = 0,
  large = false,
  fills,
  celebrate = false,
}: {
  count?: number;
  large?: boolean;
  fills?: number[];
  celebrate?: boolean;
}) {
  const values = fills ?? [0, 1, 2].map((i) => Math.max(0, Math.min(1, count - i)));
  return (
    <span
      className="inline-flex gap-1.5"
      aria-label={`${starLabel(values.reduce((sum, v) => sum + v, 0))} av 3 stjärnor`}
    >
      {values.map((fill, i) => (
        <span key={i} className={`relative block ${large ? "h-11 w-11" : "h-4 w-4"}`}>
          <Star aria-hidden="true" className="h-full w-full fill-white/70 text-slate-300" />
          <span
            className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${fill * 100}%` }}
          >
            <Star
              aria-hidden="true"
              className={`${large ? "h-11 w-11" : "h-4 w-4"} fill-amber-400 text-amber-500`}
            />
          </span>
          {fill === 1 && (
            <span
              key={`full-${fill}`}
              className={`pointer-events-none absolute inset-0 ${large || celebrate ? "chip-star-pop" : ""}`}
            >
              <Star aria-hidden="true" className="h-full w-full fill-amber-400 text-amber-500" />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
const positions = [
  [16, 27],
  [48, 25],
  [83, 27],
  [83, 73],
  [49, 75],
  [16, 73],
];
function CourseMap({
  holes,
  lie,
  cursor,
  model = 4,
}: {
  holes: ChipPoints[][];
  lie: ChipLie;
  cursor: number | "halfway" | null;
  model?: number;
}) {
  const point =
    cursor === "halfway" ? [12, 50] : typeof cursor === "number" ? positions[cursor] : null;
  return (
    <div
      className="relative my-4 h-[310px] overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-100"
      aria-label="Golfbanan: första tre, Halfway House, sista tre"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 310"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M51 68 C73 87 101 25 154 43 S237 40 266 78 Q305 121 232 139 L160 155 L228 177 Q308 204 266 236 C234 218 207 282 157 264 S86 206 51 233"
          fill="none"
          stroke="#86b899"
          strokeWidth="25"
          strokeLinecap="round"
          opacity=".25"
        />
        <path
          d="M51 68 C73 87 101 25 154 43 S237 40 266 78 Q305 121 232 139 L160 155 L228 177 Q308 204 266 236 C234 218 207 282 157 264 S86 206 51 233"
          fill="none"
          stroke="#fffdf0"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="2 9"
        />
      </svg>
      {courseDistances(model).map((d, i) => (
        <div
          key={i}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
          style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }}
        >
          <span
            aria-label={`Hål ${i + 1}, ${d} meter`}
            className={`relative flex h-8 w-16 items-center justify-center gap-1 ${cursor === i ? "text-emerald-900" : "text-emerald-700"}`}
          >
            <Flag className="h-7 w-7 fill-yellow-400 text-yellow-600" />
            <strong className="text-lg">{i + 1}</strong>
          </span>
          <span className="rounded-full bg-white/75 px-2 text-sm font-bold text-emerald-950">
            {d} m
          </span>
          <Stars count={holeStars(holes[i] ?? [], i, lie, model)} />
        </div>
      ))}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-xl border border-emerald-200 bg-white/95 px-2 py-1 shadow-sm">
        <Coffee className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="text-xs font-bold">Halfway House</span>
      </div>
      {point && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full transition-[left,top] duration-700 ease-in-out motion-reduce:transition-none"
          style={{
            left: `calc(${point[0]}% + 24px)`,
            top: `calc(${point[1]}% - 16px)`,
          }}
          aria-label={
            cursor === "halfway" ? "Du är vid Halfway House" : `Du är vid hål ${Number(cursor) + 1}`
          }
        >
          <svg
            role="img"
            aria-label="Golfare"
            width="32"
            height="38"
            viewBox="0 0 32 38"
            className="drop-shadow-sm"
          >
            <circle cx="13" cy="7" r="4" fill="#f4c7a1" />
            <path d="M8 5q1-6 8-2l3 3H8" fill="#2563eb" />
            <path d="M12 13l6 7-4 7-7-4 1-9z" fill="#2563eb" />
            <path
              d="M15 15l7 9M10 16l10 9"
              stroke="#f4c7a1"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M9 25l-3 10m8-9 2 9" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <path d="M21 24l7 10h-5" fill="none" stroke="#475569" strokeWidth="1.5" />
            <circle cx="24" cy="36" r="1.5" fill="white" stroke="#94a3b8" />
          </svg>
        </div>
      )}
    </div>
  );
}
export function ChipStationPractice({ userId, authLoading = false, surface, onExit }: Props) {
  const [state, setState] = useState(emptyCourse);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
  const [confirmation, setConfirmation] = useState<{ ball: number; points: number } | null>(null);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
    },
    [],
  );
  const tapUntil = useRef(0);
  const key = courseStorageKey(userId);
  useEffect(() => {
    if (authLoading) {
      setReady(false);
      return;
    }
    let next = emptyCourse();
    try {
      next = parseCourse(localStorage.getItem(key));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    stateRef.current = next;
    setState(next);
    setRegistering(!!next.active?.holes.at(-1)?.length);
    setReviewId(null);
    setHistoryOpen(false);
    setConfirmation(null);
    setReady(true);
  }, [key, authLoading]);
  function commit(action: CourseAction) {
    if (!ready) return stateRef.current;
    const previous = stateRef.current;
    const next = reduceCourse(previous, action);
    if (next === previous) return previous;
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    if (previous.active && !next.active && next.history.some((r) => r.id === previous.active!.id))
      setReviewId(previous.active.id);
    return next;
  }
  const active = state.active;
  const round = reviewId ? state.history.find((r) => r.id === reviewId) : undefined;
  const lie = round?.lie ?? active?.lie ?? state.lie;
  const distances = courseDistances(round?.model ?? active?.model ?? 4);
  const index = active ? active.holes.length - 1 : 0;
  const shots = active?.holes[index] ?? [];
  const atHome = !active && !round && !historyOpen;
  function start() {
    tapUntil.current = 0;
    commit({ type: "start", id: uid(), at: Date.now() });
    setReviewId(null);
    setHistoryOpen(false);
    setRegistering(false);
    setConfirmation(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function next() {
    tapUntil.current = 0;
    commit({ type: "next", at: Date.now() });
    setRegistering(false);
    setConfirmation(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function finish() {
    commit({
      type: "finish",
      at: Date.now(),
    });
    setExitDialog(false);
    setRegistering(false);
    setConfirmation(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function back() {
    if (round) {
      setReviewId(null);
    } else if (historyOpen) {
      setHistoryOpen(false);
    } else if (active) {
      setExitDialog(true);
    } else onExit();
  }
  function score(points: ChipPoints) {
    if (Date.now() < tapUntil.current || stateRef.current.active?.phase !== "play") return;
    tapUntil.current = Date.now() + 550;
    const ball = stateRef.current.active.holes.at(-1)!.length + 1;
    commit({ type: "score", points });
    setConfirmation({ ball, points });
    if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
    confirmationTimer.current = setTimeout(() => setConfirmation(null), 1300);
  }
  const history = state.history.slice().reverse();
  const records = (["full", "front", "back"] as const).map((segment) => ({
    segment,
    best: courseRecord(state.history, state.lie, segment),
  }));
  const targets = holeTargets(index, lie, active?.model);
  const front = active ? segmentScore(active, "front") : null;
  const roundPosition = round ? state.history.findIndex((r) => r.id === round.id) : -1;
  const newRecords = round
    ? (["full", "front", "back"] as const).filter((segment) => {
        const value = segmentScore(round, segment);
        const before = courseRecord(
          state.history.slice(0, roundPosition),
          round.lie,
          segment,
          round.model,
        );
        return value && before && beatsScore(value, before);
      })
    : [];

  return (
    <main
      data-chip-course="v2"
      style={{ ...surface, colorScheme: "light" }}
      className={`chip-course mx-auto w-full max-w-md bg-slate-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] text-slate-950 ${active || round ? "chip-compact fixed inset-0 z-40 overflow-y-auto" : "min-h-screen"}`}
    >
      <style>{`@keyframes chipStarPop{0%{transform:scale(.65);opacity:.5}60%{transform:scale(1.3);filter:drop-shadow(0 0 7px #fbbf24)}100%{transform:scale(1);opacity:1}}@keyframes chipCheck{0%{transform:translateY(8px);opacity:0}100%{transform:translateY(0);opacity:1}}body:has(.chip-compact){overflow:hidden}.sg4-route-transition:has(.chip-compact){animation:none;transform:none;will-change:auto;min-height:0}.chip-compact [aria-label="Golfbanan: första tre, Halfway House, sista tre"]{height:clamp(190px,29dvh,250px);margin:12px 0}.chip-compact header button{min-height:40px;height:40px}.chip-compact [role="status"]{min-height:36px;margin-bottom:0}.chip-compact section>div.text-center{padding:16px}.chip-compact h2.my-3{margin:8px 0;font-size:48px}.chip-compact section>div.text-center p.mt-2{margin-top:4px}.chip-star-pop{animation:chipStarPop .55s ease-out}.chip-check{animation:chipCheck .2s ease-out}@media(prefers-reduced-motion:reduce){.chip-star-pop,.chip-check{animation:none}}`}</style>
      {!round && (
        <header className="mb-2 flex min-h-12 items-center justify-between gap-3">
          <button
            onClick={back}
            aria-label="Tillbaka"
            data-local-navigation
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-black">
            {historyOpen && !round ? "Dina rundor" : "Chipprundan"}
          </h1>
          <span className="w-12" aria-hidden="true" />
        </header>
      )}
      {!ready ? (
        <p role="status" className="py-10 text-center">
          Laddar din runda…
        </p>
      ) : (
        <>
          {storageError && (
            <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Rundan kunde inte sparas på enheten. Håll sidan öppen och{" "}
              <button
                className="min-h-11 font-bold underline"
                onClick={() => {
                  try {
                    localStorage.setItem(key, JSON.stringify(stateRef.current));
                    setStorageError(false);
                  } catch {
                    setStorageError(true);
                  }
                }}
              >
                försök spara igen
              </button>
              .
            </p>
          )}
          {atHome && (
            <>
              <section className={`${card} p-5`}>
                <h2 className="mb-4 text-xl font-black">Dags för en chippingrunda?</h2>
                <button className={primary} onClick={start}>
                  Starta rundan <ArrowRight className="h-5 w-5" />
                </button>
                <CourseMap holes={[]} lie={lie} cursor={0} />
              </section>
              <section className="mt-4">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Dina rekord
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {records.map(({ segment, best }) => (
                    <div key={segment} className={`${card} rounded-2xl px-2 py-4 text-center`}>
                      <p className="text-sm font-bold text-slate-600">{segmentNames[segment]}</p>
                      <p className="mt-2 text-xl font-black text-blue-700">
                        {best ? starLabel(best.stars / (segment === "full" ? 6 : 3)) : "–"} ★
                        <span className="block text-xs font-medium text-slate-500">
                          snitt / hål
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {best ? `${best.points} poäng` : "Inget resultat än"}
                      </p>
                    </div>
                  ))}
                </div>
                <button className={`${secondary} mt-4`} onClick={() => setHistoryOpen(true)}>
                  <History className="h-5 w-5" />
                  Tidigare rundor <span className="ml-auto text-slate-400">{history.length}</span>
                </button>
              </section>
              <button
                onClick={() => setRules(true)}
                className="mt-3 min-h-11 w-full text-sm font-bold text-slate-500"
              >
                Så spelar du
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">
                Rundor och rekord sparas på den här enheten.
              </p>
            </>
          )}
          {active && !round && (
            <>
              {!registering && active.phase !== "halfway" && (
                <CourseMap model={active.model} holes={active.holes} lie={lie} cursor={index} />
              )}
              {registering && (
                <div
                  className="mb-2 flex min-h-12 items-center justify-center"
                  role="status"
                  aria-live="polite"
                >
                  {confirmation && (
                    <div
                      key={`${index}-${confirmation.ball}`}
                      className="chip-check flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800"
                    >
                      <Check className="h-5 w-5" />
                      Boll {confirmation.ball} sparad · +{confirmation.points} p
                      {confirmation.ball < 3
                        ? ` → Boll ${confirmation.ball + 1}`
                        : " · Hålet klart"}
                    </div>
                  )}
                </div>
              )}
              {(active.phase === "play" || active.phase === "result") && (
                <section>
                  {!registering ? (
                    <>
                      <div className={`${card} p-5 text-center`}>
                        <p className="text-2xl font-black text-blue-700">Hål {index + 1} av 6</p>
                        <h2 className="my-3 text-6xl font-black">
                          {distances[index]}
                          <span className="ml-2 text-2xl">m</span>
                        </h2>
                        <p className="text-base font-bold">Tre bollar från samma plats</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Slå alla tre. Registrera sedan vid hålet.
                        </p>
                      </div>
                      <button className={`${primary} mt-4`} onClick={() => setRegistering(true)}>
                        Registrera resultat <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`${card} mt-1 p-4`}>
                        <div className="flex items-center justify-between">
                          <h2 className="font-black">
                            <span className="block text-base text-blue-700">
                              Hål {index + 1} av 6
                            </span>
                            <span className="text-3xl">{distances[index]} m</span>
                          </h2>
                          <p className="text-lg font-bold text-blue-700">
                            {holePoints(shots)}/12 p
                          </p>
                        </div>
                        <div className="mt-4 flex justify-center">
                          <Stars
                            count={holeStars(shots, index, lie, active.model)}
                            fills={
                              active.phase === "result"
                                ? undefined
                                : liveStars(holePoints(shots), targets, active.model)
                            }
                            large
                          />
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <h3 aria-live="polite" className="text-lg font-black">
                            {active.phase === "result"
                              ? "Hålet klart"
                              : `Boll ${shots.length + 1} av 3`}
                          </h3>
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${shots[i] === undefined ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white"}`}
                              >
                                {shots[i] === undefined ? i + 1 : `${shots[i]}p`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <h3 className="mb-2 mt-3 text-center text-base font-bold">
                        Hur långt ifrån hålet?
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {CHIP_ZONES.map((z) => (
                          <button
                            key={z.points}
                            onClick={() => score(z.points)}
                            disabled={active.phase === "result"}
                            className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 text-left disabled:opacity-45 ${z.points === 4 ? "col-span-2 border-blue-700 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-900"}`}
                          >
                            <span className="text-base font-bold">{z.label}</span>
                            <strong className="text-xl">{z.points} p</strong>
                          </button>
                        ))}
                      </div>
                      {active.phase === "result" && (
                        <button
                          onClick={next}
                          className={`${primary} mt-3`}
                          disabled={!!confirmation}
                        >
                          {index === 2
                            ? "Till Halfway House"
                            : index === 5
                              ? "Avsluta rundan"
                              : `Nästa hål · ${distances[index + 1]} m`}
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          tapUntil.current = 0;
                          commit({ type: "undo" });
                          setConfirmation(null);
                        }}
                        disabled={!shots.length}
                        className="mt-3 flex min-h-12 items-center gap-2 text-sm font-bold text-slate-500 disabled:opacity-30"
                      >
                        <Undo2 className="h-4 w-4" />
                        Ångra senaste
                      </button>
                    </>
                  )}
                </section>
              )}
              {active.phase === "halfway" && front && (
                <section>
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
                    <Coffee className="mx-auto h-9 w-9 text-amber-700" />
                    <h2 className="mt-3 text-2xl font-black">Halfway House</h2>
                    <p className="mt-2 text-base text-slate-600">
                      {front.stars >= 7.5
                        ? "Strålande! Fortsätt så."
                        : front.stars >= 4.5
                          ? "Bra jobbat! Redo för sista tre?"
                          : "Bra kämpat! Nästa hål, ny chans."}
                    </p>
                    <p className="mt-3 text-5xl font-black text-blue-700">
                      {starLabel(front.stars / 3)} ★
                      <span className="mt-2 block text-sm font-medium text-slate-500">
                        snitt / hål · {front.points} poäng totalt
                      </span>
                    </p>
                  </div>
                  <button
                    className={`${primary} mt-4`}
                    onClick={() => {
                      commit({ type: "continue" });
                      setRegistering(false);
                    }}
                  >
                    Sista 3 hålen <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    className="mt-2 min-h-12 w-full text-sm font-medium text-slate-500"
                    onClick={finish}
                  >
                    Avsluta halv runda
                  </button>
                </section>
              )}
            </>
          )}
          {historyOpen && !round && !active && (
            <section>
              <p className="mb-4 text-sm text-slate-500">Stjärnor först, poäng vid lika.</p>
              {!history.length ? (
                <div className={`${card} p-6 text-center`}>
                  <Flag className="mx-auto h-8 w-8 text-blue-600" />
                  <h2 className="mt-3 text-xl font-black">Din första runda väntar</h2>
                  <p className="mt-2 text-base text-slate-500">
                    Spela första tre eller hela rundan för att börja din historik.
                  </p>
                  <button onClick={start} className={`${primary} mt-5`}>
                    Starta på 8 m
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setReviewId(r.id);
                        window.scrollTo({ top: 0, behavior: "instant" });
                      }}
                      className={`${card} flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left`}
                    >
                      <span>
                        <span className="block text-base font-bold">
                          {r.status === "full"
                            ? "Hela rundan"
                            : r.status === "front"
                              ? "Första tre"
                              : `${r.holes.length} hål · avbruten`}
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          {r.model !== 4 ? "Tidigare bana · " : ""}
                          {dateLabel(r.finishedAt)} ·{" "}
                          {r.holes.reduce((s, h) => s + holePoints(h), 0)} p
                        </span>
                        <span className="mt-1 block text-sm font-bold text-emerald-700">
                          Est. chipp-HCP {handicapLabel(courseHandicap(r)!)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-lg font-black text-blue-700">
                        {starLabel(roundStars(r) / r.holes.length)} ★ snitt
                        <ChevronRight className="h-5 w-5" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
          {round && (
            <section>
              <div className={`${card} p-6 text-center`}>
                <Trophy className="mx-auto h-9 w-9 text-amber-500" />
                <h2 className="mt-3 text-3xl font-black">
                  {round.status === "full"
                    ? "Rundan klar"
                    : round.status === "front"
                      ? "Rundan klar"
                      : "Din sparade runda"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {dateLabel(round.finishedAt)} · {round.holes.length * 3} bollar
                </p>
                <p className="my-4 text-5xl font-black text-blue-700">
                  {starLabel(roundStars(round) / round.holes.length)} ★
                  <span className="mt-2 block text-sm font-medium text-slate-500">
                    snittstjärnor per hål
                  </span>
                </p>
                <p className="text-base font-bold text-emerald-700">
                  {round.holes.reduce((sum, shots) => sum + holePoints(shots), 0)} poäng totalt
                </p>
                {newRecords.length > 0 && (
                  <p className="rounded-xl bg-amber-50 p-3 text-base font-bold text-amber-800">
                    Nytt rekord ·{" "}
                    {newRecords.map((s) => segmentNames[s].toLowerCase()).join(" och ")}
                  </p>
                )}
                {round.status === "partial" && (
                  <p className="text-sm text-slate-500">
                    Avslutad före nästa delmål. Endast färdiga hål visas.
                  </p>
                )}
              </div>
              <div className="mt-4">
                <ActivityReview
                  compact
                  input={{
                    title: "Estimerat chipp-HCP",
                    handicap: courseHandicap(round),
                    modelId: "chip-course-proximity-v1",
                    summary: `${round.holes.length * 3} chippar`,
                    outcomes: round.holes.flatMap((h, i) =>
                      h.map((points, j) => ({
                        label: `Hål ${i + 1} · boll ${j + 1}`,
                        context: `${courseDistances(round.model)[i]} m`,
                        result: CHIP_ZONES.find((z) => z.points === points)!.label,
                        rank: 4 - points,
                        category: ACTIVITY_CATEGORIES[4 - points],
                        basis:
                          "Registrerad poängzon. Avstånd och underlag är inte viktade i analysen.",
                      })),
                    ),
                  }}
                />
              </div>
              <button className={`${secondary} mt-3`} onClick={start}>
                Ny runda <ArrowRight className="h-5 w-5" />
              </button>
              <button
                className={`${secondary} mt-3`}
                onClick={() => {
                  setReviewId(null);
                  setHistoryOpen(true);
                }}
              >
                Alla rundor
              </button>
              <button
                className={`${secondary} mt-3`}
                onClick={() => {
                  setReviewId(null);
                  setHistoryOpen(false);
                }}
              >
                Till banan
              </button>
            </section>
          )}
        </>
      )}
      <Dialog open={exitDialog} onOpenChange={setExitDialog}>
        <DialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-3xl bg-white text-slate-950">
          <DialogTitle>
            {active?.phase === "halfway" ? "Spara första tre?" : "Pausa eller avsluta?"}
          </DialogTitle>
          <DialogDescription>
            Du kan lämna sidan och fortsätta senare. Om du avslutar sparas färdiga hål;
            ofullständiga hål räknas inte.
          </DialogDescription>
          <button
            className={primary}
            onClick={() => {
              setExitDialog(false);
              onExit();
            }}
          >
            Pausa och lämna
          </button>
          <button className={secondary} onClick={finish}>
            Avsluta och spara
          </button>
          <button
            className="min-h-12 text-sm font-bold text-slate-500"
            onClick={() => setExitDialog(false)}
          >
            Fortsätt spela
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-white text-slate-950">
          <DialogTitle>Så spelar du</DialogTitle>
          <DialogDescription>
            Slå 3 bollar från avståndet på skärmen. Tryck sedan hur nära hålet varje boll stannade.
          </DialogDescription>
          <p className="text-sm">
            Närmare hålet = fler poäng. 3 poäng fyller en stjärna. Max 3 stjärnor per hål.
          </p>
          <p className="text-sm">Efter 3 hål: avsluta eller spela 3 till.</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
