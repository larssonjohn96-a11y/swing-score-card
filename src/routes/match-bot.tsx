import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Flag,
  Lock,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  PUTTING_MATCH_FORMATS,
  PUTTING_MATCH_RULES,
  formatPuttingDistance,
  generatePuttingMatchDistances,
} from "@/lib/putting-match";

export const Route = createFileRoute("/match-bot")({
  head: () => ({ meta: [{ title: "Spela mot bot | SG4" }] }),
  component: BotMatchPage,
});

type Step = "bot" | "category" | "setup" | "length" | "play" | "result";
type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";
type Winner = "you" | "bot" | "tie";
type MatchLength = 5 | 9 | 18;
type TurnState = "you" | "bot-thinking" | "reveal";
type BotEvent = "start" | "bot-win" | "player-win" | "tie" | "pressure";

type BotChat = Record<BotEvent, string[]>;

type BotProfile = {
  id: string;
  name: string;
  hcp: number;
  gender: "Kvinna" | "Man";
  role: string;
  tier: "Nybörjare" | "Klubbspelare" | "Avancerad" | "Elit";
  avatar: string;
  intro: string;
  putting: number;
  shortGame: number;
  approach: number;
  driving: number;
  locked?: boolean;
  unlockText?: string;
  chat: BotChat;
};

type Hole = {
  title: string;
  detail: string;
  distance?: number;
  botValue?: number;
  botHit?: boolean;
  yourValue?: number;
  yourHit?: boolean;
  winner?: Winner;
};

const genericChat: BotChat = {
  start: ["Nu kör vi.", "Första hålet. Lycka till."],
  "bot-win": ["Den tar jag.", "Bra hål för mig."],
  "player-win": ["Snyggt spelat.", "Okej, den var din."],
  tie: ["Delat. Vidare.", "Jämnt där."],
  pressure: ["Nu börjar det bli intressant.", "De sista hålen avgör."],
};

