import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Check, ChevronRight, Flag, RotateCcw, Target, Trophy, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";

export const Route = createFileRoute("/match-bot")({
  head: () => ({ meta: [{ title: "Spela mot bot | SG4" }] }),
  component: BotMatchPage,
});

type Step = "bot" | "category" | "type" | "setup" | "length" | "play" | "result";
type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";
type Winner = "you" | "bot" | "tie";
type MatchLength = 5 | 9 | 18;
type Hole = { title: string; detail: string; botValue: number; yourValue?: number; winner?: Winner };

const BOT_LEVELS = [
  { hcp: 0, label: "Scratch", detail: "Mycket svår" },
  { hcp: 5, label: "HCP 5", detail: "Svår" },
  { hcp: 10, label: "HCP 10", detail: "Bra klubbspelare" },
  { hcp: 18, label: "HCP 18", detail: "Medel" },
  { hcp: 28, label: "HCP 28", detail: "Förlåtande" },
] as const;

const CATEGORIES = [
  { id: "off-the-tee", title: "Utslag", sub: "Off the Tee" },
  { id: "approach", title: "Inspel", sub: "Approach" },
  { id: "around-the-green", title: "Närspel", sub: "Around the Green" },
  { id: "putting", title: "Puttning", sub: "Putting" },
] as const;

const PUTTING_TYPES = [
  { id: "short", title: "Korta puttar", detail: "1–5 meter" },
  { id: "mix", title: "Mixade avstånd", detail: "1–10 meter" },
  { id: "lag", title: "Långa puttar", detail: "8–22 meter" },
] as const;

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

function puttingBotStrokes(distance: number, hcp: number) {
  const makeChance = clamp(0.94 - distance * 0.055 - hcp * 0.006, 0.08, 0.92);
  if (Math.random() < makeChance) return 1;
  const threePuttChance = clamp(0.03 + Math.max(0, distance - 7) * 0.018 + hcp * 0.004, 0.03, 0.36);
  return Math.random() < threePuttChance ? 3 : 2;
}

function shortGameBotPoints(hcp: number) {
  const roll = Math.random();
  const skill = clamp(1 - hcp / 40, 0.25, 1);
  if (roll < 0.05 * skill) return 4;
  if (roll < 0.20 + 0.22 * skill) return 3;
  if (roll < 0.52 + 0.22 * skill) return 2;
  if (roll < 0.82 + 0.08 * skill) return 1;
  return 0;
}

function approachBotProximity(distance: number, hcp: number) {
  const base = distance * (0.035 + hcp * 0.00125);
  const variation = 0.65 + Math.random() * 0.9;
  return Math.max(1, Math.round(base * variation * 10) / 10);
}

function drivingBotScore(hcp: number) {
  const fairwayChance = clamp(0.74 - hcp * 0.009, 0.38, 0.75);
  const hit = Math.random() < fairwayChance;
  const carry = Math.round(258 - hcp * 1.35 + rand(-10, 10));
  return { hit, carry };
}

