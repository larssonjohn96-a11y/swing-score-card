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
  TreePine,
  Undo2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChipAnalysis } from "./chip-analysis";
import { ChipCelebration } from "./chip-celebration";
import { useChipScreenColor } from "@/lib/use-chip-screen-color";
import { ChipProgress } from "./chip-progress";
import { CHIP_ZONES, type ChipLie, type ChipPoints } from "@/lib/chip-stations";
import {
  courseDistances,
  courseHandicap,
  liveStars,
  courseBests,
  coursePace,
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
} from "@/lib/chip-course";

type Props = {
  userId: string | null;
  playerName?: string;
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
const starLabel = (value: number) => value.toFixed(1).replace(".", ",");
const uid = () => crypto.randomUUID();
const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
function Stars({
  count = 0,
  large = false,
  fills,
  celebrate = false,
  zero = false,
}: {
  count?: number;
  large?: boolean;
  fills?: number[];
  celebrate?: boolean;
  zero?: boolean;
}) {
  const values = fills ?? [0, 1, 2].map((i) => Math.max(0, Math.min(1, count - i)));
  return (
    <span
      className={`inline-flex gap-1.5 ${values.every((v) => v === 1) ? "chip-full-stars" : ""}`}
      aria-label={`${starLabel(values.reduce((sum, v) => sum + v, 0))} av 3 stjärnor`}
    >
      {values.map((fill, i) => (
        <span
          key={i}
          style={celebrate ? { animationDelay: `${i * 400 + 1200}ms` } : undefined}
          className={`relative block ${large ? "h-11 w-11" : "h-4 w-4"} ${celebrate && fill === 0 ? "chip-empty-wiggle" : ""} `}
        >
          <Star
            aria-hidden="true"
            className={`h-full w-full ${zero ? "fill-slate-500 text-slate-600" : "fill-white/70 text-slate-300"}`}
          />
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
function RevealStars({ count }: { count: number }) {
  const [fills, setFills] = useState([0, 0, 0]);
  useEffect(() => {
    const values = [0, 1, 2].map((i) => Math.max(0, Math.min(1, count - i)));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFills(values);
      return;
    }
    setFills([0, 0, 0]);
    const timers = values.map((fill, i) =>
      setTimeout(() => setFills((old) => old.map((v, j) => (i === j ? fill : v))), 200 + i * 500),
    );
    return () => timers.forEach(clearTimeout);
  }, [count]);
  return <Stars fills={fills} large celebrate zero={count === 0} />;
}
function RecordRow({ best }: { best: ReturnType<typeof courseBests> }) {
  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-2xl border border-blue-100 bg-white p-3 text-center"
      aria-label="High score"
    >
      {[
        ["Hel runda", best.points === null ? "–" : `${best.points} p`],
        ["Bästa snitt · 6 hål", best.average === null ? "–" : `${starLabel(best.average)} ★`],
        ["Bästa hål", best.hole === null ? "–" : `${best.hole} p`],
      ].map(([label, value]) => (
        <div key={label}>
          <p className="text-xl font-black text-blue-700">{value}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">{label}</p>
        </div>
      ))}
    </div>
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
      <TreePine
        aria-hidden="true"
        className="absolute left-[5%] top-[44%] h-8 w-8 fill-emerald-300 text-emerald-700"
      />
      <TreePine
        aria-hidden="true"
        className="absolute right-[3%] top-[43%] h-10 w-10 fill-emerald-400/60 text-emerald-700"
      />
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
          <Stars
            count={holeStars(holes[i] ?? [], i, lie, model)}
            zero={holes[i]?.length === 3 && holePoints(holes[i]) === 0}
          />
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
export function ChipStationPractice({
  userId,
  playerName = "Du",
  authLoading = false,
  surface,
  onExit,
}: Props) {
  const [state, setState] = useState(emptyCourse);
  const stateRef = useRef(state);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [freshRound, setFreshRound] = useState<string | null>(null);
  const [holedShot, setHoledShot] = useState<number | null>(null);
  useChipScreenColor(holedShot !== null);
  useEffect(() => {
    if (holedShot === null) return;
    const timer = setTimeout(() => setHoledShot(null), 2700);
    return () => clearTimeout(timer);
  }, [holedShot]);
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
    if (previous.active && !next.active && next.history.some((r) => r.id === previous.active!.id)) {
      setReviewId(previous.active.id);
      setFreshRound(previous.active.id);
    }
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
    if (
      Date.now() < tapUntil.current ||
      holedShot !== null ||
      stateRef.current.active?.phase !== "play"
    )
      return;
    tapUntil.current = Date.now() + 550;
    const ball = stateRef.current.active.holes.at(-1)!.length + 1;
    commit({ type: "score", points });
    setConfirmation({ ball, points });
    if (points === 4) setHoledShot(Date.now());
    if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
    confirmationTimer.current = setTimeout(() => setConfirmation(null), 1300);
  }
  const history = state.history.slice().reverse();
  const targets = holeTargets(index, lie, active?.model);
  const front = active ? segmentScore(active, "front") : null;
  const best = courseBests(state.history);
  const pace = active ? coursePace(active, state.history) : null;
  const totalPoints = active?.holes.reduce((sum, h) => sum + holePoints(h), 0) ?? 0;
  const completed = active?.holes.filter((h) => h.length === 3).length ?? 0;
  const avgStars = active && completed ? roundStars(active) / completed : 0;
  const previous = round
    ? state.history.slice(
        0,
        state.history.findIndex((r) => r.id === round.id),
      )
    : [];
  const before = courseBests(previous, round?.model);
  const roundPoints = round?.holes.reduce((sum, h) => sum + holePoints(h), 0) ?? 0;
  const roundAverage = round ? roundStars(round) / round.holes.length : 0;
  const personalBest =
    !!round &&
    ((round.status === "full" &&
      ((before.points !== null && roundPoints > before.points) ||
        (before.average !== null && roundAverage > before.average))) ||
      (before.hole !== null && Math.max(...round.holes.map(holePoints)) > before.hole));

  return (
    <main
      data-chip-course="v2"
      style={{ ...surface, colorScheme: "light" }}
      className={`chip-course mx-auto w-full max-w-md bg-slate-50 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] text-slate-950 ${active || round ? "chip-compact fixed inset-0 z-40 overflow-y-auto" : "min-h-screen"}`}
    >
      <style>{`.chip-full-stars > span{filter:drop-shadow(0 0 4px #fbbf24) drop-shadow(0 0 9px #f59e0b88)}.chip-full-stars svg.fill-amber-400{fill:#fbbf24;stroke:#eab308}@keyframes chipHoled{0%{opacity:0}15%,80%{opacity:1}100%{opacity:0}}.chip-holed{animation:chipHoled 2.7s ease-in-out both}@media(prefers-reduced-motion:reduce){.chip-holed{animation:none}}@keyframes chipEmptyWiggle{0%,100%{transform:rotate(0)}35%{transform:rotate(-9deg)}70%{transform:rotate(9deg)}}.chip-empty-wiggle{animation:chipEmptyWiggle .5s ease-in-out}.chip-compact [role="status"]{height:36px}.chip-compact section>div.mt-1{padding:12px}.chip-compact section>div.mt-1 .mt-4{margin-top:8px}@keyframes chipStarPop{0%{transform:scale(.65);opacity:.5}60%{transform:scale(1.3);filter:drop-shadow(0 0 7px #fbbf24)}100%{transform:scale(1);opacity:1}}@keyframes chipCheck{0%{transform:translateY(8px);opacity:0}100%{transform:translateY(0);opacity:1}}body:has(.chip-compact){overflow:hidden}.sg4-route-transition:has(.chip-compact){animation:none;transform:none;will-change:auto;min-height:0}.chip-compact [aria-label="Golfbanan: första tre, Halfway House, sista tre"]{height:clamp(190px,29dvh,250px);margin:12px 0}.chip-compact header button{min-height:40px;height:40px}.chip-compact [role="status"]{min-height:36px;margin-bottom:0}.chip-compact section>div.text-center{padding:16px}.chip-compact h2.my-3{margin:8px 0;font-size:48px}.chip-compact section>div.text-center p.mt-2{margin-top:4px}.chip-star-pop{animation:chipStarPop .55s ease-out}.chip-check{animation:chipCheck .2s ease-out}@media(prefers-reduced-motion:reduce){.chip-star-pop,.chip-check,.chip-confetti,.chip-empty-wiggle{animation:none}.chip-confetti{display:none}}`}</style>
      {personalBest && freshRound === round?.id && <ChipCelebration />}
      {holedShot !== null && (
        <div
          data-holed-celebration
          className="chip-holed pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-600 text-white"
        >
          <ChipCelebration />
          <div className="relative text-center">
            <Flag className="mx-auto h-14 w-14 fill-yellow-400 text-yellow-400" />
            <p className="mt-4 text-6xl font-black">Sänkt!</p>
            <p className="mt-3 text-2xl font-bold">+4 poäng</p>
          </div>
        </div>
      )}
      {!round && !active && (
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
          {atHome ? (
            <button
              onClick={() => setRules(true)}
              className="min-h-11 max-w-24 text-right text-sm font-bold leading-tight text-blue-700"
            >
              Så här spelar du
            </button>
          ) : (
            <span className="w-12" aria-hidden="true" />
          )}
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
                <RecordRow best={best} />
                <ChipProgress history={state.history} />
                <button className={`${secondary} mt-4`} onClick={() => setHistoryOpen(true)}>
                  <History className="h-5 w-5" />
                  Tidigare rundor <span className="ml-auto text-slate-400">{history.length}</span>
                </button>
              </section>
              <p className="mt-3 text-center text-xs text-slate-400">
                Rundor och rekord sparas på den här enheten.
              </p>
            </>
          )}
          {active && !round && (
            <>
              <header className="mb-3 flex min-h-20 overflow-hidden rounded-2xl border border-blue-600 bg-white shadow-sm">
                <div
                  className="relative flex min-w-0 flex-1 items-center gap-1 bg-blue-600 pl-1 pr-5 text-white"
                  style={{ clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" }}
                >
                  <button
                    aria-label="Tillbaka"
                    data-local-navigation
                    onClick={back}
                    className="flex h-10 w-10 shrink-0 items-center justify-center !border-0 !bg-transparent !text-white"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="truncate text-lg font-black">{playerName}</span>
                </div>
                <div className="grid shrink-0 grid-cols-2 items-center gap-4 px-3 text-center text-blue-700">
                  <div>
                    <p className="flex items-center justify-center gap-1 text-2xl font-black">
                      {totalPoints}
                      {pace?.onPace && <Trophy className="h-4 w-4 text-amber-500" />}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">POÄNG</p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-xl font-black">
                      {starLabel(avgStars)} ★
                      {pace?.averageOnPace && <Trophy className="h-4 w-4 text-amber-500" />}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">SNITT / HÅL</p>
                  </div>
                </div>
              </header>
              {!registering && active.phase !== "halfway" && (
                <CourseMap model={active.model} holes={active.holes} lie={lie} cursor={index} />
              )}
              {registering && (
                <div
                  className="mb-2 flex min-h-12 items-center justify-center"
                  role="status"
                  aria-live="polite"
                >
                  {!confirmation &&
                    active.phase === "result" &&
                    holeStars(shots, index, lie, active.model) === 3 && (
                      <div className="chip-check px-4 py-2 text-sm font-black text-amber-800">
                        Full pott! Tre stjärnor! ★
                      </div>
                    )}
                  {confirmation && (
                    <div
                      key={`${index}-${confirmation.ball}`}
                      className={`chip-check flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold ${confirmation.points === 0 ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}
                    >
                      {
                        [
                          "Nästa sitter! ",
                          "Bra kämpat! ",
                          "Bra närspel! ",
                          "Riktigt bra! ",
                          "Fullträff! ",
                        ][confirmation.points]
                      }
                      {CHIP_ZONES.find((z) => z.points === confirmation.points)?.label}, +
                      {confirmation.points} poäng
                    </div>
                  )}
                </div>
              )}
              {(active.phase === "play" || active.phase === "result") && (
                <section>
                  {!registering ? (
                    <>
                      <div className={`${card} p-5 text-center`}>
                        <p className="text-2xl font-black text-blue-700">Hål {index + 1}</p>
                        <h2 className="my-3 text-6xl font-black">
                          {distances[index]}
                          <span className="ml-2 text-2xl">m</span>
                        </h2>
                        <p className="text-base font-bold">Tre bollar från samma plats</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {distances[index]} m från flaggan
                        </p>
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
                            <span className="block text-base text-blue-700">Hål {index + 1}</span>
                            <span className="text-sm text-slate-500">
                              {distances[index]} m från flaggan
                            </span>
                          </h2>
                          <p className="text-lg font-bold text-blue-700">
                            {holePoints(shots)} poäng
                          </p>
                        </div>
                        <div className="mt-4 flex justify-center">
                          <Stars
                            zero={active.phase === "result" && holePoints(shots) === 0}
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
                                {shots[i] === undefined ? i + 1 : <Check className="h-4 w-4" />}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <h3 className="mb-2 mt-3 text-center text-base font-bold">
                        Hur långt ifrån hålet?
                      </h3>
                      <div
                        className="relative grid grid-cols-5 gap-1.5 py-2"
                        aria-label="Avstånd från hålet"
                      >
                        <div
                          aria-hidden="true"
                          className="absolute left-[8%] right-[8%] top-11 h-1 rounded-full bg-blue-300"
                        />
                        {CHIP_ZONES.map((z) => (
                          <button
                            key={z.points}
                            aria-label={z.label}
                            onClick={() => score(z.points)}
                            disabled={active.phase === "result" || holedShot !== null}
                            className="relative flex min-h-28 flex-col items-center justify-start gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50/70 px-1 py-3 text-sm font-black text-blue-900 active:bg-blue-200 disabled:opacity-45"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-white">
                              {z.points === 4 ? (
                                <Flag className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                              )}
                            </span>
                            <span className="leading-tight">{z.label}</span>
                          </button>
                        ))}
                      </div>
                      {active.phase === "result" && (
                        <button
                          onClick={next}
                          className={`${primary} mt-3`}
                          disabled={!!confirmation || holedShot !== null}
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
                        disabled={!shots.length || holedShot !== null}
                        className="mt-1 flex min-h-11 items-center gap-2 text-sm font-bold text-slate-500 disabled:opacity-30"
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
                      {pace?.ahead
                        ? "Över PB-tempo! Håller det hela vägen?"
                        : pace?.onPace
                          ? "Du håller PB-tempo. Fortsätt så!"
                          : pace?.near
                            ? "Du är nära PB-tempot. Det finns en chans!"
                            : front.stars >= 7.5
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
              <div className="sticky top-0 z-20 mb-4 bg-slate-50 py-2">
                <RecordRow best={best} />
              </div>
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
                <div className="my-4 flex justify-center">
                  <RevealStars key={round.id} count={roundAverage} />
                </div>
                {roundAverage >= 3 && (
                  <p className="mb-2 px-3 py-2 text-sm font-black text-amber-800">
                    Full pott! Vilken runda!
                  </p>
                )}
                <p className="text-3xl font-black text-blue-700">
                  {starLabel(roundAverage)}{" "}
                  <span className="text-sm font-medium text-slate-500">★ snitt / hål</span>
                </p>
                <p className="mt-3 text-xl font-black text-slate-900">{roundPoints} poäng totalt</p>
                {personalBest && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-2 text-sm font-bold text-amber-800">
                    <Trophy aria-hidden="true" className="mr-1 inline h-4 w-4" /> Nytt personbästa!
                  </p>
                )}
                {round.status === "partial" && (
                  <p className="text-sm text-slate-500">
                    Avslutad före nästa delmål. Endast färdiga hål visas.
                  </p>
                )}
              </div>
              <div className="mt-4">
                <ChipAnalysis round={round} />
              </div>
              <button
                className={`${secondary} mt-3 !border-slate-950 !bg-slate-950 !text-white`}
                onClick={start}
              >
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
                data-local-navigation
                className={`${secondary} mt-3`}
                onClick={() => {
                  setReviewId(null);
                  setHistoryOpen(false);
                }}
              >
                Tillbaka
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
          <DialogTitle className="text-2xl font-black">Så här spelar du</DialogTitle>
          <DialogDescription className="sr-only">Tre enkla steg för chipprundan.</DialogDescription>
          <ol className="space-y-4 text-lg leading-snug">
            <li>
              <strong>1. Gå till avståndet.</strong>
              <br />
              Mät från flaggan.
            </li>
            <li>
              <strong>2. Slå tre bollar.</strong>
              <br />
              Från samma plats.
            </li>
            <li>
              <strong>3. Tryck på avståndet kvar.</strong>
              <br />
              En gång för varje boll.
            </li>
          </ol>
          <p className="rounded-2xl bg-blue-50 p-4 text-base font-bold text-blue-800">
            Närmare hålet = fler poäng.
            <br />3 poäng = 1 stjärna.
          </p>
          <p className="text-base text-slate-500">Efter 3 hål: avsluta eller spela 3 till.</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