const BOTS: BotProfile[] = [
  {
    id: "margaret", name: "Margaret", hcp: 42, gender: "Kvinna", role: "Grandma golfer", tier: "Nybörjare", avatar: "👵🏻",
    intro: "Jag spelar lugnt, men underskatta inte mina korta puttar.", putting: 4, shortGame: 2, approach: -2, driving: -6,
    chat: {
      start: ["Ta det lugnt nu, vi har gott om tid.", "Nu ska vi se om gammal är äldst."],
      "bot-win": ["Där satt den, precis som förr.", "Man behöver inte slå långt för att vinna."],
      "player-win": ["Åh, den var fin. Bra gjort.", "Du börjar bli farlig nu."],
      tie: ["Delat är också trevligt.", "Jämnt och fint."],
      pressure: ["Nu gäller det att hålla huvudet kallt.", "De sista är alltid roligast."],
    },
  },
  { id: "leo", name: "Leo", hcp: 34, gender: "Man", role: "Ny golfare", tier: "Nybörjare", avatar: "🧑🏻", intro: "Jag började nyligen. Några riktigt bra slag dyker upp ibland.", putting: -1, shortGame: -1, approach: 0, driving: 3, chat: genericChat },
  { id: "sarah", name: "Sarah", hcp: 27, gender: "Kvinna", role: "Weekend golfer", tier: "Nybörjare", avatar: "👩🏼", intro: "Helggolfare. Stabil när jag hittar rytmen.", putting: 2, shortGame: 0, approach: 0, driving: 1, chat: genericChat },
  {
    id: "zach", name: "Zach", hcp: 22, gender: "Man", role: "Weekend golfer", tier: "Klubbspelare", avatar: "🧔🏻",
    intro: "Jag gillar att slå långt. Precisionen får vi se hur det går med.", putting: -2, shortGame: -1, approach: 0, driving: 5,
    chat: {
      start: ["Hoppas du värmde upp.", "Okej, visa vad du har."],
      "bot-win": ["För enkelt.", "Den såg jag komma."],
      "player-win": ["Okej då. Bra slag.", "Njut av den, nästa tar jag."],
      tie: ["Delat? Jag tar nästa.", "Fortfarande jämnt."],
      pressure: ["Nu börjar pressen kännas, va?", "Sista hålen. Inga gratispoäng nu."],
    },
  },
  { id: "anna", name: "Anna", hcp: 16, gender: "Kvinna", role: "Klubbspelare", tier: "Klubbspelare", avatar: "👩🏻", intro: "Jag ger sällan bort ett hål. Du får vinna det.", putting: 2, shortGame: 2, approach: 1, driving: 0, chat: genericChat },
  { id: "marcus", name: "Marcus", hcp: 11, gender: "Man", role: "Tävlingsgolfare", tier: "Klubbspelare", avatar: "👨🏽", intro: "Jag spelar aggressivt och går för flaggan.", putting: -1, shortGame: 1, approach: 3, driving: 3, chat: genericChat },
  { id: "emma", name: "Emma", hcp: 7, gender: "Kvinna", role: "Singelhandicap", tier: "Avancerad", avatar: "👩🏼‍🦱", intro: "Fairways, greener och tålamod. Jag gör inte många stora misstag.", putting: 2, shortGame: 2, approach: 2, driving: 1, chat: genericChat },
  {
    id: "ryan", name: "Ryan", hcp: 3, gender: "Man", role: "College player", tier: "Avancerad", avatar: "🧑🏽",
    intro: "Collegegolf. Jag kommer att pressa dig från första slaget.", putting: 2, shortGame: 2, approach: 4, driving: 5,
    locked: true, unlockText: "Vinn matcher för att låsa upp", chat: genericChat,
  },
  { id: "maya", name: "Maya", hcp: 0, gender: "Kvinna", role: "Elitamatör", tier: "Avancerad", avatar: "👩🏾", intro: "Scratch. Jag räknar med att du träffar ditt bästa slag.", putting: 3, shortGame: 4, approach: 4, driving: 3, locked: true, unlockText: "Vinn matcher för att låsa upp", chat: genericChat },
  { id: "noah", name: "Noah", hcp: -2, gender: "Man", role: "College standout", tier: "Elit", avatar: "🧑🏼‍🦰", intro: "Jag spelar för att vinna. Pars räcker inte alltid.", putting: 4, shortGame: 3, approach: 5, driving: 5, locked: true, unlockText: "Vinn matcher för att låsa upp", chat: genericChat },
  {
    id: "sofia", name: "Sofia", hcp: -4, gender: "Kvinna", role: "Tour prospect", tier: "Elit", avatar: "👩🏻‍🦰",
    intro: "Små marginaler. Ett svagt slag och jag tar hålet.", putting: 5, shortGame: 5, approach: 5, driving: 4,
    locked: true, unlockText: "Vinn matcher för att låsa upp",
    chat: {
      start: ["Små marginaler från första hålet.", "Jag tänker inte ge bort något idag."],
      "bot-win": ["Det är så man stänger ett hål.", "Bra. Ett hål närmare."],
      "player-win": ["Bra. Gör om det.", "Starkt. Jag svarar på nästa."],
      tie: ["Delat. Marginalerna är små.", "Ingen ger sig."],
      pressure: ["Nu är det tour-tempo.", "Sista hålen. Exekvera."],
    },
  },
  {
    id: "alex", name: "Alex", hcp: -6, gender: "Man", role: "Tour level", tier: "Elit", avatar: "👨🏻",
    intro: "Tour-nivå. Du behöver spela nära ditt tak för att slå mig.", putting: 5, shortGame: 5, approach: 6, driving: 6,
    locked: true, unlockText: "Vinn matcher för att låsa upp",
    chat: {
      start: ["Spela ditt bästa. Det kommer behövas.", "Nu ser vi hur ditt spel håller under press."],
      "bot-win": ["Kontrollerat.", "Precis enligt plan."],
      "player-win": ["Bra nivå. Fortsätt så.", "Starkt hål."],
      tie: ["Inget separerar oss än.", "Vi fortsätter."],
      pressure: ["Det här är hålen som räknas.", "Nu avgör execution."],
    },
  },
];

const BOT_TIERS: BotProfile["tier"][] = ["Nybörjare", "Klubbspelare", "Avancerad", "Elit"];