function BotMatchPage() {
  useHideBottomNav(true);
  const { displayName } = useAuth();
  const [step, setStep] = useState<Step>("bot");
  const [botHcp, setBotHcp] = useState<number>(10);
  const [category, setCategory] = useState<Category | null>(null);
  const [puttingType, setPuttingType] = useState("mix");
  const [length, setLength] = useState<MatchLength>(5);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [yourValue, setYourValue] = useState<number | null>(null);
  const [driveHit, setDriveHit] = useState(true);

  const score = useMemo(() => holes.reduce((s, h) => {
    if (h.winner === "you") s.you++;
    if (h.winner === "bot") s.bot++;
    if (h.winner === "tie") s.tie++;
    return s;
  }, { you: 0, bot: 0, tie: 0 }), [holes]);
  const current = holes[holeIndex];
  const playerName = displayName ?? "Du";
  const glass = "border-slate-300/80 bg-white/78 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const selected = "border-blue-400 bg-blue-50/90 ring-2 ring-blue-500/30";

  function buildHoles() {
    if (!category) return;
    const next: Hole[] = Array.from({ length }, () => {
      if (category === "putting") {
        const d = puttingType === "short" ? rand(1, 5) : puttingType === "lag" ? rand(8, 22) : rand(1, 10);
        return { title: `${d} m`, detail: "Håla ut · lägst antal puttar vinner", botValue: puttingBotStrokes(d, botHcp) };
      }
      if (category === "around-the-green") {
        const d = rand(10, 30);
        return { title: `${d} m`, detail: "Ett slag · högst zonpoäng vinner", botValue: shortGameBotPoints(botHcp) };
      }
      if (category === "approach") {
        const d = rand(70, 180);
        return { title: `${d} m`, detail: "Closest to Pin · lägst avstånd vinner", botValue: approachBotProximity(d, botHcp) };
      }
      const bot = drivingBotScore(botHcp);
      return { title: "30 m Fairway Challenge", detail: bot.hit ? `Bot: ${bot.carry} m i fairway` : `Bot: missade fairway`, botValue: bot.hit ? bot.carry : 0 };
    });
    setHoles(next); setHoleIndex(0); setYourValue(null); setDriveHit(true); setStep("play");
  }

  function register() {
    if (!current || yourValue === null || !category) return;
    let winner: Winner;
    if (category === "around-the-green") winner = yourValue > current.botValue ? "you" : yourValue < current.botValue ? "bot" : "tie";
    else if (category === "off-the-tee") {
      const botHit = current.botValue > 0;
      winner = driveHit && !botHit ? "you" : !driveHit && botHit ? "bot" : !driveHit && !botHit ? "tie" : yourValue > current.botValue ? "you" : yourValue < current.botValue ? "bot" : "tie";
    } else winner = yourValue < current.botValue ? "you" : yourValue > current.botValue ? "bot" : "tie";
    const next = holes.map((h, i) => i === holeIndex ? { ...h, yourValue, winner } : h);
    setHoles(next); setYourValue(null); setDriveHit(true);
    if (holeIndex >= holes.length - 1) setStep("result");
    else setHoleIndex((i) => i + 1);
  }

  function back() {
    if (step === "category") setStep("bot");
    else if (step === "type" || step === "setup") setStep("category");
    else if (step === "length") setStep(category === "putting" ? "type" : category === "around-the-green" ? "setup" : "category");
  }

  const label = step === "bot" ? "Motståndare" : step === "category" ? "Kategori" : step === "type" ? "Spel" : step === "setup" ? "Setup" : "Matchlängd";

  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    {step !== "play" && step !== "result" ? <header className="flex items-center justify-between">
      {step === "bot" ? <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</Link> : <button onClick={back} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</button>}
      <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">SG4 Match · Bot</p><p className="text-[11px] font-semibold text-slate-700">{label}</p></div>
      <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link>
    </header> : null}

    {step === "bot" ? <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">1 mot 1</p><h1 className="mt-1 font-display text-4xl">Välj bot</h1><p className="mt-2 text-sm text-slate-600">Botens nivå styr hur starka resultat den simulerar.</p></section><div className="mt-5 space-y-2.5">{BOT_LEVELS.map((bot) => <button key={bot.hcp} onClick={() => setBotHcp(bot.hcp)} className={`relative flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${botHcp === bot.hcp ? selected : glass}`}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><Bot className="h-5 w-5" /></span><span className="flex-1"><span className="block font-display text-xl">{bot.label}</span><span className="text-xs text-slate-500">{bot.detail}</span></span>{botHcp === bot.hcp ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>)}</div><button onClick={() => setStep("category")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "category" ? <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">HCP {botHcp} Bot</p><h1 className="mt-1 font-display text-4xl">Vad vill du spela?</h1></section><div className="mt-5 grid grid-cols-2 gap-3">{CATEGORIES.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`relative min-h-32 rounded-[26px] border p-4 text-left ${category === item.id ? selected : glass}`}><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{item.sub}</span><span className="mt-2 block font-display text-2xl">{item.title}</span>{category === item.id ? <Check className="absolute right-3 top-3 h-5 w-5 text-blue-600" /> : null}</button>)}</div><button disabled={!category} onClick={() => setStep(category === "putting" ? "type" : category === "around-the-green" ? "setup" : "length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "type" ? <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Puttning</p><h1 className="mt-1 font-display text-4xl">Välj spel</h1></section><div className="mt-5 space-y-3">{PUTTING_TYPES.map((item) => <button key={item.id} onClick={() => setPuttingType(item.id)} className={`flex w-full items-center justify-between rounded-3xl border p-5 text-left ${puttingType === item.id ? selected : glass}`}><span><span className="block font-display text-2xl">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.detail}</span></span>{puttingType === item.id ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>)}</div><button onClick={() => setStep("length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "setup" ? <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Närspel</p><h1 className="mt-1 font-display text-4xl">Closest to Pin</h1><p className="mt-2 text-sm text-slate-600">Samma zonpoäng som i vanliga matchspelet. Boten får ett simulerat resultat på varje hål.</p></section><div className={`mt-5 rounded-3xl border p-5 ${glass}`}><Target className="h-5 w-5 text-blue-600" /><p className="mt-3 font-display text-2xl">10–30 meter</p><p className="mt-1 text-xs text-slate-500">Varierade närspelsavstånd.</p></div><button onClick={() => setStep("length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "length" ? <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Match Play</p><h1 className="mt-1 font-display text-4xl">Bäst av</h1></section><div className="mt-5 grid grid-cols-3 gap-3">{([5,9,18] as const).map((v) => <button key={v} onClick={() => setLength(v)} className={`relative rounded-3xl border px-2 py-6 ${length === v ? selected : glass}`}><span className="font-display text-3xl">{v}</span><span className="mt-1 block text-[9px] font-black uppercase text-slate-500">hål</span></button>)}</div><button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-950 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button></> : null}

    {step === "play" && current ? <><header className="flex items-center justify-between"><Link to="/" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${glass}`}>‹</Link><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mot HCP {botHcp} Bot</p><span className="h-9 w-9" /></header><section className={`mt-3 overflow-hidden rounded-[24px] border ${glass}`}><div className="grid grid-cols-3 text-center"><div className="p-3"><p className="text-[10px] font-black uppercase text-blue-600">{playerName}</p><p className="mt-1 font-display text-3xl text-blue-700">{score.you}</p></div><div className="border-x border-slate-200 p-3"><p className="text-[9px] font-black uppercase text-slate-500">Hål</p><p className="mt-1 font-display text-3xl">{holeIndex + 1}/{length}</p></div><div className="p-3"><p className="text-[10px] font-black uppercase text-red-600">Bot</p><p className="mt-1 font-display text-3xl text-red-700">{score.bot}</p></div></div></section><section className={`mt-3 rounded-[30px] border p-5 text-center ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{category}</p><h1 className="mt-2 font-display text-5xl">{current.title}</h1><p className="mt-2 text-xs text-slate-600">{current.detail}</p>{category !== "off-the-tee" ? <div className="mt-4 rounded-2xl bg-red-50 p-3"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-600">Botens resultat</p><p className="mt-1 font-display text-3xl text-red-700">{category === "around-the-green" ? `${current.botValue} p` : category === "approach" ? `${current.botValue.toFixed(1)} m` : `${current.botValue} puttar`}</p></div> : null}</section>
      <section className="mt-3"><p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ditt resultat</p>{category === "putting" ? <div className="mt-2 grid grid-cols-4 gap-2">{[1,2,3,4].map((v) => <button key={v} onClick={() => setYourValue(v)} className={`rounded-2xl border py-4 font-display text-2xl ${yourValue === v ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{v}</button>)}</div> : category === "around-the-green" ? <div className="mt-2 grid grid-cols-5 gap-2">{[0,1,2,3,4].map((v) => <button key={v} onClick={() => setYourValue(v)} className={`rounded-xl border py-4 font-display text-xl ${yourValue === v ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{v}p</button>)}</div> : category === "approach" ? <div className={`mt-2 rounded-3xl border p-4 ${glass}`}><p className="text-center font-display text-4xl">{yourValue ?? 10}<span className="ml-1 text-xl text-slate-500">m</span></p><div className="mt-3 grid grid-cols-4 gap-2"><button onClick={() => setYourValue(Math.max(0.5,(yourValue ?? 10)-5))} className="rounded-xl border bg-white py-3">−5</button><button onClick={() => setYourValue(Math.max(0.5,(yourValue ?? 10)-1))} className="rounded-xl border bg-white py-3">−1</button><button onClick={() => setYourValue((yourValue ?? 10)+1)} className="rounded-xl border bg-white py-3">+1</button><button onClick={() => setYourValue((yourValue ?? 10)+5)} className="rounded-xl border bg-white py-3">+5</button></div></div> : <div className={`mt-2 rounded-3xl border p-4 ${glass}`}><div className="grid grid-cols-2 gap-2"><button onClick={() => setDriveHit(true)} className={`rounded-2xl border py-3 text-sm font-bold ${driveHit ? "border-blue-600 bg-blue-600 text-white" : "bg-white"}`}>Fairway</button><button onClick={() => setDriveHit(false)} className={`rounded-2xl border py-3 text-sm font-bold ${!driveHit ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>Miss</button></div><p className="mt-4 text-center font-display text-4xl">{yourValue ?? 220}<span className="ml-1 text-xl text-slate-500">m</span></p><div className="mt-3 grid grid-cols-4 gap-2"><button onClick={() => setYourValue(Math.max(0,(yourValue ?? 220)-10))} className="rounded-xl border bg-white py-3">−10</button><button onClick={() => setYourValue(Math.max(0,(yourValue ?? 220)-1))} className="rounded-xl border bg-white py-3">−1</button><button onClick={() => setYourValue((yourValue ?? 220)+1)} className="rounded-xl border bg-white py-3">+1</button><button onClick={() => setYourValue((yourValue ?? 220)+10)} className="rounded-xl border bg-white py-3">+10</button></div></div>}<button disabled={yourValue === null} onClick={register} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-35">Registrera <ChevronRight className="h-5 w-5" /></button></section></> : null}

    {step === "result" ? <><section className={`mt-6 rounded-[30px] border p-5 text-center ${glass}`}><Trophy className="mx-auto h-6 w-6 text-amber-500" /><p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Slutresultat</p><h1 className="mt-2 font-display text-5xl">{score.you}–{score.bot}</h1><p className="mt-2 text-sm font-bold">{score.you > score.bot ? `${playerName} vinner` : score.bot > score.you ? `HCP ${botHcp} Bot vinner` : "Matchen slutar delad"}</p><p className="mt-1 text-xs text-slate-500">{score.tie ? `${score.tie} delade hål` : `${length} hål spelade`}</p></section><div className="mt-5 space-y-3"><button onClick={buildHoles} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch</button><button onClick={() => { setCategory(null); setStep("category"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Ny match</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div></> : null}
  </main>;
}
