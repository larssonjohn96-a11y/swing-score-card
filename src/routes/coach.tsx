import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const DEFAULT_COACH_ID: CoachId = "alma";
const CHIP_LIE_STORAGE_KEY = "sg4-coach-chip-lie-v1";

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

function consecutiveFromEnd<T>(items: T[], predicate: (item: T) => boolean) {
  let count = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!predicate(items[index])) break;
    count += 1;
  }
  return count;
}

function shortHoledStreak(attempts: CoachPuttingAttempt[]) {
  const shortAttempts = attempts.filter((attempt) => attempt.distance <= 3);
  return consecutiveFromEnd(shortAttempts, (attempt) => attempt.strokes === 1);
}

function longNoThreeStreak(attempts: CoachPuttingAttempt[]) {
  const longAttempts = attempts.filter((attempt) => attempt.distance > 8);
  return consecutiveFromEnd(longAttempts, (attempt) => attempt.strokes <= 2);
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

function maybePressureChallenge(category: Category, distance: number, puttingAttempts: CoachPuttingAttempt[], shortAttempts: ShortAttempt[]): PressureChallenge | null {
  if (category === "putting") {
    const shortStreak = shortHoledStreak(puttingAttempts);
    const longStreak = longNoThreeStreak(puttingAttempts);
    if (shortStreak >= 2 && distance <= 3) {
      const chance = distance >= 2.5 ? 0.68 : 0.46;
      if (Math.random() <= chance) return { title: "Håla denna putt", detail: `Håll ${shortStreak} kortputtar i rad vid liv`, maxStrokes: 1 };
    }
    if (longStreak >= 3 && distance > 8) {
      const chance = distance >= 12 ? 0.68 : 0.46;
      if (Math.random() <= chance) return { title: "Max 2 puttar", detail: `Håll ${longStreak} långputtar utan treputt vid liv`, maxStrokes: 2 };
    }
    return null;
  }

  const streak = shortGameQualityStreak(shortAttempts);
  if (streak < 3 || Math.random() > 0.58) return null;
  return { title: "Inom 2 meter", detail: `Håll ${streak} starka slag i rad vid liv`, minPoints: 3 };
}

function positiveLongPuttComment(distance: number) {
  if (distance >= 9) return "Vilken putt. Från den här längden är en sänkning ren bonus även på väldigt hög nivå.";
  if (distance >= 6) return "Riktigt starkt. Det där är en putt som bra spelare oftare missar än sänker.";
  return "Snyggt. Fyra meter plus är en riktig bonusputt.";
}

function shortGameCoachComment(category: Category, points: number, distance?: number) {
  if (points === 5) return category === "bunker" ? "Hålad ur bunkern. Det är bonus på riktigt." : "Den gick i. Exakt den typen av bonus vi tar varje gång.";
  if (points === 4) return "Mycket bra. Du gav dig själv en enkel nästa putt.";
  if (points === 3) return "Bra slag. Två meter eller närmare är ett klart godkänt resultat här.";
  if (points <= 1) {
    if (category === "bunker") return "För långt från flaggan. Välj landningspunkt tydligare på nästa slag.";
    return (distance ?? 0) >= 18 ? "Den blev för lös. Välj landningspunkt först och låt längden komma därifrån." : "För långt från målet. Gör landningspunkten tydligare på nästa.";
  }
  return "Godkänt. Försök flytta nästa en zon närmare hålet.";
}

function SpeechBubble({ avatar, name, text, fixed = false }: { avatar: string; name: string; text: string; fixed?: boolean }) {
  return (
    <div className={`flex items-end gap-3 ${fixed ? "h-[126px]" : ""}`}>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center text-[58px] leading-none">{avatar}</div>
      <div className={`relative mb-0 flex-1 rounded-[18px] border border-slate-300 bg-white px-4 py-3.5 text-slate-950 shadow-[0_14px_32px_-20px_rgba(15,23,42,.42)] ${fixed ? "h-[122px] overflow-hidden" : ""}`}>
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

  const puttingSummary = useMemo(() => summarizeCoachPutting(puttingAttempts), [puttingAttempts]);
  const currentCount = category === "putting" ? puttingAttempts.length : shortAttempts.length;

  const liveStats = useMemo(() => {
    if (category === "putting") {
      const totalPutts = puttingAttempts.reduce((sum, attempt) => sum + attempt.strokes, 0);
      const shortStreak = shortHoledStreak(puttingAttempts);
      const noThreeStreak = consecutiveFromEnd(puttingAttempts, (attempt) => attempt.strokes <= 2);
      const longStreak = longNoThreeStreak(puttingAttempts);
      if (shortStreak >= 2) return { label: "≤3 m i rad", value: `🔥 ${shortStreak}` };
      if (longStreak >= 2) return { label: ">8 m utan 3-putt", value: `🎯 ${longStreak}` };
      if (noThreeStreak >= 3) return { label: "≤2 puttar i rad", value: String(noThreeStreak) };
      return { label: "Puttar", value: String(totalPutts) };
    }
    const streak = shortGameQualityStreak(shortAttempts);
    if (streak >= 2) return { label: "Inom 2 m i rad", value: `🎯 ${streak}` };
    const average = shortAttempts.length ? (shortAttempts.reduce((sum, attempt) => sum + attempt.points, 0) / shortAttempts.length).toFixed(1) : "0";
    return { label: "Snittpoäng", value: average };
  }, [category, puttingAttempts, shortAttempts]);

  const categoryLabel = category === "around-the-green" ? "Chippning" : category === "bunker" ? "Bunker" : "Puttning";

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
    setSessionId(newSessionId());
    setPuttingAttempts([]);
    setShortAttempts([]);
    setDistance(firstDistance);
    if (category === "around-the-green") setChipLie(nextChipLie(chipLieOption));
    setPressure(null);
    setConfetti(false);
    setFinalChallenge(false);
    setCoachText(category === "putting"
      ? "Vi kör. Läs putten, välj fart och slå med ett tydligt beslut."
      : category === "bunker"
        ? "Vi kör. Slå bunkerslaget så nära flaggan du kan."
        : "Vi kör. Läs läget, välj landningspunkt och slå så nära hålet du kan.");
    setConfirmEnd(false);
    setTransitioning(false);
    setPhase("play");
  }

  function startFinalChallenge() {
    setConfirmEnd(false);
    setFinalChallenge(true);
    if (category === "putting") {
      setDistance(3);
      setPressure({ title: "Håla för vinsten", detail: "En sista putt. Sätt den och avsluta på topp.", maxStrokes: 1 });
      setCoachText("Sista putten. Tre meter. Bestäm linjen och lita på stroken.");
    } else if (category === "bunker") {
      setDistance(0);
      setPressure({ title: "Inom 1 meter", detail: "Ett sista bunkerslag. Sätt press på flaggan.", minPoints: 4 });
      setCoachText("Sista slaget. Få den så nära flaggan du kan.");
    } else {
      setDistance(12);
      setChipLie(nextChipLie(chipLieOption));
      setPressure({ title: "Inom 1 meter", detail: "Ett sista slag. Sätt press på flaggan.", minPoints: 4 });
      setCoachText("Sista slaget. Tolv meter. Läs läget och commit.");
    }
  }

  function finishFinalChallenge(success: boolean) {
    setPressure(null);
    setCoachText(success ? "Där satt den. Perfekt sätt att avsluta." : "Inte riktigt där, men passet är klart. Bra jobb.");
    window.setTimeout(() => {
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

    setPuttingAttempts(nextAttempts);
    if (strokes === 1 && playedDistance >= 4) {
      setConfetti(true);
      setCoachText(positiveLongPuttComment(playedDistance));
    } else if (activePressure) {
      setCoachText(pressureWon ? (strokes === 1 ? "Bra. Du höll streaken vid liv." : "Bra tvåputt. Streaken lever.") : activePressure.maxStrokes === 1 ? "Den streaken är över. Bygg en ny direkt." : "Treputten bröt streaken. Släpp den och börja om.");
    } else {
      const comment = coachPuttingComment(playedDistance, strokes, coachId, sequence);
      setCoachText(comment ?? (strokes === 1 ? "Bra. Samma rutin nästa gång." : strokes >= 3 ? "Den blev dyr. Släpp den och fokusera på nästa." : "Bra tvåputt. Nästa."));
    }

    if (activeFinalChallenge) {
      finishFinalChallenge(strokes === 1);
      return;
    }

    window.setTimeout(() => {
      setDistance(nextDistance);
      setPressure(maybePressureChallenge("putting", nextDistance, nextAttempts, shortAttempts));
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

    setShortAttempts(nextAttempts);
    recordEngineOutcome({ skill: "chip", ...(playedDistance !== undefined ? { distance: playedDistance } : {}), performance: chipPerformanceFromPoints(points), context: "game", activityId: category === "bunker" ? "coach-bunker" : "coach-chipping" });

    if (points === 5) setConfetti(true);
    if (activePressure) setCoachText(pressureWon ? "Bra. Du höll streaken vid liv." : "Streaken tog slut där. Ny chans på nästa.");
    else setCoachText(shortGameCoachComment(category, points, playedDistance));

    if (activeFinalChallenge) {
      finishFinalChallenge(points >= 4);
      return;
    }

    window.setTimeout(() => {
      setDistance(nextDistance);
      if (category === "around-the-green") setChipLie(nextLie);
      setPressure(maybePressureChallenge(category, nextDistance, puttingAttempts, nextAttempts));
      setTransitioning(false);
    }, 280);
  }

  function endSession() {
    setConfirmEnd(false);
    setPhase("summary");
  }

  const shortGameAverage = shortAttempts.length ? (shortAttempts.reduce((sum, attempt) => sum + attempt.points, 0) / shortAttempts.length).toFixed(1) : "0";
  const shortGameInsideTwo = shortAttempts.length ? Math.round((shortAttempts.filter((attempt) => attempt.points >= 3).length / shortAttempts.length) * 100) : 0;
  const shortGameHoled = shortAttempts.filter((attempt) => attempt.points === 5).length;

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
          @keyframes sg4PressureEnter{0%{opacity:.25;transform:scale(.985)}55%{opacity:1;transform:scale(1.006)}100%{opacity:1;transform:scale(1)}}
          @keyframes sg4PressurePulse{0%,100%{transform:scale(1);box-shadow:0 12px 28px -20px rgba(245,158,11,.52),0 0 0 0 rgba(250,204,21,0)}45%{transform:scale(1.012);box-shadow:0 18px 34px -19px rgba(245,158,11,.78),0 0 0 2px rgba(250,204,21,.32)}65%{transform:scale(1.006);box-shadow:0 15px 31px -19px rgba(245,158,11,.66),0 0 0 1px rgba(250,204,21,.18)}}
          @keyframes sg4PressureWave{0%{transform:translateX(-145%) skewX(-18deg);opacity:0}12%{opacity:.18}48%{opacity:.62}78%{opacity:.18}100%{transform:translateX(245%) skewX(-18deg);opacity:0}}
          @keyframes coachConfetti{0%{opacity:0;transform:translate3d(0,-12vh,0) rotate(0deg) scale(.7)}8%{opacity:1}100%{opacity:0;transform:translate3d(var(--cx),108vh,0) rotate(var(--cr)) scale(1.15)}}
        `}</style>

        <header className="-mx-5 grid min-h-[76px] w-[calc(100%+2.5rem)] grid-cols-[60%_40%] overflow-hidden border-y border-slate-200 bg-white shadow-[0_10px_28px_-24px_rgba(15,23,42,.5)]">
          <div className="relative z-10 flex min-w-0 items-center bg-blue-600 px-5 pr-9 text-white after:absolute after:-right-6 after:top-0 after:h-full after:w-9 after:bg-blue-600 after:[clip-path:polygon(0_0,36%_0,100%_50%,36%_100%,0_100%)]">
            <div className="min-w-0"><p className="truncate font-display text-[30px] leading-none text-white">{playerName}</p><p className="mt-1.5 text-[10px] font-black uppercase tracking-[.14em] text-blue-100">{currentCount} slag registrerade</p></div>
          </div>
          <div className="relative flex min-w-0 items-center justify-end bg-white pl-8 pr-5 text-right">
            <div className="min-w-0"><p className="truncate text-[8px] font-black uppercase tracking-[.12em] text-slate-500">{liveStats.label}</p><p className="mt-0.5 font-display text-[27px] leading-none text-slate-950">{liveStats.value}</p></div>
          </div>
        </header>

        <section className="mt-3"><SpeechBubble avatar={coach.emoji} name={coach.name} text={coachText} fixed /></section>

        {pressure ? <div className="mt-3 overflow-hidden"><div key={`${distance}-${pressure.title}`} className="relative overflow-hidden rounded-[22px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-5 py-3 text-center text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureEnter 420ms cubic-bezier(.2,.8,.25,1) both, sg4PressurePulse 1.9s ease-in-out 520ms infinite" }}><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-transparent via-white/90 to-transparent blur-[1px]" style={{ animation: "sg4PressureWave 1.18s cubic-bezier(.2,.75,.25,1) 150ms both" }} /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">Pressläge · Nu gäller det</p><p className="mt-1 font-display text-lg leading-none text-slate-950">{pressure.title}</p><p className="mt-1 text-xs font-bold leading-snug text-slate-800">{pressure.detail}</p></div></div></div> : null}

        {category === "bunker" ? <section className="mt-3 rounded-[26px] border border-slate-200 bg-white px-5 py-6 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.45)]"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Uppgift</p><h1 className="mt-1 font-display text-[42px] leading-none text-slate-950">Bunkerslag</h1><p className="mt-2 text-sm font-semibold text-slate-500">Slå så nära flaggan som möjligt.</p></section> : <section className="mt-3 rounded-[26px] border border-slate-200 bg-white px-5 py-5 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.45)]"><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{category === "around-the-green" ? "Situation" : "Avstånd"}</p>{category === "around-the-green" ? <div className={`mt-1 flex items-baseline justify-center gap-2 whitespace-nowrap transition-opacity ${transitioning ? "opacity-35" : "opacity-100"}`}><span className="font-display text-[54px] leading-none text-slate-950">{formatDistance(distance)} m</span><span className="font-display text-[22px] leading-none text-slate-500">• från {chipLie.toLowerCase()}</span></div> : <h1 className={`mt-1 font-display text-[58px] leading-none text-slate-950 transition-opacity ${transitioning ? "opacity-35" : "opacity-100"}`}>{formatDistance(distance)} m</h1>}{category === "around-the-green" ? <p className="mt-2 text-sm font-semibold text-slate-500">Slå så nära hålet som möjligt.</p> : null}</section>}

        {category === "putting" ? <section className="mt-5"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Antal puttar</h2></div><div className="mt-3 grid grid-cols-4 gap-2.5">{([1, 2, 3, 4] as const).map((strokes) => <button key={strokes} type="button" disabled={transitioning} onClick={() => registerPutting(strokes)} className="rounded-[20px] border border-blue-300 bg-blue-50 px-1 py-4 text-center shadow-sm transition hover:bg-blue-100 active:scale-[.96] active:bg-blue-200 disabled:opacity-40"><span className="block font-display text-3xl leading-none text-blue-800">{strokes}</span><span className="mt-1.5 block text-[8px] font-black uppercase tracking-[.08em] text-blue-500">{strokes === 1 ? "putt" : "puttar"}</span></button>)}</div></section> : category === "around-the-green" ? <section className="mt-5"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Hur nära hålet?</h2></div><div className="mt-3 grid grid-cols-2 gap-2.5">{CHIP_POINT_ZONES.map((zone) => {
          const visualClass = zone.points === 5
            ? "col-span-2 min-h-[64px] border-blue-800 bg-gradient-to-r from-blue-800 to-blue-700 text-white shadow-[0_12px_28px_-18px_rgba(30,64,175,.65)]"
            : zone.points === 4
              ? "min-h-[58px] border-blue-600 bg-blue-600 text-white"
              : zone.points === 3
                ? "min-h-[58px] border-blue-500 bg-blue-500 text-white"
                : zone.points === 2
                  ? "min-h-[58px] border-blue-200 bg-blue-100 text-blue-950"
                  : zone.points === 1
                    ? "min-h-[58px] border-blue-200 bg-blue-50 text-blue-950"
                    : "col-span-2 min-h-[58px] border-blue-300 bg-white text-blue-950";
          return <button key={zone.points} type="button" disabled={transitioning} onClick={() => registerShortGame(zone.points)} className={`rounded-[18px] border px-3 py-3 text-center font-display text-base uppercase leading-tight shadow-sm transition active:scale-[.97] disabled:opacity-40 ${visualClass}`}>{zone.points === 5 ? <span className="flex items-center justify-center gap-2"><span aria-hidden="true" className="text-xl">⛳</span><span>{zone.label}</span></span> : zone.label}</button>;
        })}</div></section> : <section className="mt-5"><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Hur nära hålet?</h2></div><div className="mt-3 grid grid-cols-2 gap-2.5">{BUNKER_POINT_ZONES.map((zone) => <button key={zone.points} type="button" disabled={transitioning} onClick={() => registerShortGame(zone.points)} className="min-h-[58px] rounded-[18px] border border-blue-300 bg-blue-50 px-3 py-3 text-center font-display text-base leading-tight text-blue-800 shadow-sm transition hover:bg-blue-100 active:scale-[.97] active:bg-blue-200 disabled:opacity-40">{zone.label}</button>)}</div></section>}

        <button type="button" onClick={() => setConfirmEnd(true)} className="mt-6 w-full rounded-[18px] border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-500">Avsluta träning</button>

        {confetti ? <div className="pointer-events-none fixed inset-0 z-[170] overflow-hidden">{Array.from({ length: 52 }).map((_, index) => <span key={index} className="absolute top-[-10%] rounded-sm" style={{ left: `${2 + (index * 17) % 96}%`, width: `${5 + (index % 3) * 2}px`, height: `${10 + (index % 4) * 3}px`, backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length], ["--cx" as string]: `${(index % 2 ? 1 : -1) * (18 + (index % 7) * 13)}px`, ["--cr" as string]: `${220 + (index % 9) * 70}deg`, animation: `coachConfetti ${1.2 + (index % 6) * .13}s ${(index % 11) * .035}s cubic-bezier(.16,.7,.2,1) both` }} />)}</div> : null}

        {confirmEnd ? <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl"><button type="button" onClick={() => setConfirmEnd(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button><p className="text-[9px] font-black uppercase tracking-[.18em] text-amber-600">En sista?</p><h2 className="mt-1 font-display text-3xl leading-none text-slate-950">Coach challenge</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">{category === "putting" ? "En putt till. Tre meter. Håla den för att avsluta med en vinst." : category === "bunker" ? "Ett bunkerslag till. Slå så nära flaggan som möjligt och kom inom 1 meter för att avsluta med en vinst." : "Ett chip till från 12 meter. Inom 1 meter för att avsluta med en vinst."}</p><div className="mt-5 space-y-2.5"><button type="button" onClick={startFinalChallenge} className="w-full rounded-2xl bg-amber-400 py-3.5 font-display text-lg text-slate-950">Ta sista utmaningen</button><button type="button" onClick={() => setConfirmEnd(false)} className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white">Fortsätt träna</button><button type="button" onClick={endSession} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-500">Avsluta ändå</button></div></div></div> : null}
      </> : null}

      {phase === "summary" ? <>
        <header className="flex items-center justify-between"><span className="h-10 w-10" /><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Resultat</p><p className="text-sm font-black text-slate-950">{categoryLabel} med {coach.name}</p></div><span className="h-10 w-10" /></header>
        <section className="mt-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center text-5xl">{coach.emoji}</span><h1 className="mt-4 font-display text-4xl leading-none text-slate-950">Bra tränat.</h1><p className="mt-2 text-sm text-slate-500">{currentCount} slag registrerade</p></section>
        {category === "putting" ? <section className="mt-6 grid grid-cols-3 gap-2.5"><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Snitt</p><p className="mt-1 font-display text-2xl">{puttingSummary.avg}</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">1-putt</p><p className="mt-1 font-display text-2xl">{puttingSummary.onePuttPct}%</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">3-putt+</p><p className="mt-1 font-display text-2xl">{puttingSummary.threePuttPct}%</p></div></section> : <section className="mt-6 grid grid-cols-3 gap-2.5"><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Snitt</p><p className="mt-1 font-display text-2xl">{shortGameAverage}</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Inom 2 m</p><p className="mt-1 font-display text-2xl">{shortGameInsideTwo}%</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Sänkta</p><p className="mt-1 font-display text-2xl">{shortGameHoled}</p></div></section>}
        <section className="mt-5"><SpeechBubble avatar={coach.emoji} name={coach.name} text={category === "putting" ? (puttingSummary.threePuttPct >= 25 ? "Vi behöver få ner treputtarna. Nästa pass lägger vi mer vikt på fartkontroll från längre håll." : "Stabilt pass. Nästa gång bygger vi vidare på samma rutin och ser om streaksen blir längre.") : shortGameInsideTwo >= 60 ? "Bra kontroll runt målet. Nästa pass kan vi höja svårigheten lite." : "Nästa pass vill jag se fler bollar inom två meter. Landningspunkten blir vårt huvudfokus."} /></section>
        <section className="mt-6 space-y-2.5"><button type="button" onClick={startGame} className="w-full rounded-[20px] bg-emerald-600 py-4 font-display text-xl text-white">Träna igen</button><button type="button" onClick={() => { setPhase("setup"); setCategory(null); }} className="w-full rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Byt kategori</button><Link to="/tester" className="flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Klar</Link></section>
      </> : null}
    </main>
  );
}