const CATEGORIES = [
  { id: "off-the-tee", title: "Utslag", sub: "Off the Tee" },
  { id: "approach", title: "Inspel", sub: "Approach" },
  { id: "around-the-green", title: "Närspel", sub: "Around the Green" },
  { id: "putting", title: "Puttning", sub: "Putting" },
] as const;

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function formatHcp(hcp: number) { return hcp < 0 ? `+${Math.abs(hcp)}` : `${hcp}`; }
function sleep(ms: number) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
function randomLine(lines: string[]) { return lines[rand(0, lines.length - 1)] ?? ""; }

function puttingBotStrokes(distance: number, bot: BotProfile) {
  const skillHcp = bot.hcp - bot.putting;
  const makeChance = clamp(0.94 - distance * 0.055 - skillHcp * 0.006, 0.08, 0.96);
  if (Math.random() < makeChance) return 1;
  const threePuttChance = clamp(0.03 + Math.max(0, distance - 7) * 0.018 + skillHcp * 0.004, 0.01, 0.4);
  return Math.random() < threePuttChance ? 3 : 2;
}

function shortGameBotPoints(bot: BotProfile) {
  const skillHcp = bot.hcp - bot.shortGame;
  const roll = Math.random();
  const skill = clamp(1 - skillHcp / 40, 0.25, 1.15);
  if (roll < 0.05 * skill) return 4;
  if (roll < 0.2 + 0.22 * skill) return 3;
  if (roll < 0.52 + 0.22 * skill) return 2;
  if (roll < 0.82 + 0.08 * skill) return 1;
  return 0;
}

function approachBotProximity(distance: number, bot: BotProfile) {
  const skillHcp = bot.hcp - bot.approach;
  const base = distance * (0.035 + Math.max(-6, skillHcp) * 0.00125);
  const variation = 0.62 + Math.random() * 0.88;
  return Math.max(0.7, Math.round(base * variation * 10) / 10);
}

function drivingBotScore(bot: BotProfile) {
  const skillHcp = bot.hcp - bot.driving;
  const fairwayChance = clamp(0.74 - skillHcp * 0.009, 0.36, 0.82);
  const hit = Math.random() < fairwayChance;
  const carry = Math.round(258 - skillHcp * 1.35 + rand(-10, 10));
  return { hit, carry };
}

