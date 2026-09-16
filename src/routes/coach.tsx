import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  COACHES,
  coachPuttingComment,
  nextCoachPuttingDistance,
  recordCoachPuttingAttempt,
  summarizeCoachPutting,
  type CoachId,
  type CoachPuttingAttempt,
} from "@/lib/coach-putting";
import { CHIP_POINT_ZONES, generateChipMatchDistances } from "@/lib/chip-match";
import { chipPerformanceFromPoints, recordEngineOutcome } from "@/lib/sg4-engine";

export const Route = createFileRoute("/coach")({
  head: () => ({ meta: [{ title: "Practice Mode – Träna med coach | SG4" }] }),
  component: PlayWithCoachPage,
});

type Phase = "setup" | "chip-setup" | "play" | "summary";
type Category = "putting" | "around-the-green" | "bunker" | "approach" | "off-the-tee" | "speed";
type PressureChallenge = { title: string; detail: string; maxStrokes?: 1 | 2; minPoints?: number };
type ChipLieOption = "fairway" | "rough" | "both";
type ChipLie = "Fairway" | "Ruff";
type ShortAttempt = { distance?: number; points: number; lie?: ChipLie };
type IntroState = "coach" | "3" | "2" | "1" | "go" | "done";
type ShortGamePb = { average: number; total: number };

const DEFAULT_COACH_ID: CoachId = "alma";
const CHIP_LIE_STORAGE_KEY = "sg4-coach-chip-lie-v1";
const SHORT_GAME_PB_PREFIX = "sg4-practice-pb-v1";

const CATEGORIES: Array<{ id: Category; title: string; available: boolean }> = [
  { id: "putting", title: "Puttning", available: true },
  { id: "around-the-green", title: "Chippning", available: true },
  { id: "bunker", title: "Bunker", available: true },
  { id: "approach", title: "Inspel", available: false },
  { id: "off-the-tee", title: "Driver", available: false },
  { id: "speed", title: "Speed", available: false },
];

const CHIP_LIE_OPTIONS: Array<{ id: ChipLieOption; label: string }> = [
  { id: "fairway", label: "Fairway" },
  { id: "rough", label: "Ruff" },
  { id: "both", label: "Båda" },
];

const BUNKER_POINT_ZONES = [
  { points: 5, label: "Sänkt" },
  { points: 4, label: "Inom 1 m" },
  { points: 3, label: "Inom 2 m" },
  { points: 2, label: "Inom 3 m" },
  { points: 1, label: "På green" },
  { points: 0, label: "Missad green" },
] as const;

