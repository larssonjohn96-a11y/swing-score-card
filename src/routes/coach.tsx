import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  COACHES,
  coachPuttingComment,
  loadSelectedCoach,
  nextCoachPuttingDistance,
  recordCoachPuttingAttempt,
  saveSelectedCoach,
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

const CATEGORIES: Array<{ id: Category; title: string; subtitle: string; description: string; available: boolean }> = [
  { id: "putting", title: "Puttning", subtitle: "Putting", description: "Håla ut från varierade avstånd. Färre puttar är bättre.", available: true },
  { id: "around-the-green", title: "Chippning", subtitle: "Chipping", description: "Närmast hålet från varierade lägen.", available: false },
  { id: "bunker", title: "Bunker", subtitle: "Bunkerslag", description: "Träna beslut och resultat från bunker.", available: false },
  { id: "approach", title: "Inspel", subtitle: "Järn & wedge", description: "Varierade avstånd mot samma typ av mål.", available: false },
  { id: "off-the-tee", title: "Driver", subtitle: "Utslag", description: "Fairway, längd och spridning från tee.", available: false },
  { id: "speed", title: "Speed", subtitle: "Ball speed", description: "Speed-format med coachfeedback.", available: false },
];

function newSessionId() {
  return `coach-putting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function SpeechBubble({ avatar, name, text }: { avatar: string; name: string; text: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-slate-700/10 bg-[#25231f] text-4xl shadow-sm">{avatar}</div>
      <div className="relative mb-1 flex-1 rounded-[18px] bg-white px-4 py-3.5 text-slate-900 shadow-[0_8px_24px_-18px_rgba(15,23,42,.45)]">
        <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 bg-white" />
        <p className="relative text-[10px] font-black uppercase tracking-[.13em] text-slate-400">{name}</p>
        <p className="relative mt-1 text-sm font-medium leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function PlayWithCoachPage() {
  useHideBottomNav(true);
  const [phase, setPhase] = useState<Phase>("setup");
  const [coachId, setCoachId] = useState<CoachId>(() => loadSelectedCoach());
  const coach = COACHES.find((item) => item.id === coachId) ?? COACHES[0];
  const [category, setCategory] = useState<Category | null>(null);
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [distance, setDistance] = useState(() => nextCoachPuttingDistance());
  const [attempts, setAttempts] = useState<CoachPuttingAttempt[]>([]);
  const [coachText, setCoachText] = useState("Välj vad du vill spela så kör vi direkt.");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const summary = useMemo(() => summarizeCoachPutting(attempts), [attempts]);

  function selectCoach(next: CoachId) {
    setCoachId(next);
    saveSelectedCoach(next);
  }

  function startGame() {
    if (category !== "putting") return;
    setSessionId(newSessionId());
    setAttempts([]);
    setDistance(nextCoachPuttingDistance());
    setCoachText("Vi kör putting. Spela första putten och registrera resultatet direkt.");
    setConfirmEnd(false);
    setTransitioning(false);
    setPhase("play");
  }

  function registerResult(strokes: 1 | 2 | 3 | 4) {
    if (transitioning) return;
    setTransitioning(true);
    const sequence = attempts.length + 1;
    const attempt = recordCoachPuttingAttempt(sessionId, sequence, distance, strokes, coachId);
    const nextAttempts = [...attempts, attempt];
    const comment = coachPuttingComment(distance, strokes, coachId, sequence);
    const nextDistance = nextCoachPuttingDistance(distance);
    setAttempts(nextAttempts);
    setCoachText(comment ?? (strokes === 1 ? "Snyggt. Den satt. Nästa läge." : strokes >= 3 ? "Registrerat. Släpp den och gå vidare till nästa läge." : "Bra. Nästa putt."));
    window.setTimeout(() => {
      setDistance(nextDistance);
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
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Välj coach</p>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {COACHES.map((item) => {
              const active = item.id === coachId;
              return <button key={item.id} type="button" onClick={() => selectCoach(item.id)} className={`relative rounded-[24px] border px-2 py-4 text-center transition active:scale-[.98] ${active ? "border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/15" : "border-slate-200 bg-white"}`}>
                {active ? <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span> : null}
                <span className="block text-4xl leading-none">{item.emoji}</span>
                <span className="mt-2 block font-display text-lg leading-none text-slate-950">{item.name}</span>
                <span className="mt-1 block text-[9px] font-bold leading-tight text-slate-500">{item.style}</span>
              </button>;
            })}
          </div>
        </section>

        <section className="mt-6">
          <SpeechBubble avatar={coach.emoji} name={coach.name} text="Välj en kategori. Jag styr variationen under spelet och ger feedback när det faktiskt hjälper." />
        </section>

        <section className="mt-7">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Kategori</p>
          <h1 className="mt-1 font-display text-[36px] leading-none text-slate-950">Vad ska ni tävla i?</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {CATEGORIES.map((item) => {
              const active = category === item.id;
              return <button key={item.id} type="button" onClick={() => item.available && setCategory(item.id)} className={`relative min-h-[132px] rounded-[24px] border p-4 text-left transition active:scale-[.985] ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/15" : item.available ? "border-slate-200 bg-white" : "border-slate-200 bg-white/55 opacity-50"}`}>
                {active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <p className="font-display text-2xl leading-none text-slate-950">{item.title}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-slate-400">{item.subtitle}</p>
                <p className="mt-3 text-xs leading-snug text-slate-500">{item.available ? item.description : "Kommer snart"}</p>
              </button>;
            })}
          </div>
          <button type="button" disabled={category !== "putting"} onClick={startGame} className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] bg-slate-950 py-4 font-display text-xl text-white shadow-sm disabled:opacity-25">Starta <ChevronRight className="h-5 w-5" /></button>
        </section>
      </> : null}

      {phase === "play" ? <>
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-blue-500 bg-blue-50 text-sm font-black text-blue-700">DU</span>
            <div><p className="text-sm font-black text-slate-950">Du</p><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Putting</p></div>
          </div>
          <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Infinity</p><p className="font-display text-xl text-slate-950">{attempts.length}</p></div>
          <div className="flex items-center gap-2.5 text-right">
            <div><p className="text-sm font-black text-slate-950">{coach.name}</p><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Coach</p></div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-red-500 bg-red-50 text-2xl">{coach.emoji}</span>
          </div>
        </header>

        <section className="mt-5 rounded-[30px] border border-slate-200 bg-white px-5 py-7 text-center shadow-[0_18px_42px_-30px_rgba(15,23,42,.45)]">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Nästa putt</p>
          <h1 className={`mt-2 font-display text-[76px] leading-none text-slate-950 transition-opacity ${transitioning ? "opacity-35" : "opacity-100"}`}>{distance} m</h1>
          <p className="mt-3 text-sm text-slate-500">Håla ut från positionen.</p>
        </section>

        <section className="mt-4">
          <SpeechBubble avatar={coach.emoji} name={coach.name} text={coachText} />
        </section>

        <section className="mt-6">
          <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Ditt resultat</p><h2 className="mt-1 font-display text-2xl text-slate-950">Antal puttar</h2></div>
          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {([1, 2, 3, 4] as const).map((strokes) => <button key={strokes} type="button" disabled={transitioning} onClick={() => registerResult(strokes)} className="rounded-[20px] border border-slate-200 bg-white px-1 py-4 text-center shadow-sm transition active:scale-[.96] disabled:opacity-40"><span className="block font-display text-3xl leading-none text-slate-950">{strokes}</span><span className="mt-1.5 block text-[8px] font-black uppercase tracking-[.08em] text-slate-400">{strokes === 1 ? "putt" : "puttar"}</span></button>)}
          </div>
        </section>

        <button type="button" onClick={() => setConfirmEnd(true)} className="mt-7 w-full rounded-[18px] border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-500">Avsluta spel</button>

        {confirmEnd ? <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl"><button type="button" onClick={() => setConfirmEnd(false)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button><h2 className="font-display text-3xl leading-none text-slate-950">Avsluta spelet?</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">Dina {attempts.length} registrerade puttar är redan sparade.</p><div className="mt-5 space-y-2.5"><button type="button" onClick={() => setConfirmEnd(false)} className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white">Fortsätt spela</button><button type="button" onClick={endSession} className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-black text-red-700">Avsluta spel</button></div></div></div> : null}
      </> : null}

      {phase === "summary" ? <>
        <header className="flex items-center justify-between"><span className="h-10 w-10" /><div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Resultat</p><p className="text-sm font-black text-slate-950">Putting med {coach.name}</p></div><span className="h-10 w-10" /></header>
        <section className="mt-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-red-50 text-4xl">{coach.emoji}</span><h1 className="mt-4 font-display text-4xl leading-none text-slate-950">Bra spelat.</h1><p className="mt-2 text-sm text-slate-500">{summary.count} puttar registrerade</p></section>
        <section className="mt-6 grid grid-cols-3 gap-2.5"><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">Snitt</p><p className="mt-1 font-display text-2xl">{summary.avg}</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">1-putt</p><p className="mt-1 font-display text-2xl">{summary.onePuttPct}%</p></div><div className="rounded-[22px] border border-slate-200 bg-white p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-400">3-putt+</p><p className="mt-1 font-display text-2xl">{summary.threePuttPct}%</p></div></section>
        <section className="mt-5"><SpeechBubble avatar={coach.emoji} name={coach.name} text={summary.count === 0 ? "Vi hann inte registrera något. Kör igen när du är redo." : summary.threePuttPct >= 25 ? "Nästa gång vill jag se mer kontroll på de längre puttarna. Vi fortsätter variera lägena men väger lite mer mot det som sticker ut." : "Stabil session. Nästa gång fortsätter vi med samma banspelslika variation och bygger vidare på mönstren."} /></section>
        <section className="mt-6 space-y-2.5"><button type="button" onClick={startGame} className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-emerald-600 py-4 font-display text-xl text-white"><Target className="h-5 w-5" /> Spela igen</button><button type="button" onClick={() => { setPhase("setup"); setCategory(null); }} className="w-full rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Byt kategori</button><Link to="/spela" className="flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white py-4 font-display text-xl text-slate-950">Klar</Link></section>
      </> : null}
    </main>
  );
}