function BotMatchPage() {
  useHideBottomNav(true);
  const { displayName } = useAuth();
  const [step, setStep] = useState<Step>("bot");
  const [botId, setBotId] = useState("zach");
  const [category, setCategory] = useState<Category | null>(null);
  const [length, setLength] = useState<MatchLength>(9);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [yourValue, setYourValue] = useState<number | null>(null);
  const [driveHit, setDriveHit] = useState(true);
  const [turnState, setTurnState] = useState<TurnState>("you");
  const selectedBot = BOTS.find((item) => item.id === botId);
  const bot = selectedBot && !selectedBot.locked ? selectedBot : BOTS.find((item) => !item.locked) ?? BOTS[0];
  const [botComment, setBotComment] = useState(() => randomLine((selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]).chat.start));

  const score = useMemo(() => holes.reduce((s, h) => {
    if (h.winner === "you") s.you++;
    if (h.winner === "bot") s.bot++;
    if (h.winner === "tie") s.tie++;
    return s;
  }, { you: 0, bot: 0, tie: 0 }), [holes]);

  const current = holes[holeIndex];
  const playerName = displayName ?? "Du";
  const glass = "border-slate-300/80 bg-white/78 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const selected = "border-emerald-500 bg-emerald-50/95 ring-2 ring-emerald-500/25";

  function chooseBot(item: BotProfile) {
    if (item.locked) return;
    setBotId(item.id);
    setBotComment(randomLine(item.chat.start));
  }

  function buildHoles() {
    if (!category || bot.locked) return;
    const puttingDistances = category === "putting" ? generatePuttingMatchDistances(length) : [];
    const next: Hole[] = Array.from({ length }, (_unused, holeNr) => {
      if (category === "putting") {
        const d = puttingDistances[holeNr] ?? 3;
        return { title: formatPuttingDistance(d), distance: d, detail: "Samma position för båda · färre puttar vinner hålet" };
      }
      if (category === "around-the-green") {
        const d = rand(10, 30);
        return { title: `${d} m`, distance: d, detail: "Ett slag · högst zonpoäng vinner" };
      }
      if (category === "approach") {
        const d = rand(70, 180);
        return { title: `${d} m`, distance: d, detail: "Closest to Pin · lägst avstånd vinner" };
      }
      return { title: "30 m Fairway Challenge", detail: "Samma fairway och samma slag för båda spelarna" };
    });
    setBotComment(randomLine(bot.chat.start));
    setHoles(next);
    setHoleIndex(0);
    setYourValue(null);
    setDriveHit(true);
    setTurnState("you");
    setStep("play");
  }

  function simulateBot(hole: Hole) {
    if (!category) return { value: 0, hit: true };
    if (category === "putting") return { value: puttingBotStrokes(hole.distance ?? 3, bot), hit: true };
    if (category === "around-the-green") return { value: shortGameBotPoints(bot), hit: true };
    if (category === "approach") return { value: approachBotProximity(hole.distance ?? 120, bot), hit: true };
    const result = drivingBotScore(bot);
    return { value: result.carry, hit: result.hit };
  }

  function decideWinner(userValue: number, userHit: boolean, botValue: number, botHit: boolean): Winner {
    if (category === "around-the-green") return userValue > botValue ? "you" : userValue < botValue ? "bot" : "tie";
    if (category === "off-the-tee") {
      if (userHit && !botHit) return "you";
      if (!userHit && botHit) return "bot";
      if (!userHit && !botHit) return "tie";
      return userValue > botValue ? "you" : userValue < botValue ? "bot" : "tie";
    }
    return userValue < botValue ? "you" : userValue > botValue ? "bot" : "tie";
  }

  async function register() {
    if (!current || yourValue === null || !category || turnState !== "you") return;
    const lockedYourValue = yourValue;
    const lockedDriveHit = driveHit;
    setHoles((prev) => prev.map((h, i) => i === holeIndex ? { ...h, yourValue: lockedYourValue, yourHit: lockedDriveHit } : h));
    setTurnState("bot-thinking");
    await sleep(rand(2000, 3000));
    const simulated = simulateBot(current);
    const winner = decideWinner(lockedYourValue, lockedDriveHit, simulated.value, simulated.hit);
    setHoles((prev) => prev.map((h, i) => i === holeIndex ? { ...h, botValue: simulated.value, botHit: simulated.hit, winner } : h));
    const isPressure = holeIndex >= holes.length - 3;
    const event: BotEvent = isPressure ? "pressure" : winner === "bot" ? "bot-win" : winner === "you" ? "player-win" : "tie";
    setBotComment(randomLine(bot.chat[event]));
    setTurnState("reveal");
    await sleep(1400);
    setYourValue(null);
    setDriveHit(true);
    setTurnState("you");
    if (holeIndex >= holes.length - 1) setStep("result");
    else setHoleIndex((i) => i + 1);
  }

  function back() {
    if (step === "category") setStep("bot");
    else if (step === "setup") setStep("category");
    else if (step === "length") setStep(category === "around-the-green" ? "setup" : "category");
  }

  const label = step === "bot" ? "Motståndare" : step === "category" ? "Kategori" : step === "setup" ? "Setup" : category === "putting" ? "Format" : "Matchlängd";
  const resultLabel = (hole: Hole) => {
    if (hole.botValue == null || !category) return "";
    if (category === "around-the-green") return `${hole.botValue} p`;
    if (category === "approach") return `${hole.botValue.toFixed(1)} m`;
    if (category === "putting") return `${hole.botValue} puttar`;
    return hole.botHit ? `${hole.botValue} m · fairway` : `${hole.botValue} m · miss`;
  };

  return <main style={LIGHT_SURFACE} className={`mx-auto min-h-screen w-full max-w-md bg-background px-5 pt-6 text-foreground ${step === "bot" ? "pb-40" : "pb-16"}`}>
    {step !== "play" && step !== "result" ? <header className="flex items-center justify-between">
      {step === "bot" ? <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</Link> : <button onClick={back} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</button>}
      <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">SG4 Match · Bot</p><p className="text-[11px] font-semibold text-slate-700">{label}</p></div>
      <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link>
    </header> : null}

    {step === "bot" ? <>
      <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">1 mot 1</p><h1 className="mt-1 font-display text-4xl">Spela mot en bot</h1><p className="mt-2 text-sm text-slate-600">Välj en golfare. Varje bot har egen HCP, spelstil och styrkor.</p></section>
      <div className="mt-5 space-y-6">{BOT_TIERS.map((tier) => <section key={tier}><p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{tier}</p><div className="grid grid-cols-2 gap-3">{BOTS.filter((item) => item.tier === tier).map((item) => {
        const active = item.id === bot.id;
        return <button key={item.id} disabled={item.locked} onClick={() => chooseBot(item)} className={`relative min-h-[176px] overflow-hidden rounded-[26px] border p-4 text-left transition ${item.locked ? "border-slate-300 bg-slate-100/90 opacity-75" : active ? selected : glass}`}>
          {item.locked ? <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white"><Lock className="h-4 w-4" /></span> : active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" /></span> : null}
          <span className={`text-5xl leading-none ${item.locked ? "grayscale" : ""}`}>{item.avatar}</span><span className="mt-3 block font-display text-2xl">{item.name}</span><span className="mt-1 block text-xs font-bold text-slate-700">HCP {formatHcp(item.hcp)}</span><span className="mt-1 block text-[11px] text-slate-500">{item.gender} · {item.role}</span>
          {item.locked ? <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">Låst</span> : null}{item.locked && item.unlockText ? <span className="mt-1 block text-[10px] leading-snug text-slate-500">{item.unlockText}</span> : null}
        </button>;
      })}</div></section>)}</div>
      <section className={`mt-6 rounded-[28px] border p-4 ${glass}`}><div className="flex items-start gap-3"><span className="text-4xl">{bot.avatar}</span><div><p className="font-display text-xl">{bot.name}</p><p className="text-xs font-bold text-emerald-700">HCP {formatHcp(bot.hcp)} · {bot.role}</p><p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p></div></div></section>
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 bg-gradient-to-t from-white via-white/95 to-white/0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-8">
        <button onClick={() => setStep("category")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white shadow-xl">Spela mot {bot.name} <ChevronRight className="h-5 w-5" /></button>
      </div>
    </> : null}

    {step === "category" ? <><section className="mt-5"><div className="flex items-center gap-3"><span className="text-4xl">{bot.avatar}</span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><h1 className="mt-1 font-display text-4xl">Vad vill du spela?</h1></div></div></section><div className="mt-5 grid grid-cols-2 gap-3">{CATEGORIES.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`relative min-h-32 rounded-[26px] border p-4 text-left ${category === item.id ? selected : glass}`}><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{item.sub}</span><span className="mt-2 block font-display text-2xl">{item.title}</span>{category === item.id ? <Check className="absolute right-3 top-3 h-5 w-5 text-emerald-600" /> : null}</button>)}</div><button disabled={!category} onClick={() => setStep(category === "around-the-green" ? "setup" : "length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "setup" ? <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Närspel</p><h1 className="mt-1 font-display text-4xl">Closest to Pin</h1><p className="mt-2 text-sm text-slate-600">Du spelar först. Därefter slår {bot.name} från exakt samma avstånd.</p></section><div className={`mt-5 rounded-3xl border p-5 ${glass}`}><Target className="h-5 w-5 text-emerald-600" /><p className="mt-3 font-display text-2xl">10–30 meter</p><p className="mt-1 text-xs text-slate-500">Varierade närspelsavstånd.</p></div><button onClick={() => setStep("length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "length" ? <>{category === "putting" ? <>
      <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Putting Match</p><h1 className="mt-1 font-display text-4xl">Välj format</h1><p className="mt-2 text-sm text-slate-600">Samma spel varje gång – bara längden skiljer. Du och {bot.name} puttar från exakt samma positioner.</p></section>
      <div className="mt-5 space-y-3">{PUTTING_MATCH_FORMATS.map((f) => <button key={f.length} onClick={() => setLength(f.length)} className={`flex w-full items-center justify-between gap-4 rounded-[28px] border p-5 text-left ${length === f.length ? selected : glass}`}><span className="min-w-0"><span className="flex items-center gap-2"><span className="font-display text-2xl">{f.name}</span>{f.recommended ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white">Standard</span> : null}</span><span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{f.label}</span></span>{length === f.length ? <Check className="h-5 w-5 shrink-0 text-emerald-600" /> : null}</button>)}</div>
      <div className={`mt-4 rounded-3xl border p-4 ${glass}`}><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Så spelas Putting Match</p><ul className="mt-2 space-y-1">{PUTTING_MATCH_RULES.map((rule) => <li key={rule} className="text-[11px] leading-relaxed text-slate-600">· {rule}</li>)}</ul></div>
      <button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-slate-950 to-emerald-700 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button>
    </> : <><section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><h1 className="mt-1 font-display text-4xl">Bäst av</h1></section><div className="mt-5 grid grid-cols-3 gap-3">{([5,9,18] as const).map((v) => <button key={v} onClick={() => setLength(v)} className={`relative rounded-3xl border px-2 py-6 ${length === v ? selected : glass}`}><span className="font-display text-3xl">{v}</span><span className="mt-1 block text-[9px] font-black uppercase text-slate-500">hål</span></button>)}</div><button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-slate-950 to-emerald-700 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button></>}</> : null}

    {step === "play" && current ? <><header className="flex items-center justify-between"><Link to="/" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${glass}`}>‹</Link><div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mot {bot.name}</p><p className="text-[10px] font-bold text-slate-700">HCP {formatHcp(bot.hcp)}</p></div><span className="text-3xl">{bot.avatar}</span></header>
      <section className={`mt-3 overflow-hidden rounded-[24px] border ${glass}`}><div className="grid grid-cols-3 text-center"><div className="p-3"><p className="text-[10px] font-black uppercase text-blue-600">{playerName}</p><p className="mt-1 font-display text-3xl text-blue-700">{score.you}</p></div><div className="border-x border-slate-200 p-3"><p className="text-[9px] font-black uppercase text-slate-500">Hål</p><p className="mt-1 font-display text-3xl">{holeIndex + 1}/{length}</p></div><div className="p-3"><p className="text-[10px] font-black uppercase text-emerald-700">{bot.name}</p><p className="mt-1 font-display text-3xl text-emerald-700">{score.bot}</p></div></div></section>
      <div className="mt-3 flex items-start gap-2"><span className="text-3xl">{bot.avatar}</span><div className="relative max-w-[82%] rounded-2xl rounded-tl-md border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{bot.name}</p><p className="mt-0.5 text-sm leading-snug text-slate-700">“{botComment}”</p></div></div>
      <section className={`mt-3 rounded-[30px] border p-5 text-center ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{category}</p><h1 className="mt-2 font-display text-5xl">{current.title}</h1><p className="mt-2 text-xs text-slate-600">{current.detail}</p>
        {turnState === "you" ? <div className="mt-4 rounded-2xl bg-blue-50 p-3"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Din tur</p><p className="mt-1 text-sm font-bold text-blue-900">Du spelar först</p></div> : null}
        {turnState === "bot-thinking" ? <div className="mt-4 rounded-2xl bg-emerald-50 p-4"><div className="flex items-center justify-center gap-3"><span className="text-3xl">{bot.avatar}</span><div className="text-left"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">{bot.name} spelar…</p><div className="mt-2 flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600" /></div></div></div></div> : null}
        {turnState === "reveal" && current.botValue != null ? <div className="mt-4 rounded-2xl bg-emerald-50 p-4"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">{bot.name}s resultat</p><p className="mt-1 font-display text-3xl text-emerald-800">{resultLabel(current)}</p><p className="mt-2 text-sm font-bold text-slate-800">{current.winner === "you" ? `${playerName} vinner hålet` : current.winner === "bot" ? `${bot.name} vinner hålet` : "Hålet delas"}</p></div> : null}
      </section>
      <section className="mt-3"><p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ditt resultat</p>
        {category === "putting" ? <div className="mt-2 grid grid-cols-4 gap-2">{[1,2,3,4].map((v) => <button key={v} disabled={turnState !== "you"} onClick={() => setYourValue(v)} className={`rounded-2xl border py-4 font-display text-2xl disabled:opacity-50 ${yourValue === v ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{v}</button>)}</div> : category === "around-the-green" ? <div className="mt-2 grid grid-cols-5 gap-2">{[0,1,2,3,4].map((v) => <button key={v} disabled={turnState !== "you"} onClick={() => setYourValue(v)} className={`rounded-xl border py-4 font-display text-xl disabled:opacity-50 ${yourValue === v ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{v}p</button>)}</div> : category === "approach" ? <div className={`mt-2 rounded-3xl border p-4 ${glass}`}><p className="text-center font-display text-4xl">{yourValue ?? 10}<span className="ml-1 text-xl text-slate-500">m</span></p><div className="mt-3 grid grid-cols-4 gap-2"><button disabled={turnState !== "you"} onClick={() => setYourValue(Math.max(0.5,(yourValue ?? 10)-5))} className="rounded-xl border bg-white py-3 disabled:opacity-50">−5</button><button disabled={turnState !== "you"} onClick={() => setYourValue(Math.max(0.5,(yourValue ?? 10)-1))} className="rounded-xl border bg-white py-3 disabled:opacity-50">−1</button><button disabled={turnState !== "you"} onClick={() => setYourValue((yourValue ?? 10)+1)} className="rounded-xl border bg-white py-3 disabled:opacity-50">+1</button><button disabled={turnState !== "you"} onClick={() => setYourValue((yourValue ?? 10)+5)} className="rounded-xl border bg-white py-3 disabled:opacity-50">+5</button></div></div> : <div className={`mt-2 rounded-3xl border p-4 ${glass}`}><div className="grid grid-cols-2 gap-2"><button disabled={turnState !== "you"} onClick={() => setDriveHit(true)} className={`rounded-2xl border py-3 text-sm font-bold disabled:opacity-50 ${driveHit ? "border-blue-600 bg-blue-600 text-white" : "bg-white"}`}>Fairway</button><button disabled={turnState !== "you"} onClick={() => setDriveHit(false)} className={`rounded-2xl border py-3 text-sm font-bold disabled:opacity-50 ${!driveHit ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>Miss</button></div><p className="mt-4 text-center font-display text-4xl">{yourValue ?? 220}<span className="ml-1 text-xl text-slate-500">m</span></p><div className="mt-3 grid grid-cols-4 gap-2"><button disabled={turnState !== "you"} onClick={() => setYourValue(Math.max(0,(yourValue ?? 220)-10))} className="rounded-xl border bg-white py-3 disabled:opacity-50">−10</button><button disabled={turnState !== "you"} onClick={() => setYourValue(Math.max(0,(yourValue ?? 220)-1))} className="rounded-xl border bg-white py-3 disabled:opacity-50">−1</button><button disabled={turnState !== "you"} onClick={() => setYourValue((yourValue ?? 220)+1)} className="rounded-xl border bg-white py-3 disabled:opacity-50">+1</button><button disabled={turnState !== "you"} onClick={() => setYourValue((yourValue ?? 220)+10)} className="rounded-xl border bg-white py-3 disabled:opacity-50">+10</button></div></div>}
        <button disabled={yourValue === null || turnState !== "you"} onClick={register} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-35">Spela mitt slag <ChevronRight className="h-5 w-5" /></button>
      </section>
    </> : null}

    {step === "result" ? <><section className={`mt-6 rounded-[30px] border p-5 text-center ${glass}`}><span className="text-5xl">{bot.avatar}</span><Trophy className="mx-auto mt-3 h-6 w-6 text-amber-500" /><p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Slutresultat</p><h1 className="mt-2 font-display text-5xl">{score.you}–{score.bot}</h1><p className="mt-2 text-sm font-bold">{score.you > score.bot ? `${playerName} vinner över ${bot.name}` : score.bot > score.you ? `${bot.name} vinner` : "Matchen slutar delad"}</p><p className="mt-1 text-xs text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><p className="mt-1 text-xs text-slate-500">{score.tie ? `${score.tie} delade hål` : `${length} hål spelade`}</p></section><div className="mt-5 space-y-3"><button onClick={buildHoles} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button><button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div></> : null}
  </main>;
}
