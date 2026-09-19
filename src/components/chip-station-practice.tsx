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
  UserRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityReview } from "@/components/activity-review";
import { ACTIVITY_CATEGORIES } from "@/lib/activity-review";
import { supabase } from "@/integrations/supabase/client";
import { CHIP_ZONES, type ChipLie, type ChipPoints } from "@/lib/chip-stations";
import {
  COURSE_DISTANCES,
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
  type CourseRound,
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
const lieName = (lie: ChipLie) => (lie === "Fairway" ? "Kortklippt" : "Ruff");
const segmentNames: Record<Segment, string> = {
  full: "Hela rundan",
  front: "Första tre",
  back: "Sista tre",
};
const uid = () => crypto.randomUUID();
const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
function Stars({ count, large = false }: { count: number; large?: boolean }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${count} av 3 stjärnor`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${large ? "h-9 w-9" : "h-4 w-4"} ${n <= count ? "fill-amber-400 text-amber-500" : "fill-slate-100 text-slate-300"}`}
        />
      ))}
    </span>
  );
}
const positions = [
  [16, 19],
  [50, 19],
  [84, 19],
  [84, 81],
  [50, 81],
  [16, 81],
];
function CourseMap({
  holes,
  lie,
  cursor,
  avatar,
}: {
  holes: ChipPoints[][];
  lie: ChipLie;
  cursor: number | "halfway" | null;
  avatar: string | null;
}) {
  const point =
    cursor === "halfway" ? [12, 50] : typeof cursor === "number" ? positions[cursor] : null;
  return (
    <div
      className="relative my-4 h-[280px] rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white"
      aria-label="Banan: hål 1 till 3, Halfway House, hål 4 till 6"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 320 280"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M51 53 H269 Q302 105 226 123 L160 140 L226 157 Q302 175 269 227 H51"
          fill="none"
          stroke="#dbeafe"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M51 53 H269 Q302 105 226 123 L160 140 L226 157 Q302 175 269 227 H51"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2"
          strokeDasharray="4 7"
        />
      </svg>
      {COURSE_DISTANCES.map((distance, i) => {
        const complete = holes[i]?.length === 3;
        const active = cursor === i;
        return (
          <div
            key={distance}
            style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border-b-4 text-lg font-black ${active ? "border-blue-800 bg-blue-600 text-white ring-4 ring-blue-100" : complete ? "border-blue-200 bg-blue-100 text-blue-800" : "border-slate-200 bg-white text-slate-500"}`}
              aria-label={`Hål ${i + 1}, ${distance} meter${complete ? `, ${holeStars(holes[i], i, lie)} stjärnor` : ""}`}
            >
              {i + 1}
            </span>
            <span className="text-sm font-bold text-slate-600">{distance} m</span>
            <Stars count={holeStars(holes[i] ?? [], i, lie)} />
          </div>
        );
      })}
      <div
        className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border px-3 py-2 ${cursor === "halfway" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
      >
        <Coffee className="h-5 w-5 text-amber-700" />
        <span className="text-sm font-bold">Halfway House</span>
      </div>
      {point && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full transition-[left,top] duration-700 ease-in-out motion-reduce:transition-none"
          style={{
            left: `${point[0]}%`,
            top: `calc(${point[1]}% + ${cursor === "halfway" ? 20 : -24}px)`,
          }}
          aria-label={
            cursor === "halfway" ? "Du är vid Halfway House" : `Du är vid hål ${Number(cursor) + 1}`
          }
        >
          <Avatar className="h-10 w-10 border-[3px] border-white bg-blue-700 shadow-md">
            <AvatarImage src={avatar ?? undefined} alt="Din avatar" />
            <AvatarFallback className="bg-blue-700 text-white">
              <UserRound className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}
function Scorecard({ round }: { round: Pick<CourseRound, "holes" | "lie"> }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
        <span>Hål</span>
        <span>Poäng</span>
        <span>Stjärnor</span>
      </div>
      {round.holes.map((shots, i) =>
        shots.length === 3 ? (
          <div
            key={i}
            className="grid min-h-12 grid-cols-[1fr_1fr_1fr] items-center gap-2 border-b border-slate-100 px-4 py-2 last:border-0"
          >
            <span className="text-sm font-bold">
              {i + 1} · {COURSE_DISTANCES[i]} m
            </span>
            <strong>{holePoints(shots)}/12</strong>
            <Stars count={holeStars(shots, i, round.lie)} />
          </div>
        ) : null,
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
  const [avatar, setAvatar] = useState<string | null>(null);
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
    setRegistering(next.active?.phase === "play" && !!next.active.holes.at(-1)?.length);
    setReviewId(null);
    setHistoryOpen(false);
    setReady(true);
  }, [key, authLoading]);
  useEffect(() => {
    setAvatar(null);
    if (!userId) return;
    let alive = true;
    void supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setAvatar(data?.avatar_url ?? null);
      });
    return () => {
      alive = false;
    };
  }, [userId]);
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
  const index = active ? active.holes.length - 1 : 0;
  const shots = active?.holes[index] ?? [];
  const stars = active ? roundStars(active) : 0;
  const atHome = !active && !round && !historyOpen;
  function start() {
    commit({ type: "start", id: uid(), at: Date.now() });
    setReviewId(null);
    setHistoryOpen(false);
    setRegistering(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function next() {
    commit({ type: "next", at: Date.now() });
    setRegistering(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function finish() {
    commit({ type: "finish", at: Date.now() });
    setExitDialog(false);
    setRegistering(false);
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
    if (Date.now() < tapUntil.current) return;
    tapUntil.current = Date.now() + 300;
    commit({ type: "score", points });
  }
  const history = state.history
    .filter((r) => r.lie === state.lie)
    .slice()
    .reverse();
  const records = (["full", "front", "back"] as const).map((segment) => ({
    segment,
    best: courseRecord(state.history, state.lie, segment),
  }));
  const targets = holeTargets(index, lie);
  const earned = holeStars(shots, index, lie);
  const front = active ? segmentScore(active, "front") : null;
  const oldFront = courseRecord(state.history, lie, "front");
  const roundPosition = round ? state.history.findIndex((r) => r.id === round.id) : -1;
  const newRecords = round
    ? (["full", "front", "back"] as const).filter((segment) => {
        const value = segmentScore(round, segment);
        const before = courseRecord(state.history.slice(0, roundPosition), round.lie, segment);
        return value && before && beatsScore(value, before);
      })
    : [];

  return (
    <main
      data-chip-course="v1"
      style={{ ...surface, colorScheme: "light" }}
      className="mx-auto min-h-screen w-full max-w-md bg-slate-50 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] text-slate-950"
    >
      <header className="mb-4 flex min-h-14 items-center justify-between gap-3">
        <button
          onClick={back}
          aria-label="Tillbaka"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black">
          {historyOpen && !round ? "Dina rundor" : "Chipprundan"}
        </h1>
        <button onClick={() => setRules(true)} className="min-h-12 text-sm font-bold text-blue-700">
          Regler
        </button>
      </header>
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
          {(atHome || (historyOpen && !round)) && (
            <div
              aria-label="Underlag"
              className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/70 p-1.5"
            >
              {(["Fairway", "Ruff"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={state.lie === value}
                  onClick={() => commit({ type: "lie", lie: value })}
                  className={`min-h-12 rounded-xl text-base font-bold ${state.lie === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}
                >
                  {lieName(value)}
                </button>
              ))}
            </div>
          )}
          {atHome && (
            <>
              <section className={`${card} p-5`}>
                <p className="text-sm font-bold text-blue-700">EN RUNDA. SEX HÅL.</p>
                <h2 className="mt-2 text-2xl font-black">Hur många stjärnor tar du?</h2>
                <p className="mb-5 mt-2 text-base text-slate-500">
                  3 bollar per hål. Paus efter första tre.
                </p>
                <button className={primary} onClick={start}>
                  Starta runda · hål 1 <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-3 text-center text-sm text-slate-500">
                  Börja på 8 m · {lieName(lie)}
                </p>
              </section>
              <CourseMap holes={[]} lie={lie} cursor={0} avatar={avatar} />
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Dina rekord
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {records.map(({ segment, best }) => (
                    <div key={segment} className={`${card} rounded-2xl px-2 py-4 text-center`}>
                      <p className="text-sm font-bold text-slate-600">{segmentNames[segment]}</p>
                      <p className="mt-2 text-xl font-black text-blue-700">
                        {best?.stars ?? "–"}
                        <span className="text-sm text-slate-400">
                          /{segment === "full" ? 18 : 9}
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
              <p className="mt-5 text-center text-sm leading-6 text-slate-500">
                {lie === "Fairway"
                  ? "Spela från kortklippt gräs utanför greenen."
                  : "Spela från längre gräs med bollen synlig."}{" "}
                Samma underlag hela rundan.
              </p>
              <p className="mt-3 text-center text-xs text-slate-400">
                Rundor och rekord sparas på den här enheten.
              </p>
            </>
          )}
          {active && !round && (
            <>
              <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                <span>
                  {active.phase === "halfway"
                    ? "FÖRSTA TRE KLARA"
                    : `HÅL ${index + 1} AV 6 · ${lieName(lie)}`}
                </span>
                <span className="flex items-center gap-1 text-amber-700">
                  <Star className="h-4 w-4 fill-amber-400" />
                  {stars}/{active.phase === "halfway" ? 9 : 18}
                </span>
              </div>
              {!registering && (
                <CourseMap
                  holes={active.holes}
                  lie={lie}
                  cursor={active.phase === "halfway" ? "halfway" : index}
                  avatar={avatar}
                />
              )}
              {active.phase === "play" && (
                <section>
                  {!registering ? (
                    <>
                      <div className={`${card} p-5 text-center`}>
                        <p className="text-sm font-bold text-blue-700">
                          HÅL {index + 1} · {lieName(lie)}
                        </p>
                        <h2 className="my-3 text-6xl font-black">
                          {COURSE_DISTANCES[index]}
                          <span className="ml-2 text-2xl">m</span>
                        </h2>
                        <p className="text-base font-bold">Tre bollar från samma plats</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Slå alla tre. Registrera sedan vid hålet.
                        </p>
                        <div className="mt-4 flex justify-center gap-5">
                          {targets.map((p, i) => (
                            <div key={p} className="text-center">
                              <p className="text-sm font-bold text-amber-600">
                                {"★".repeat(i + 1)}
                              </p>
                              <p className="text-sm text-slate-500">{p} p</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className={`${primary} mt-4`} onClick={() => setRegistering(true)}>
                        Registrera resultat <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={`${card} mt-5 p-5`}>
                        <div className="flex items-center justify-between">
                          <h2 className="text-3xl font-black">{COURSE_DISTANCES[index]} m</h2>
                          <p className="text-lg font-bold text-blue-700">
                            {holePoints(shots)}/12 p
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <h3 aria-live="polite" className="text-lg font-black">
                            Boll {shots.length + 1} av 3
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
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {CHIP_ZONES.map((z) => (
                          <button
                            key={z.points}
                            onClick={() => {
                              score(z.points);
                              if (stateRef.current.active?.phase === "result") {
                                setRegistering(false);
                                window.scrollTo({ top: 0, behavior: "instant" });
                              }
                            }}
                            className={`flex min-h-16 items-center justify-between rounded-2xl border px-4 text-left ${z.points === 4 ? "col-span-2 border-blue-700 bg-blue-600 text-white" : "border-blue-200 bg-blue-50 text-blue-900"}`}
                          >
                            <span className="text-base font-bold">{z.label}</span>
                            <strong className="text-xl">{z.points} p</strong>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => commit({ type: "undo" })}
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
              {active.phase === "result" && (
                <section>
                  <div
                    className={`${card} p-5 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300`}
                  >
                    <p className="text-sm font-bold text-slate-500">
                      HÅL {index + 1} · {COURSE_DISTANCES[index]} M
                    </p>
                    <div className="my-4 flex justify-center">
                      <Stars count={earned} large />
                    </div>
                    <h2 className="text-2xl font-black">
                      {earned === 3
                        ? "Full pott på hålet!"
                        : earned > 0
                          ? `${earned} ${earned === 1 ? "stjärna" : "stjärnor"} på hålet`
                          : "Nästa hål, ny chans"}
                    </h2>
                    <p className="mt-2 text-base text-slate-500">{holePoints(shots)} av 12 poäng</p>
                  </div>
                  <button onClick={next} className={`${primary} mt-4`}>
                    {index === 2
                      ? "Till Halfway House"
                      : index === 5
                        ? "Se din runda"
                        : `Nästa hål · ${COURSE_DISTANCES[index + 1]} m`}
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      commit({ type: "undo" });
                      setRegistering(true);
                    }}
                    className="mt-2 min-h-12 w-full text-sm font-bold text-slate-500"
                  >
                    Rätta senaste bollen
                  </button>
                </section>
              )}
              {active.phase === "halfway" && front && (
                <section>
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
                    <Coffee className="mx-auto h-9 w-9 text-amber-700" />
                    <h2 className="mt-3 text-2xl font-black">Halfway House</h2>
                    <p className="mt-2 text-base text-slate-600">Första tre klara</p>
                    <p className="mt-3 text-5xl font-black text-blue-700">
                      {front.stars}
                      <span className="text-xl text-slate-400">/9 ★</span>
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                      {oldFront
                        ? beatsScore(front, oldFront)
                          ? `Nytt rekord för första tre! Tidigare ${oldFront.stars} ★ · ${oldFront.points} p.`
                          : `Ditt rekord: ${oldFront.stars} ★ · ${oldFront.points} p.`
                        : "Din första trehålsrunda."}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{front.points}/36 poäng</p>
                  </div>
                  <button
                    className={`${primary} mt-4`}
                    onClick={() => {
                      commit({ type: "continue" });
                      setRegistering(false);
                    }}
                  >
                    Fortsätt · 9 bollar kvar <ArrowRight className="h-5 w-5" />
                  </button>
                  <p className="my-3 text-center text-sm text-slate-500">
                    Hål 4–6 · 14, 16 och 20 m
                  </p>
                  <button className={secondary} onClick={finish}>
                    <Check className="h-5 w-5" />
                    Avsluta och spara första tre
                  </button>
                </section>
              )}
            </>
          )}
          {historyOpen && !round && !active && (
            <section>
              <p className="mb-4 text-sm text-slate-500">
                {lieName(state.lie)} · Stjärnor först, poäng vid lika.
              </p>
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
                          {dateLabel(r.finishedAt)} ·{" "}
                          {r.holes.reduce((s, h) => s + holePoints(h), 0)} p
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-lg font-black text-blue-700">
                        {roundStars(r)}/{r.holes.length * 3} ★<ChevronRight className="h-5 w-5" />
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
                      ? "Första tre klara"
                      : "Din sparade runda"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {dateLabel(round.finishedAt)} · {lieName(round.lie)} · {round.holes.length * 3}{" "}
                  bollar
                </p>
                <p className="my-4 text-5xl font-black text-blue-700">
                  {roundStars(round)}
                  <span className="text-xl text-slate-400">/{round.holes.length * 3} ★</span>
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
              <div className="my-4 grid grid-cols-2 gap-3">
                {(["front", "back"] as const).map((segment) => {
                  const value = segmentScore(round, segment);
                  return (
                    <div key={segment} className={`${card} p-4 text-center`}>
                      <p className="text-sm font-bold text-slate-500">{segmentNames[segment]}</p>
                      <p className="mt-2 text-xl font-black">
                        {value ? `${value.stars}/9 ★` : "Ej spelat klart"}
                      </p>
                      {value && <p className="mt-1 text-sm text-slate-500">{value.points}/36 p</p>}
                    </div>
                  );
                })}
              </div>
              <Scorecard round={round} />
              <div className="mt-4">
                <ActivityReview
                  input={{
                    title: "Chipprundan",
                    modelId: "chip-course-v1",
                    summary: `${round.holes.length * 3} chippar`,
                    outcomes: round.holes.flatMap((h, i) =>
                      h.map((points, j) => ({
                        label: `Hål ${i + 1} · boll ${j + 1}`,
                        context: `${COURSE_DISTANCES[i]} m · ${lieName(round.lie)}`,
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
              <button className={`${primary} mt-5`} onClick={start}>
                Ny runda · börja på 8 m <ArrowRight className="h-5 w-5" />
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
                className="mt-2 min-h-12 w-full text-sm font-bold text-slate-500"
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
          <DialogTitle>Så spelar du chipprundan</DialogTitle>
          <DialogDescription>
            Börja på 8 meter. Slå tre bollar per hål från samma plats. Registrera resultaten när du
            kommer fram till hålet.
          </DialogDescription>
          <p className="text-base">
            Första tre: 8, 10, 12 m.
            <br />
            Sista tre: 14, 16, 20 m.
          </p>
          <p className="text-sm leading-6">
            Vid Halfway House väljer du att spara första tre eller fortsätta. Alla hål spelas i
            ordning, oavsett resultat. Avstånd mäts från bollen till hålet. Samma underlag hela
            rundan.
          </p>
          {CHIP_ZONES.map((z) => (
            <div
              key={z.points}
              className="flex justify-between border-b border-slate-100 py-1 text-base"
            >
              <span>{z.label}</span>
              <strong>{z.points} p</strong>
            </div>
          ))}
          <p className="text-sm">
            Exakt 1, 2 och 3 m räknas inom respektive zon. Stjärnorna tjänas på nytt varje runda.
            Vid lika antal stjärnor avgör poängen.
          </p>
          <table className="w-full text-center text-sm">
            <caption className="mb-2 text-left font-bold">Stjärnkrav · {lieName(lie)}</caption>
            <thead>
              <tr>
                <th>Hål</th>
                <th>m</th>
                <th>★</th>
                <th>★★</th>
                <th>★★★</th>
              </tr>
            </thead>
            <tbody>
              {COURSE_DISTANCES.map((d, i) => (
                <tr key={d} className="border-t border-slate-100">
                  <td className="py-2">{i + 1}</td>
                  <td>{d}</td>
                  {holeTargets(i, lie).map((p) => (
                    <td key={p}>{p}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500">
            Rekord jämförs separat för kortklippt och ruff. Stjärnorna är spelmål, inte ett
            handicap.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
