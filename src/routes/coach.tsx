import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Target, X } from "lucide-react";
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

export const Route = createFileRoute("/coach")({
  head: () => ({ meta: [{ title: "Spela med coach | SG4" }] }),
  component: PlayWithCoachPage,
});

type Phase = "setup" | "play" | "summary";
type Category = "putting" | "around-the-green" | "bunker" | "approach" | "off-the-tee" | "speed";
type PressureChallenge = { title: string; detail: string; maxStrokes: 1 | 2 };

const DEFAULT_COACH_ID: CoachId = "alma";

const CATEGORIES: Array<{ id: Category; title: string; available: boolean }> = [
  { id: "putting", title: "Puttning", available: true },
  { id: "around-the-green", title: "Chippning", available: false },
  { id: "bunker", title: "Bunker", available: false },
  { id: "approach", title: "Inspel", available: false },
  { id: "off-the-tee", title: "Driver", available: false },
  { id: "speed", title: "Speed", available: false },
];

function newSessionId() {
  return `coach-putting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDistance(distance: number) {
  return Number.isInteger(distance) ? String(distance) : String(distance).replace(".", ",");
}

function consecutiveFromEnd(attempts: CoachPuttingAttempt[], predicate: (attempt: CoachPuttingAttempt) => boolean) {
  let count = 0;
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (!predicate(attempts[index])) break;
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

function maybePressureChallenge(distance: number, attempts: CoachPuttingAttempt[]): PressureChallenge | null {
  const shortStreak = shortHoledStreak(attempts);
  const longStreak = longNoThreeStreak(attempts);

  if (distance <= 3 && shortStreak >= 2) {
    const chance = distance >= 2.5 ? 0.68 : 0.46;
    if (Math.random() > chance) return null;
    return { title: "Håla denna putt", detail: `Håll ${shortStreak} kortputtar i rad vid liv`, maxStrokes: 1 };
  }

  if (distance > 8 && longStreak >= 3) {
    const chance = distance >= 12 ? 0.68 : 0.46;
    if (Math.random() > chance) return null;
    return { title: "Max 2 puttar", detail: `Håll ${longStreak} långputtar utan treputt vid liv`, maxStrokes: 2 };
  }

  return null;
}

function SpeechBubble({ avatar, name, text, fixed = false }: { avatar: string; name: string; text: string; fixed?: boolean }) {
  return (
    <div className={`flex items-end gap-3 ${fixed ? "h-[126px]" : ""}`}>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center text-[58px] leading-none">{avatar}</div>
      <div className={`relative mb-0 flex-1 rounded-[18px] bg-white px-4 py-3.5 text-slate-900 shadow-[0_8px_24px_-18px_rgba(15,23,42,.45)] ${fixed ? "h-[122px] overflow-hidden" : ""}`}>
        <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 bg-white" />
        <p className="relative text-[10px] font-black uppercase tracking-[.13em] text-slate-400">{name}</p>
        <p className={`relative mt-1 text-[15.5px] font-medium leading-[1.42] ${fixed ? "line-clamp-3" : ""}`}>{text}</p>
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
  const [attempts, setAttempts] = useState<CoachPuttingAttempt[]>([]);
  const [coachText, setCoachText] = useState("Välj vad du vill spela. Jag styr variationen och säger till när något är värt att justera.");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [pressure, setPressure] = useState<PressureChallenge | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    void supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.display_name) setPlayerName(data.display_name);
    });
    return () => { cancelled = true; };
  }, [user, loading]);

  const summary = useMemo(() => summarizeCoachPutting(attempts), [attempts]);
  const liveStats = useMemo(() => {
    const totalPutts = attempts.reduce((sum, attempt) => sum + attempt.strokes, 0);
    const shortStreak = shortHoledStreak(attempts);
    const noThreeStreak = consecutiveFromEnd(attempts, (attempt) => attempt.strokes <= 2);
    const longStreak = longNoThreeStreak(attempts);

    let highlightLabel = "Puttar";
    let highlightValue = String(totalPutts);
    if (shortStreak >= 2) {
      highlightLabel = "≤3 m i rad";
      highlightValue = `🔥 ${shortStreak}`;
    } else if (longStreak >= 2) {
      highlightLabel = ">8 m utan 3-putt";
      highlightValue = `🎯 ${longStreak}`;
    } else if (noThreeStreak >= 3) {
      highlightLabel = "≤2 puttar i rad";
      highlightValue = String(noThreeStreak);
    }

    return { totalPutts, holes: attempts.length, shortStreak, longStreak, highlightLabel, highlightValue };
  }, [attempts]);

  function startGame() {
    if (category !== "putting") return;
    const firstDistance = nextCoachPuttingDistance();
    setSessionId(newSessionId());
    setAttempts([]);
    setDistance(firstDistance);
    setPressure(null);
    setCoachText("Vi kör. Läs putten, välj fart och slå med ett tydligt beslut.");
    setConfirmEnd(false);
    setTransitioning(false);
    setPhase("play");
  }

  function registerResult(strokes: 1 | 2 | 3 | 4) {
    if (transitioning) return;
    setTransitioning(true);
    const sequence = attempts.length + 1;
    const activePressure = pressure;
    const attempt = recordCoachPuttingAttempt(sessionId, sequence, distance, strokes, coachId);
    const nextAttempts = [...attempts, attempt];
    const comment = coachPuttingComment(distance, strokes, coachId, sequence);
    const nextDistance = nextCoachPuttingDistance(distance);
    const pressureWon = activePressure ? strokes <= activePressure.maxStrokes : false;

    setAttempts(nextAttempts);
    if (activePressure) {
      setCoachText(pressureWon
        ? strokes === 1 ? "Bra. Du höll streaken vid liv." : "Bra tvåputt. Streaken lever."
        : activePressure.maxStrokes === 1 ? "Den streaken är över. Bygg en ny direkt." : "Treputten bröt streaken. Släpp den och börja om.");
    } else {
      setCoachText(comment ?? (strokes === 1 ? "Bra. Samma rutin nästa gång." : strokes >= 3 ? "Den blev dyr. Släpp den och fokusera på nästa." : "Bra tvåputt. Nästa."));
    }

    window.setTimeout(() => {
      setDistance(nextDistance);
      setPressure(maybePressureChallenge(nextDistance, nextAttempts));
      setTransitioning(false);
    }, 280);
  }

  function endSession() {
    setConfirmEnd(false);
    setPhase("summary");
  }

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-10 pt-[max(16px,env(safe-area-inset-top))] text-foreground">
      {phase === "setup" ? <>
        <header className="flex items-center justify-between">
          <Link to="/spela" aria-label="Tillbaka till Spela" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl shadow-sm">‹</Link>
          <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">SG4 Coach</p><p className="text-sm font-black text-slate-900">Spela med coach</p></div>
          <span className="h-10 w-10" />
        </header>

        <section className="mt-6">
          <SpeechBubble avatar={coach.emoji} name={coach.name} text="Välj vad du vill spela. Jag styr variationen och säger till när något är värt att justera." />
        </section>

        <section className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Coachläge</p>
          <h1 className="mt-1 font-display text-[38px] leading-none text-slate-950">Vad vill du spela?</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {CATEGORIES.map((item) => {
              const active = category === item.id;
              return <button key={item.id} type="button" onClick={() => item.available && setCategory(item.id)} className={`relative flex min-h-[122px] items-center justify-center rounded-[24px] border p-4 text-center transition active:scale-[.985] ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15" : item.available ? "border-slate-200 bg-white" : "border-slate-200 bg-white/55 opacity-50"}`}>
                {active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <p className={`font-display text-[27px] leading-none ${active ? "text-blue-700" : "text-slate-950"}`}>{item.title}</p>
              </button>;
            })}
          </div>
          <button type="button" disabled={category !== "putting"} onClick={startGame} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] bg-blue-600 py-4 font-display text-xl text-white shadow-sm transition active:scale-[.99] disabled:opacity-25">Starta <ChevronRight className="h-5 w-5" /></button>
        </section>
      </> : null}

      {phase === "play" ? <>
        <style>{`@keyframes sg4PressureEnter{0%{opacity:.25;transform:scale(.985)}55%{opacity:1;transform:scale(1.006)}100%{opacity:1;transform:scale(1)}}@keyframes sg4PressurePulse{0%,100%{transform:scale(1);box-shadow:0 12px 28px -20px rgba(245,158,11,.52),0 0 0 0 rgba(250,204,21,0)}45%{transform:scale(1.012);box-shadow:0 18px 34px -19px rgba(245,158,11,.78),0 0 0 2px rgba(250,204,21,.32)}65%{transform:scale(1.006);box-shadow:0 15px 31px -19px rgba(245,158,11,.66),0 0 0 1px rgba(250,204,21,.18)}}@keyframes sg4PressureWave{0%{transform:translateX(-145%) skewX(-18deg);opacity:0}12%{opacity:.18}48%{opacity:.62}78%{opacity:.18}100%{transform:translateX(245%) skewX(-18deg);opacity:0}}`}</style>

        <header className="-mx-5 grid min-h-[76px] w-[calc(100%+2.5rem)] grid-cols-[60%_40%] overflow-hidden border-y border-slate-200 bg-white shadow-[0_10px_28px_-24px_rgba(15,23,42,.5)]">
          <div className="relative z-10 flex min-w-0 items-center bg-blue-600 px-5 pr-9 text-white after:absolute after:-right-6 after:top-0 after:h-full after:w-9 after:bg-blue-600 after:[clip-path:polygon(0_0,36%_0,100%_50%,36%_100%,0_100%)]">
            <div className="min-w-0">
              <p className="truncate font-display text-[28px] leading-none text-white">{playerName}</p>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[.14em] text-blue-100">{liveStats.holes} hål spelade</p>
            </div>
          </div>
          <div className="relative flex min-w-0 items-center justify-end bg-white pl-8 pr-5 text-right">
            <div className="min-w-0">
              <p className="truncate text-[8px] font-black uppercase tracking-[.12em] text-slate-400">{liveStats.highlightLabel}</p>
              <p className="mt-0.5 font-display text-[27px] leading-none text-slate-950">{liveStats.highlightValue}</p>
            </div>
          </div>
        </header>

        <section className="mt-3">
          <SpeechBubble avatar={coach.emoji} name={coach.name} text={coachText} fixed />
        </section>

        {pressure ? <div className="mt-2 overflow-hidden">
          <div key={`${distance}-${pressure.title}`} className="relative overflow-hidden rounded-[22px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-5 py-3 text-center text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureEnter 420ms cubic-bezier(.2,.8,.25,1) both, sg4PressurePulse 1.9s ease-in-out 520ms infinite" }}>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-transparent via-white/90 to-transparent blur-[1px]" style={{ animation: "sg4PressureWave 1.18s cubic-bezier(.2,.75,.25,1) 150ms both" }} />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">Pressläge · Nu gäller det</p>
              <p className="mt-1 font-display text-lg leading-none text-slate-950">{pressure.title}</p>
              <p className="mt-1 text-xs font-bold leading-snug text-slate-800">{pressure.detail}</p>
            </div>
          </div>
        </div> : null}

        <section className={`${pressure ? "mt-2" : "mt-0"} rounded-[26px] border border-slate-200 bg-white px-5 py-5 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.45)]`}>
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Avstånd</p>
          <h1 className={`mt-1 font-display text-[58px] leading-none text-slate-950 transition-opacity ${transitioning ? "opacity-35" : "opacity-100"}`}>{formatDistance(distance)} m</h1>
        </section>

        <section className="mt-5">
          <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Antal puttar</h2></div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {([1, 2, 3, 4] as const).map((strokes) => <button key={strokes} type="button" disabled={transitioning} onClick={() => registerResult(strokes)} className="rounded-[20px] border border-blue-300 bg-blue-50 px-1 py-4 text-center shadow-sm transition hover:bg-blue-100 active:scale-[.96] active:bg-blue-200 disabled:opacity-40"><span className="block font-display text-3xl leading-none text-blue-800">{strokes}</span><span className="mt-1.5 block text-[8px] font-black uppercase tracking-[.08em] text-blue-500">{strokes === 1 ? "putt" : "puttar"}</span></button>)}
          </div>
        </section>

        <button type="button" onClick={() => setConfirmEnd(true)} className="mt-6 w-full rounded-[18px] border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-500">Avsluta spel</button>

        {confirmEnd ? <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl"><button type="button" onClick={() => setConfirmEnd(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button><h2 className="font-display text-3xl leading-none text-slate-950">Avsluta spelet?</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">Dina {attempts.length} registrerade hål är redan sparade.</p><div className="mt-5 space-y-2.5"><button type="button" onClick={() => setConfirmEnd(false)} className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white">Fortsätt spela</button><button type="button" onClick={endSession} className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-black text-red-700">Avsluta spel</button></div></div></div> : null}
      </> : null}

      {phase === "summary" ? <>
        <header className="flex items-center justify-between"><span className="h-10 w-10" /><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Resultat</p><p className="text-sm font-black text-slate-950">Putting med {coach.name}</p></div><span className="h-10 w-10" /></header>
        <section className="mt-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center text-5xl">{coach.emoji}</span><h1 className="mt-4 font-display text-4xl leading-none text-slate-950">Bra spelat.</h1><p className="mt-2 text-sm text-slate-500">{summary.count} puttar registrerade</p></section>
        <section className="mt-6 grid grid-cols-3 gap-2.5"><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Snitt</p><p className="mt-1 font-display text-2xl">{summary.avg}</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">1-putt</p><p className="mt-1 font-display text-2xl">{summary.onePuttPct}%</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">3-putt+</p><p className="mt-1 font-display text-2xl">{summary.threePuttPct}%</p></div></section>
        <section className="mt-5"><SpeechBubble avatar={coach.emoji} name={coach.name} text={summary.count === 0 ? "Vi hann inte få några resultat. Kör igen när du är redo." : summary.threePuttPct >= 25 ? "Vi behöver få ner treputtarna. Nästa pass lägger vi lite mer vikt på fartkontroll från längre håll." : "Stabilt pass. Nästa gång bygger vi vidare på samma rutin och ser om streaksen blir längre."} /></section>
        <section className="mt-6 space-y-2.5"><button type="button" onClick={startGame} className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-emerald-600 py-4 font-display text-xl text-white"><Target className="h-5 w-5" /> Spela igen</button><button type="button" onClick={() => { setPhase("setup"); setCategory(null); }} className="w-full rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Byt kategori</button><Link to="/spela" className="flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Klar</Link></section>
      </> : null}
    </main>
  );
}