const CONFETTI_COLORS = ["#2563eb", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899"];

function newSessionId() {
  return `coach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDistance(distance: number) {
  return Number.isInteger(distance) ? String(distance) : String(distance).replace(".", ",");
}

function formatOne(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function consecutiveFromEnd<T>(items: T[], predicate: (item: T) => boolean) {
  let count = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!predicate(items[index])) break;
    count += 1;
  }
  return count;
}

function shortGameQualityStreak(attempts: ShortAttempt[]) {
  return consecutiveFromEnd(attempts, (attempt) => attempt.points >= 3);
}

function nextChipDistance(previous?: number) {
  const generated = generateChipMatchDistances(7);
  const candidates = generated.filter((value) => value !== previous && (previous === undefined || Math.abs(value - previous) >= 5));
  const pool = candidates.length ? candidates : generated;
  return pool[Math.floor(Math.random() * pool.length)];
}

function nextChipLie(option: ChipLieOption): ChipLie {
  if (option === "rough") return "Ruff";
  if (option === "fairway") return "Fairway";
  return Math.random() < 0.7 ? "Fairway" : "Ruff";
}

function readSavedChipLieOption(): ChipLieOption {
  if (typeof window === "undefined") return "fairway";
  const saved = window.localStorage.getItem(CHIP_LIE_STORAGE_KEY);
  return saved === "rough" || saved === "both" || saved === "fairway" ? saved : "fairway";
}

function pbStorageKey(category: Category) {
  return `${SHORT_GAME_PB_PREFIX}-${category}`;
}

function readShortGamePb(category: Category): ShortGamePb | null {
  if (typeof window === "undefined" || (category !== "around-the-green" && category !== "bunker")) return null;
  try {
    const raw = window.localStorage.getItem(pbStorageKey(category));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShortGamePb>;
    if (typeof parsed.average !== "number" || typeof parsed.total !== "number") return null;
    return { average: parsed.average, total: parsed.total };
  } catch {
    return null;
  }
}

function saveShortGamePb(category: Category, attempts: ShortAttempt[], previous: ShortGamePb | null) {
  if (typeof window === "undefined" || !attempts.length || (category !== "around-the-green" && category !== "bunker")) return previous;
  const total = attempts.reduce((sum, attempt) => sum + attempt.points, 0);
  const average = total / attempts.length;
  const next = {
    average: Math.max(previous?.average ?? 0, average),
    total: Math.max(previous?.total ?? 0, total),
  };
  window.localStorage.setItem(pbStorageKey(category), JSON.stringify(next));
  return next;
}

function positiveLongPuttComment(distance: number) {
  if (distance >= 9) return "Vilken putt. Från den här längden är en sänkning ren bonus även på väldigt hög nivå.";
  if (distance >= 6) return "Riktigt starkt. Det där är en putt som bra spelare oftare missar än sänker.";
  return "Snyggt. Fyra meter plus är en riktig bonusputt.";
}

function poorPatternComment(category: Category) {
  return category === "bunker"
    ? "Några slag har blivit för långt från flaggan. Välj landningspunkt tydligare på nästa."
    : "Några slag har hamnat för långt från målet. Gör landningspunkten tydligare på nästa.";
}

function SpeechBubble({ avatar, name, text, fixed = false }: { avatar: string; name: string; text: string; fixed?: boolean }) {
  return (
    <div className={`flex items-end gap-3 ${fixed ? "min-h-[112px]" : ""}`}>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center text-[58px] leading-none">{avatar}</div>
      <div className={`relative mb-0 flex-1 rounded-[18px] border border-slate-300 bg-white px-4 py-3.5 text-slate-950 shadow-[0_14px_32px_-20px_rgba(15,23,42,.42)] ${fixed ? "min-h-[104px]" : ""}`}>
        <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 border-y-[13px] border-y-transparent border-r-[17px] border-r-slate-300" />
        <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 border-y-[11px] border-y-transparent border-r-[15px] border-r-white" />
        <p className="relative text-[10px] font-black uppercase tracking-[.13em] text-slate-500">{name}</p>
        <p className={`relative mt-1 text-[15.5px] font-semibold leading-[1.42] ${fixed ? "line-clamp-3" : ""}`}>{text}</p>
      </div>
    </div>
  );
}

function PlayWithCoachPage() {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const coachId = DEFAULT_COACH_ID;
  const coach = COACHES.find((item) => item.id === coachId) ?? COACHES[0];
  const [playerName, setPlayerName] = useState("Du");
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState<Category | null>(null);
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [distance, setDistance] = useState(() => nextCoachPuttingDistance());
  const [chipLieOption, setChipLieOption] = useState<ChipLieOption>(() => readSavedChipLieOption());
  const [chipLie, setChipLie] = useState<ChipLie>("Fairway");
  const [puttingAttempts, setPuttingAttempts] = useState<CoachPuttingAttempt[]>([]);
  const [shortAttempts, setShortAttempts] = useState<ShortAttempt[]>([]);
  const [coachText, setCoachText] = useState("Välj vad du vill träna. Jag styr variationen och säger till när något är värt att justera.");
  const [coachVisible, setCoachVisible] = useState(false);
  const [introState, setIntroState] = useState<IntroState>("done");
  const [shortGamePb, setShortGamePb] = useState<ShortGamePb | null>(null);
  const [pbCoachShown, setPbCoachShown] = useState(false);
  const coachTimerRef = useRef<number | null>(null);
  const introTimerRefs = useRef<number[]>([]);
  const poorCoachAtRef = useRef(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [pressure, setPressure] = useState<PressureChallenge | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [finalChallenge, setFinalChallenge] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    void supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.display_name) setPlayerName(data.display_name);
    });
    return () => { cancelled = true; };
  }, [user, loading]);

  useEffect(() => {
    if (!confetti) return;
    const timer = window.setTimeout(() => setConfetti(false), 1800);
    return () => window.clearTimeout(timer);
  }, [confetti]);

  useEffect(() => () => {
    if (coachTimerRef.current !== null) window.clearTimeout(coachTimerRef.current);
    introTimerRefs.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const puttingSummary = useMemo(() => summarizeCoachPutting(puttingAttempts), [puttingAttempts]);
  const currentCount = category === "putting" ? puttingAttempts.length : shortAttempts.length;
  const shortTotal = useMemo(() => shortAttempts.reduce((sum, attempt) => sum + attempt.points, 0), [shortAttempts]);
  const shortAverage = shortAttempts.length ? shortTotal / shortAttempts.length : 0;
  const shortStreak = useMemo(() => shortGameQualityStreak(shortAttempts), [shortAttempts]);
  const aboveAveragePb = Boolean(shortGamePb && shortAttempts.length >= 3 && shortAverage > shortGamePb.average);

  const categoryLabel = category === "around-the-green" ? "Chippning" : category === "bunker" ? "Bunker" : "Puttning";

  function clearIntroTimers() {
    introTimerRefs.current.forEach((timer) => window.clearTimeout(timer));
    introTimerRefs.current = [];
  }

  function showCoach(text: string, duration = 3800) {
    setCoachText(text);
    setCoachVisible(true);
    if (coachTimerRef.current !== null) window.clearTimeout(coachTimerRef.current);
    coachTimerRef.current = window.setTimeout(() => {
      setCoachVisible(false);
      coachTimerRef.current = null;
    }, duration);
  }

  function selectChipLie(option: ChipLieOption) {
    setChipLieOption(option);
    if (typeof window !== "undefined") window.localStorage.setItem(CHIP_LIE_STORAGE_KEY, option);
  }

  function selectCategory(nextCategory: Category, available: boolean) {
    if (!available) return;
    setCategory(nextCategory);
  }

  function continueFromSetup() {
    if (category === "around-the-green") {
      setPhase("chip-setup");
      return;
    }
    startGame();
  }

  function startGame() {
    if (!category || !["putting", "around-the-green", "bunker"].includes(category)) return;
    const firstDistance = category === "putting" ? nextCoachPuttingDistance() : category === "around-the-green" ? nextChipDistance() : 0;

    clearIntroTimers();
    if (coachTimerRef.current !== null) window.clearTimeout(coachTimerRef.current);
    coachTimerRef.current = null;
    setSessionId(newSessionId());
    setPuttingAttempts([]);
    setShortAttempts([]);
    setDistance(firstDistance);
    if (category === "around-the-green") setChipLie(nextChipLie(chipLieOption));
    setShortGamePb(readShortGamePb(category));
    setPbCoachShown(false);
    poorCoachAtRef.current = 0;
    setPressure(null);
    setConfetti(false);
    setFinalChallenge(false);
    setCoachText("Är du redo? Nu kör vi!");
    setCoachVisible(false);
    setIntroState("coach");
    setConfirmEnd(false);
    setTransitioning(true);
    setPhase("play");

    introTimerRefs.current = [
      window.setTimeout(() => setIntroState("3"), 1200),
      window.setTimeout(() => setIntroState("2"), 1950),
      window.setTimeout(() => setIntroState("1"), 2700),
      window.setTimeout(() => setIntroState("go"), 3450),
      window.setTimeout(() => {
        setIntroState("done");
        setTransitioning(false);
        introTimerRefs.current = [];
      }, 4200),
    ];
  }

  function shortPressureForNext(nextAttempts: ShortAttempt[]) {
    if (!shortGamePb || nextAttempts.length < 3) {
      const streak = shortGameQualityStreak(nextAttempts);
      return streak >= 3 && streak % 3 === 0
        ? { title: "Håll streaken vid liv", detail: `${streak} i rad inom 2 m · nästa räknas`, minPoints: 3 }
        : null;
    }

    const total = nextAttempts.reduce((sum, attempt) => sum + attempt.points, 0);
    const average = total / nextAttempts.length;
    const streak = shortGameQualityStreak(nextAttempts);
    const totalGap = shortGamePb.total - total;
    const avgGap = shortGamePb.average - average;

    if (streak >= 3 && streak % 3 === 0) {
      return { title: "Håll streaken vid liv", detail: `${streak} i rad inom 2 m · nästa räknas`, minPoints: 3 };
    }
    if (totalGap > 0 && totalGap <= 6) {
      const strongShots = Math.max(1, Math.ceil(totalGap / 3));
      return { title: "PB inom räckhåll", detail: `${strongShots} bra slag från total-PB`, minPoints: 3 };
    }
    if (nextAttempts.length >= 5 && avgGap > 0 && avgGap <= 0.25) {
      return { title: "Nära snitt-PB", detail: `${formatOne(avgGap)} från ditt bästa snitt`, minPoints: 3 };
    }
    return null;
  }

  function startFinalChallenge() {
    setConfirmEnd(false);
    setFinalChallenge(true);
    if (category === "putting") {
      setDistance(3);
      setPressure({ title: "Håla för vinsten", detail: "En sista putt. Sätt den och avsluta på topp.", maxStrokes: 1 });
      showCoach("Sista putten. Tre meter. Bestäm linjen och lita på stroken.");
    } else if (category === "bunker") {
      setDistance(0);
      setPressure({ title: "Inom 1 meter", detail: "Ett sista bunkerslag. Sätt press på flaggan.", minPoints: 4 });
      showCoach("Sista slaget. Få den så nära flaggan du kan.");
    } else {
      setDistance(12);
      setChipLie(nextChipLie(chipLieOption));
      setPressure({ title: "Inom 1 meter", detail: "Ett sista slag. Sätt press på flaggan.", minPoints: 4 });
      showCoach("Sista slaget. Tolv meter. Läs läget och commit.");
    }
  }

  function persistCurrentPb() {
    if (!category) return;
    const saved = saveShortGamePb(category, shortAttempts, shortGamePb);
    if (saved) setShortGamePb(saved);
  }

  function finishFinalChallenge(success: boolean) {
    setPressure(null);
    showCoach(success ? "Där satt den. Perfekt sätt att avsluta." : "Inte riktigt där, men passet är klart. Bra jobb.", 2200);
    window.setTimeout(() => {
      persistCurrentPb();
      setFinalChallenge(false);
      setTransitioning(false);
      setPhase("summary");
    }, 900);
  }

  function registerPutting(strokes: 1 | 2 | 3 | 4) {
    if (transitioning || category !== "putting") return;
    setTransitioning(true);
    const sequence = puttingAttempts.length + 1;
    const activePressure = pressure;
    const activeFinalChallenge = finalChallenge;
    const playedDistance = distance;
    const attempt = recordCoachPuttingAttempt(sessionId, sequence, playedDistance, strokes, coachId);
    const nextAttempts = [...puttingAttempts, attempt];
    const nextDistance = nextCoachPuttingDistance(playedDistance);
    const pressureWon = activePressure?.maxStrokes ? strokes <= activePressure.maxStrokes : false;

    setPressure(null);
    setPuttingAttempts(nextAttempts);
    if (strokes === 1 && playedDistance >= 4) {
      setConfetti(true);
      showCoach(positiveLongPuttComment(playedDistance));
    } else if (activePressure) {
      showCoach(pressureWon ? "Bra. Du höll pressen." : "Släpp den. Nästa putt är en ny situation.");
    } else if (strokes >= 3 && sequence % 3 === 0) {
      const comment = coachPuttingComment(playedDistance, strokes, coachId, sequence);
      if (comment) showCoach(comment);
    }

    if (activeFinalChallenge) {
      finishFinalChallenge(strokes === 1);
      return;
    }

    window.setTimeout(() => {
      setDistance(nextDistance);
      setTransitioning(false);
    }, 280);
  }

  function registerShortGame(points: number) {
    if (transitioning || (category !== "around-the-green" && category !== "bunker")) return;
    setTransitioning(true);
    const playedDistance = category === "bunker" ? undefined : distance;
    const playedLie = category === "around-the-green" ? chipLie : undefined;
    const activePressure = pressure;
    const activeFinalChallenge = finalChallenge;
    const nextAttempts = [...shortAttempts, { distance: playedDistance, points, lie: playedLie }];
    const nextDistance = category === "around-the-green" ? nextChipDistance(distance) : 0;
    const nextLie = category === "around-the-green" ? nextChipLie(chipLieOption) : chipLie;
    const pressureWon = activePressure?.minPoints !== undefined ? points >= activePressure.minPoints : false;
    const nextTotal = nextAttempts.reduce((sum, attempt) => sum + attempt.points, 0);
    const nextAverage = nextTotal / nextAttempts.length;

    setPressure(null);
    setShortAttempts(nextAttempts);
    recordEngineOutcome({ skill: "chip", ...(playedDistance !== undefined ? { distance: playedDistance } : {}), performance: chipPerformanceFromPoints(points), context: "game", activityId: category === "bunker" ? "coach-bunker" : "coach-chipping" });

    if (points === 5) {
      setConfetti(true);
      showCoach(category === "bunker" ? "Hålad ur bunkern. Det är bonus på riktigt." : "Den gick i. Exakt den typen av bonus vi tar varje gång.");
    } else if (shortGamePb && !pbCoachShown && nextAttempts.length >= 3 && nextAverage > shortGamePb.average) {
      setPbCoachShown(true);
      showCoach("Du ligger över ditt personbästa. Fortsätt så.");
    } else if (activePressure) {
      showCoach(pressureWon ? "Bra. Du höll pressen och streaken lever." : "Streaken bröts där. Ny chans direkt.");
    } else if (points === 4 && nextAttempts.length % 4 === 0) {
      showCoach("Riktigt bra. Inom en meter är starkt från den här typen av läge.");
    } else {
      const recent = nextAttempts.slice(-3);
      const poorCount = recent.filter((attempt) => attempt.points <= 1).length;
      if (recent.length === 3 && poorCount >= 2 && nextAttempts.length - poorCoachAtRef.current >= 4) {
        poorCoachAtRef.current = nextAttempts.length;
        showCoach(poorPatternComment(category));
      }
    }

    if (activeFinalChallenge) {
      finishFinalChallenge(points >= 4);
      return;
    }

    window.setTimeout(() => {
      setDistance(nextDistance);
      if (category === "around-the-green") setChipLie(nextLie);
      setPressure(shortPressureForNext(nextAttempts));
      setTransitioning(false);
    }, 280);
  }

  function endSession() {
    persistCurrentPb();
    setConfirmEnd(false);
    setPhase("summary");
  }

  const shortGameAverage = shortAttempts.length ? formatOne(shortAverage) : "0,0";
  const shortGameInsideTwo = shortAttempts.length ? Math.round((shortAttempts.filter((attempt) => attempt.points >= 3).length / shortAttempts.length) * 100) : 0;
  const shortGameHoled = shortAttempts.filter((attempt) => attempt.points === 5).length;
  const introActive = introState !== "done";
  const topBarMode = introActive ? "intro" : pressure ? "pressure" : coachVisible ? "coach" : "normal";
  const isShortGame = category === "around-the-green" || category === "bunker";

  const topBarClass = topBarMode === "pressure"
    ? "border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 text-slate-950"
    : topBarMode === "coach" || (topBarMode === "intro" && introState === "coach")
      ? "border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 text-slate-950"
      : topBarMode === "intro"
        ? "border-blue-700 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white"
        : aboveAveragePb
          ? "border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 text-slate-950 shadow-[0_0_28px_-12px_rgba(245,158,11,.8)]"
          : "border-slate-200 bg-white text-slate-950";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-[max(16px,env(safe-area-inset-top))] text-foreground">
      {phase === "setup" ? <>
        <header className="flex items-center justify-between">
          <Link to="/tester" aria-label="Tillbaka till Train & Test" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl shadow-sm">‹</Link>
          <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Practice Mode</p><p className="text-sm font-black text-slate-900">Träna med coach</p></div>
          <span className="h-10 w-10" />
        </header>

        <section className="mt-6"><SpeechBubble avatar={coach.emoji} name={coach.name} text="Välj vad du vill träna. Jag styr variationen och säger till när något är värt att justera." /></section>

        <section className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Träning</p>
          <h1 className="mt-1 font-display text-[38px] leading-none text-slate-950">Vad vill du träna?</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {CATEGORIES.map((item) => {
              const active = category === item.id;
              return <button key={item.id} type="button" onClick={() => selectCategory(item.id, item.available)} className={`relative flex min-h-[122px] items-center justify-center rounded-[24px] border p-4 text-center transition active:scale-[.985] ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15" : item.available ? "border-slate-200 bg-white" : "border-slate-200 bg-white/55 opacity-50"}`}>
                {active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <p className={`font-display text-[27px] uppercase leading-none ${active ? "text-blue-700" : "text-slate-950"}`}>{item.title}</p>
              </button>;
            })}
          </div>
          <button type="button" disabled={!category || !["putting", "around-the-green", "bunker"].includes(category)} onClick={continueFromSetup} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] bg-blue-600 py-4 font-display text-xl text-white shadow-sm transition active:scale-[.99] disabled:opacity-25">Starta träning <ChevronRight className="h-5 w-5" /></button>
        </section>
      </> : null}

      {phase === "chip-setup" ? <>
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => setPhase("setup")} aria-label="Tillbaka till träningsval" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl shadow-sm">‹</button>
          <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Practice Mode</p><p className="text-sm font-black text-slate-900">Chippning</p></div>
          <span className="h-10 w-10" />
        </header>

        <section className="mt-6"><SpeechBubble avatar={coach.emoji} name={coach.name} text="Vad har vi att jobba med idag? Vilket underlag har du tillgång till?" /></section>

        <section className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Underlag</p>
          <h1 className="mt-1 font-display text-[38px] leading-none text-slate-950">Välj underlag</h1>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {CHIP_LIE_OPTIONS.map((option) => {
              const active = chipLieOption === option.id;
              return <button key={option.id} type="button" onClick={() => selectChipLie(option.id)} className={`relative min-h-[104px] rounded-[22px] border px-3 py-4 text-center transition active:scale-[.98] ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15" : "border-slate-200 bg-white"}`}>
                {active ? <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <span className={`block font-display text-[22px] leading-none ${active ? "text-blue-700" : "text-slate-950"}`}>{option.label}</span>
              </button>;
            })}
          </div>
          <button type="button" onClick={startGame} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] bg-blue-600 py-4 font-display text-xl text-white shadow-sm transition active:scale-[.99]">Starta träning <ChevronRight className="h-5 w-5" /></button>
        </section>
      </> : null}

      {phase === "play" ? <>
        <style>{`
          @keyframes coachConfetti{0%{opacity:0;transform:translate3d(0,-12vh,0) rotate(0deg) scale(.7)}8%{opacity:1}100%{opacity:0;transform:translate3d(var(--cx),108vh,0) rotate(var(--cr)) scale(1.15)}}
          @keyframes topbarStateIn{0%{opacity:0;transform:translateY(5px) scale(.992)}100%{opacity:1;transform:translateY(0) scale(1)}}
          .sg4-topbar-state{animation:topbarStateIn 320ms cubic-bezier(.22,.61,.36,1) both}
          @media (prefers-reduced-motion: reduce){.sg4-topbar-state{animation:none!important}}
        `}</style>

        <header className={`-mx-5 h-[108px] w-[calc(100%+2.5rem)] overflow-hidden border-y transition-all duration-300 ${topBarClass}`}>
          {topBarMode === "intro" ? <div key={`intro-${introState}`} className="sg4-topbar-state flex h-full w-full items-center justify-center px-5 text-center">
            {introState === "coach" ? <div className="flex w-full items-center gap-3 text-left"><span className="flex h-14 w-14 shrink-0 items-center justify-center text-[42px] leading-none">{coach.emoji}</span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-600">Alma</p><p className="mt-1 text-[17px] font-semibold leading-[1.3] text-slate-900">{coachText}</p></div></div> : introState === "go" ? <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-blue-100">Practice Mode</p><p className="mt-1 font-display text-[34px] leading-none">NU KÖR VI</p></div> : <span className="font-display text-[58px] leading-none">{introState}</span>}
          </div> : topBarMode === "pressure" && pressure ? <div key={`pressure-${pressure.title}-${distance}`} className="sg4-topbar-state flex h-full w-full items-center justify-between px-5"><div className="min-w-0 pr-4"><p className="text-[9px] font-black uppercase tracking-[.22em]">Pressläge · Nu gäller det</p><p className="mt-1 truncate font-display text-[26px] leading-none">{pressure.title}</p><p className="mt-1 truncate text-[11px] font-bold text-slate-800">{pressure.detail}</p></div><span className="text-2xl">⚡</span></div> : topBarMode === "coach" ? <div key={`coach-${coachText}`} className="sg4-topbar-state flex h-full w-full items-center gap-3 px-5"><span className="flex h-14 w-14 shrink-0 items-center justify-center text-[42px] leading-none">{coach.emoji}</span><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-600">Alma</p><p className="mt-1 line-clamp-2 text-[16px] font-semibold leading-[1.3] text-slate-900">{coachText}</p></div></div> : isShortGame ? <div key="short-normal" className="sg4-topbar-state grid h-full w-full grid-cols-2 overflow-hidden">
            <div className="relative z-10 flex min-w-0 items-center bg-blue-600 px-5 pr-8 text-white after:absolute after:-right-6 after:top-0 after:h-full after:w-9 after:bg-blue-600 after:[clip-path:polygon(0_0,36%_0,100%_50%,36%_100%,0_100%)]">
              <div className="min-w-0">
                <p className="truncate font-display text-[29px] leading-none text-white">{playerName}</p>
                <p className="mt-1.5 text-[9px] font-black uppercase tracking-[.12em] text-blue-100">{currentCount} slag registrerade</p>
                {shortStreak >= 2 ? <span className="mt-2 inline-flex rounded-full bg-white/14 px-2 py-1 text-[8px] font-black uppercase tracking-[.06em] text-white">🔥 {shortStreak} i rad · inom 2 m</span> : null}
              </div>
            </div>
            <div className="relative flex min-w-0 items-center justify-end bg-white pl-8 pr-5 text-right">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[.12em] text-slate-500">Snitt / slag</p>
                <p className={`mt-0.5 whitespace-nowrap font-display text-[31px] leading-none ${aboveAveragePb ? "text-amber-700" : "text-slate-950"}`}>{shortGameAverage}{aboveAveragePb ? <span className="ml-1.5 align-middle text-[11px] font-black tracking-normal">🏆 PB</span> : null}</p>
                <div className="mt-2 flex items-end justify-end gap-2 whitespace-nowrap">
                  <span className="text-[8px] font-black uppercase tracking-[.1em] text-slate-400">Total</span>
                  <span className="font-display text-[18px] leading-none text-slate-700">{shortTotal} P</span>
                </div>
              </div>
            </div>
          </div> : <div key="putt-normal" className="sg4-topbar-state grid h-full w-full grid-cols-[60%_40%] overflow-hidden"><div className="relative z-10 flex min-w-0 items-center bg-blue-600 px-5 pr-9 text-white after:absolute after:-right-6 after:top-0 after:h-full after:w-9 after:bg-blue-600 after:[clip-path:polygon(0_0,36%_0,100%_50%,36%_100%,0_100%)]"><div className="min-w-0"><p className="truncate font-display text-[30px] leading-none text-white">{playerName}</p><p className="mt-1.5 text-[10px] font-black uppercase tracking-[.14em] text-blue-100">{currentCount} slag registrerade</p></div></div><div className="relative flex min-w-0 items-center justify-end bg-white pl-8 pr-5 text-right"><div><p className="text-[8px] font-black uppercase tracking-[.12em] text-slate-500">Puttar</p><p className="mt-0.5 font-display text-[27px] leading-none text-slate-950">{puttingAttempts.reduce((sum, attempt) => sum + attempt.strokes, 0)}</p></div></div></div>}
        </header>

        {category === "bunker" ? <section className="mt-3 rounded-[26px] border border-slate-200 bg-white px-5 py-6 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.45)]"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Uppgift</p><h1 className="mt-1 font-display text-[42px] leading-none text-slate-950">Bunkerslag</h1><p className="mt-2 text-sm font-semibold text-slate-500">Slå så nära flaggan som möjligt.</p></section> : <section className="mt-3 rounded-[26px] border border-slate-200 bg-white px-5 py-5 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.45)]"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{category === "around-the-green" ? "Situation" : "Avstånd från hål"}</p>{category === "around-the-green" ? <div className={`mt-1 flex items-center justify-center gap-2 whitespace-nowrap text-slate-600 transition-opacity ${transitioning ? "opacity-35" : "opacity-100"}`}><span className="font-display text-[46px] leading-none text-slate-950">{formatDistance(distance)} m</span><span className="font-display text-[33px] leading-none text-slate-500">• från {chipLie.toLowerCase()}</span></div> : <h1 className={`mt-1 font-display text-[58px] leading-none text-slate-950 transition-opacity ${transitioning ? "opacity-35" : "opacity-100"}`}>{formatDistance(distance)} m</h1>}{category === "around-the-green" ? <p className="mt-2 text-sm font-semibold text-slate-500">Slå så nära hålet som möjligt.</p> : null}</section>}

        {category === "putting" ? <section className="mt-5"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Antal puttar</h2></div><div className="mt-3 grid grid-cols-4 gap-2.5">{([1, 2, 3, 4] as const).map((strokes) => {
          const visual = strokes === 1 ? "border-blue-800 bg-blue-800 text-white shadow-[0_10px_24px_-14px_rgba(30,64,175,.75)]" : strokes === 2 ? "border-blue-600 bg-blue-600 text-white" : strokes === 3 ? "border-blue-200 bg-blue-100 text-blue-950" : "border-blue-300 bg-white text-blue-950";
          return <button key={strokes} type="button" disabled={transitioning} onClick={() => registerPutting(strokes)} className={`rounded-[20px] border px-1 py-4 text-center shadow-sm transition active:scale-[.96] disabled:opacity-40 ${visual}`}><span className="block font-display text-3xl leading-none">{strokes}</span><span className={`mt-1.5 block text-[9px] font-black uppercase tracking-[.08em] ${strokes <= 2 ? "text-blue-100" : "text-blue-600"}`}>{strokes === 1 ? "putt" : "puttar"}</span></button>;
        })}</div></section> : category === "around-the-green" ? <section className="mt-5"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Hur nära hålet?</h2></div><div className="mt-3 grid grid-cols-2 gap-2.5">{CHIP_POINT_ZONES.map((zone) => {
          const visualClass = zone.points === 5
            ? "col-span-2 min-h-[72px] border-blue-800 bg-gradient-to-r from-blue-800 to-blue-700 text-white shadow-[0_12px_28px_-18px_rgba(30,64,175,.65)]"
            : zone.points === 4
              ? "min-h-[66px] border-blue-600 bg-blue-600 text-white"
              : zone.points === 3
                ? "min-h-[66px] border-blue-500 bg-blue-500 text-white"
                : zone.points === 2
                  ? "min-h-[66px] border-blue-200 bg-blue-100 text-blue-950"
                  : zone.points === 1
                    ? "min-h-[66px] border-blue-200 bg-blue-50 text-blue-950"
                    : "col-span-2 min-h-[64px] border-blue-300 bg-white text-blue-950";
          return <button key={zone.points} type="button" disabled={transitioning} onClick={() => registerShortGame(zone.points)} className={`rounded-[18px] border px-3 py-3 text-center shadow-sm transition active:scale-[.97] disabled:opacity-40 ${visualClass}`}><span className="flex items-center justify-center gap-2"><span className="font-display text-[20px] uppercase leading-tight">{zone.points === 5 ? "⛳ " : ""}{zone.label}</span><span className={`text-[11px] font-black uppercase tracking-[.08em] ${zone.points >= 3 ? "opacity-80" : "text-blue-600"}`}>{zone.points} P</span></span></button>;
        })}</div></section> : <section className="mt-5"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Hur nära hålet?</h2></div><div className="mt-3 grid grid-cols-2 gap-2.5">{BUNKER_POINT_ZONES.map((zone) => <button key={zone.points} type="button" disabled={transitioning} onClick={() => registerShortGame(zone.points)} className="min-h-[64px] rounded-[18px] border border-blue-300 bg-blue-50 px-3 py-3 text-center text-blue-800 shadow-sm transition hover:bg-blue-100 active:scale-[.97] active:bg-blue-200 disabled:opacity-40"><span className="font-display text-[18px] leading-tight">{zone.label}</span><span className="ml-2 text-[10px] font-black uppercase text-blue-500">{zone.points} P</span></button>)}</div></section>}

        <button type="button" onClick={() => setConfirmEnd(true)} className="mt-5 w-full py-2 text-center text-sm font-semibold text-slate-400 transition hover:text-slate-500 active:text-slate-600">Avsluta träning</button>

        {confetti ? <div className="pointer-events-none fixed inset-0 z-[170] overflow-hidden">{Array.from({ length: 62 }).map((_, index) => <span key={index} className="absolute top-[-10%] rounded-sm" style={{ left: `${2 + (index * 17) % 96}%`, width: `${5 + (index % 3) * 2}px`, height: `${10 + (index % 4) * 3}px`, backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length], ["--cx" as string]: `${(index % 2 ? 1 : -1) * (18 + (index % 7) * 13)}px`, ["--cr" as string]: `${220 + (index % 9) * 70}deg`, animation: `coachConfetti ${1.2 + (index % 6) * .13}s ${(index % 11) * .035}s cubic-bezier(.16,.7,.2,1) both` }} />)}</div> : null}

        {confirmEnd ? <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl"><button type="button" onClick={() => setConfirmEnd(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-600">En sista?</p><h2 className="mt-1 font-display text-3xl leading-none text-slate-950">Coach challenge</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">{category === "putting" ? "En putt till. Tre meter. Håla den för att avsluta med en vinst." : category === "bunker" ? "Ett bunkerslag till. Slå så nära flaggan som möjligt och kom inom 1 meter för att avsluta med en vinst." : "Ett chip till från 12 meter. Inom 1 meter för att avsluta med en vinst."}</p><div className="mt-5 space-y-2.5"><button type="button" onClick={startFinalChallenge} className="w-full rounded-2xl bg-amber-400 py-3.5 font-display text-lg text-slate-950">Ta sista utmaningen</button><button type="button" onClick={() => setConfirmEnd(false)} className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white">Fortsätt träna</button><button type="button" onClick={endSession} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-500">Avsluta ändå</button></div></div></div> : null}
      </> : null}

      {phase === "summary" ? <>
        <header className="flex items-center justify-between"><span className="h-10 w-10" /><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Resultat</p><p className="text-sm font-black text-slate-950">{categoryLabel} med {coach.name}</p></div><span className="h-10 w-10" /></header>
        <section className="mt-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center text-5xl">{coach.emoji}</span><h1 className="mt-4 font-display text-4xl leading-none text-slate-950">Bra tränat.</h1><p className="mt-2 text-sm text-slate-500">{currentCount} slag registrerade</p></section>
        {category === "putting" ? <section className="mt-6 grid grid-cols-3 gap-2.5"><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Snitt</p><p className="mt-1 font-display text-2xl">{puttingSummary.avg}</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">1-putt</p><p className="mt-1 font-display text-2xl">{puttingSummary.onePuttPct}%</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">3-putt+</p><p className="mt-1 font-display text-2xl">{puttingSummary.threePuttPct}%</p></div></section> : <section className="mt-6 grid grid-cols-3 gap-2.5"><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Snitt / slag</p><p className="mt-1 font-display text-2xl">{shortGameAverage}</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Total</p><p className="mt-1 font-display text-2xl">{shortTotal} P</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Inom 2 m</p><p className="mt-1 font-display text-2xl">{shortGameInsideTwo}%</p></div></section>}
        <section className="mt-5"><SpeechBubble avatar={coach.emoji} name={coach.name} text={category === "putting" ? (puttingSummary.threePuttPct >= 25 ? "Vi behöver få ner treputtarna. Nästa pass lägger vi mer vikt på fartkontroll från längre håll." : "Stabilt pass. Nästa gång bygger vi vidare på samma rutin.") : shortGameHoled > 0 ? "Bra pass. Du fick dessutom i en boll — den bonusen tar vi varje gång." : shortGameInsideTwo >= 60 ? "Bra kontroll runt målet. Nästa pass kan vi höja svårigheten lite." : "Nästa pass vill jag se fler bollar inom två meter. Landningspunkten blir vårt huvudfokus."} /></section>
        <section className="mt-6 space-y-2.5"><button type="button" onClick={startGame} className="w-full rounded-[20px] bg-emerald-600 py-4 font-display text-xl text-white">Träna igen</button><button type="button" onClick={() => { setPhase("setup"); setCategory(null); }} className="w-full rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Byt kategori</button><Link to="/tester" className="flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Klar</Link></section>
      </> : null}
    </main>
  );
}
