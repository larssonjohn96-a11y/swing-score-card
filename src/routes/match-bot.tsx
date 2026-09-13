import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Flag, Lock, RotateCcw, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  PUTTING_MATCH_FORMATS,
  PUTTING_MATCH_RULES,
  formatPuttingDistance,
  generatePuttingMatchDistances,
} from "@/lib/putting-match";
import { CHIP_POINT_ZONES, generateChipMatchDistances, getChipDistanceBand } from "@/lib/chip-match";
import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance, type EngineSkill } from "@/lib/sg4-engine";
import { getRecommendationsForSkill } from "@/lib/sg4-surface-recommendations";
import { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen } from "@/lib/sg4-recommender";
import {
  APPROACH_MATCH_FORMATS,
  type ApproachResult,
  type ApproachSide,
  approachProximity,
  formatApproachResult,
  generateApproachMatchDistances,
  simulateApproachResult,
} from "@/lib/approach-match";

export const Route = createFileRoute("/match-bot")({
  head: () => ({ meta: [{ title: "Spela mot bot | SG4" }] }),
  component: BotMatchPage,
});

type Step = "bot" | "category" | "setup" | "length" | "play" | "sudden-death" | "result";
type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";
type Winner = "you" | "bot" | "tie";
type MatchLength = 3 | 5 | 7;
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
  botApproach?: ApproachResult;
  yourApproach?: ApproachResult;
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
  { id: "ryan", name: "Ryan", hcp: 3, gender: "Man", role: "College player", tier: "Avancerad", avatar: "🧑🏽", intro: "Collegegolf. Jag kommer att pressa dig från första slaget.", putting: 2, shortGame: 2, approach: 4, driving: 5, locked: true, unlockText: "Vinn matcher för att låsa upp", chat: genericChat },
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
function engineSkillForBotCategory(category: Category | null): EngineSkill | null {
  if (category === "putting") return "putting";
  if (category === "around-the-green") return "chip";
  if (category === "approach") return "approach";
  if (category === "off-the-tee") return "driver";
  return null;
}

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
  if (roll < 0.05 * skill) return 5;
  if (roll < 0.18 + 0.18 * skill) return 4;
  if (roll < 0.42 + 0.18 * skill) return 3;
  if (roll < 0.65 + 0.14 * skill) return 2;
  if (roll < 0.88 + 0.06 * skill) return 1;
  return 0;
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
  const [length, setLength] = useState<MatchLength>(5);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [yourValue, setYourValue] = useState<number | null>(null);
  const [driveHit, setDriveHit] = useState(true);
  const [turnState, setTurnState] = useState<TurnState>("you");
  const [approachDistance, setApproachDistance] = useState(0);
  const [approachLateral, setApproachLateral] = useState(0);
  const [approachSide, setApproachSide] = useState<ApproachSide>("right");
  const [suddenDeathRound, setSuddenDeathRound] = useState(1);
  const [sdBotText, setSdBotText] = useState("");
  const [sdBusy, setSdBusy] = useState(false);
  const [suddenDeathWinner, setSuddenDeathWinner] = useState<"you" | "bot" | null>(null);
  const [showSuddenDeathIntro, setShowSuddenDeathIntro] = useState(false);
  const [winnerCelebration, setWinnerCelebration] = useState<"you" | "bot" | null>(null);

  const selectedBot = BOTS.find((item) => item.id === botId);
  const bot = selectedBot && !selectedBot.locked ? selectedBot : BOTS.find((item) => !item.locked) ?? BOTS[0];
  const [botComment, setBotComment] = useState(() => randomLine((selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]).chat.start));

  useEffect(() => {
    if (step !== "sudden-death") return;
    setShowSuddenDeathIntro(true);
    const timer = window.setTimeout(() => setShowSuddenDeathIntro(false), 2400);
    return () => window.clearTimeout(timer);
  }, [step, suddenDeathRound]);

  const score = useMemo(() => holes.reduce((s, h) => {
    if (h.winner === "you") s.you++;
    if (h.winner === "bot") s.bot++;
    if (h.winner === "tie") s.tie++;
    return s;
  }, { you: 0, bot: 0, tie: 0 }), [holes]);

  const current = holes[holeIndex];
  const playerName = displayName ?? "Du";
  const resultEngineSkill = engineSkillForBotCategory(category);
  const resultRecommendation = resultEngineSkill ? getRecommendationsForSkill(resultEngineSkill, 1)[0] : undefined;
  useEffect(() => {
    if (step !== "result") return;
    recordRecommendationCompletion("play-bot");
    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);
  }, [step, resultRecommendation?.id]);
  const glass = "border-slate-300/80 bg-white/78 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const selected = "border-emerald-500 bg-emerald-50/95 ring-2 ring-emerald-500/25";

  function resetShotInput(targetDistance = 0) {
    setYourValue(null);
    setDriveHit(true);
    setApproachDistance(targetDistance);
    setApproachLateral(0);
    setApproachSide("right");
  }

  function chooseBot(item: BotProfile) {
    if (item.locked) return;
    setBotId(item.id);
    setBotComment(randomLine(item.chat.start));
  }

  function buildHoles() {
    if (!category || bot.locked) return;
    const puttingDistances = category === "putting" ? generatePuttingMatchDistances(length) : [];
    const chipDistances = category === "around-the-green" ? generateChipMatchDistances(length) : [];
    const approachDistances = category === "approach" ? generateApproachMatchDistances(length) : [];
    const next: Hole[] = Array.from({ length }, (_unused, holeNr) => {
      if (category === "putting") {
        const d = puttingDistances[holeNr] ?? 3;
        return { title: formatPuttingDistance(d), distance: d, detail: "Samma position för båda · färre puttar vinner hålet" };
      }
      if (category === "around-the-green") {
        const d = chipDistances[holeNr] ?? 15;
        const band = getChipDistanceBand(d);
        return { title: `${d} m`, distance: d, detail: `${band.label} · ${band.range} · samma avstånd för båda` };
      }
      if (category === "approach") {
        const d = approachDistances[holeNr] ?? 120;
        return { title: `${d} m`, distance: d, detail: "Justera faktisk längd från målavståndet · 0 m sidled = rakt" };
      }
      return { title: "30 m Fairway Challenge", detail: "Samma fairway och samma slag för båda spelarna" };
    });
    setBotComment(randomLine(bot.chat.start));
    setHoles(next);
    setHoleIndex(0);
    resetShotInput(category === "approach" ? next[0]?.distance ?? 0 : 0);
    setTurnState("you");
    setSuddenDeathRound(1); setSdBotText(""); setSdBusy(false); setSuddenDeathWinner(null);
    setStep("play");
  }

  function simulateBot(hole: Hole) {
    if (!category) return { value: 0, hit: true, approachResult: undefined as ApproachResult | undefined };
    if (category === "putting") return { value: puttingBotStrokes(hole.distance ?? 3, bot), hit: true, approachResult: undefined };
    if (category === "around-the-green") return { value: shortGameBotPoints(bot), hit: true, approachResult: undefined };
    if (category === "approach") {
      const approachResult = simulateApproachResult(bot.hcp, bot.approach, hole.distance ?? 120);
      return { value: approachProximity(approachResult, hole.distance ?? 120), hit: true, approachResult };
    }
    const result = drivingBotScore(bot);
    return { value: result.carry, hit: result.hit, approachResult: undefined };
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

  const approachReady = category === "approach" && approachDistance > 0;
  const canRegister = category === "approach" ? approachReady : yourValue !== null;

  function adjustApproachDistance(delta: number) {
    if (turnState !== "you") return;
    setApproachDistance((value) => Math.max(0, value + delta));
  }

  function adjustApproachLateral(delta: number) {
    if (turnState !== "you") return;
    setApproachLateral((value) => Math.max(0, value + delta));
  }

  function chooseApproachSide(side: "left" | "right") {
    if (turnState !== "you") return;
    setApproachSide(side);
  }

  async function register() {
    if (!current || !category || turnState !== "you" || !canRegister) return;

    let lockedYourValue = yourValue ?? 0;
    let lockedApproach: ApproachResult | undefined;
    if (category === "approach") {
      lockedApproach = {
        actualDistance: Math.round(approachDistance),
        lateral: Math.round(approachLateral),
        side: approachLateral === 0 ? "center" : approachSide,
      };
      lockedYourValue = approachProximity(lockedApproach, current.distance ?? 120);
    }

    const lockedDriveHit = driveHit;
    const engineSkill = category === "putting" ? "putting" : category === "around-the-green" ? "chip" : null;
    const enginePerformance = category === "putting"
      ? puttingPerformanceFromStrokes(lockedYourValue)
      : category === "around-the-green"
        ? chipPerformanceFromPoints(lockedYourValue)
        : null;
    let adaptiveNextDistance: number | null = null;
    if (engineSkill && enginePerformance !== null) {
      recordEngineOutcome({
        skill: engineSkill,
        distance: current.distance,
        performance: enginePerformance,
        context: "game",
        activityId: engineSkill === "putting" ? "putting-match" : "chip-match",
      });
      if (holeIndex < holes.length - 1 && typeof current.distance === "number") {
        adaptiveNextDistance = selectNextEngineDistance({
          skill: engineSkill,
          objective: "balanced",
          min: engineSkill === "putting" ? 1 : 8,
          max: engineSkill === "putting" ? 22 : 30,
          previousDistance: current.distance,
          previousPerformance: enginePerformance,
        });
      }
    }
    setHoles((prev) => prev.map((h, i) => {
      if (i === holeIndex) return { ...h, yourValue: lockedYourValue, yourHit: lockedDriveHit, yourApproach: lockedApproach };
      if (i === holeIndex + 1 && adaptiveNextDistance !== null) {
        if (engineSkill === "putting") {
          return { ...h, title: formatPuttingDistance(adaptiveNextDistance), distance: adaptiveNextDistance, detail: "Samma position för båda · färre puttar vinner hålet" };
        }
        const band = getChipDistanceBand(adaptiveNextDistance);
        return { ...h, title: `${adaptiveNextDistance} m`, distance: adaptiveNextDistance, detail: `${band.label} · ${band.range} · samma avstånd för båda` };
      }
      return h;
    }));

    setTurnState("bot-thinking");
    await sleep(rand(2000, 3000));
    const simulated = simulateBot(current);
    const winner = decideWinner(lockedYourValue, lockedDriveHit, simulated.value, simulated.hit);

    setHoles((prev) => prev.map((h, i) =>
      i === holeIndex
        ? { ...h, botValue: simulated.value, botHit: simulated.hit, botApproach: simulated.approachResult, winner }
        : h,
    ));

    const isPressure = holeIndex >= holes.length - 3;
    const event: BotEvent = isPressure ? "pressure" : winner === "bot" ? "bot-win" : winner === "you" ? "player-win" : "tie";
    setBotComment(randomLine(bot.chat[event]));
    setTurnState("reveal");
    await sleep(1400);
    setTurnState("you");
    if (holeIndex >= holes.length - 1) {
      resetShotInput();
      const finalYou = score.you + (winner === "you" ? 1 : 0);
      const finalBot = score.bot + (winner === "bot" ? 1 : 0);
      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }
      else { setWinnerCelebration(finalYou > finalBot ? "you" : "bot"); await sleep(2300); setWinnerCelebration(null); setStep("result"); }
    } else {
      const nextIndex = holeIndex + 1;
      resetShotInput(category === "approach" ? holes[nextIndex]?.distance ?? 0 : 0);
      setHoleIndex(nextIndex);
    }
  }

  function simulateSuddenDeathBot() {
    const skillHcp = bot.hcp - bot.putting;
    const makeChance = clamp(0.22 - skillHcp * 0.0045, 0.035, 0.32);
    if (Math.random() < makeChance) return { sunk: true, distance: 0 };
    const spread = clamp(2.2 + skillHcp * 0.045, 0.8, 4.8);
    return { sunk: false, distance: Math.max(0.2, Math.round((0.2 + Math.random() * spread) * 10) / 10) };
  }

  async function playSuddenDeath(yourDistance: number | null) {
    if (sdBusy) return;
    const yourSunk = yourDistance === null;
    setSdBusy(true); setSdBotText(`${bot.name} slår från 11 m…`);
    await sleep(rand(2000, 3000));
    const b = simulateSuddenDeathBot();
    setSdBotText(b.sunk ? `${bot.name}: sänkt` : `${bot.name}: ${b.distance.toFixed(1)} m från flaggan`);
    const tied = (yourSunk && b.sunk) || (!yourSunk && !b.sunk && yourDistance === b.distance);
    if (tied) {
      await sleep(1000);
      setSdBotText("Lika igen · ny straff från 11 m");
      await sleep(900);
      setSuddenDeathRound((r) => r + 1); setSdBotText(""); setSdBusy(false);
      return;
    }
    const youWin = yourSunk || (!b.sunk && !yourSunk && (yourDistance ?? Infinity) < b.distance);
    await sleep(900);
    setBotComment(youWin ? randomLine(bot.chat["player-win"]) : randomLine(bot.chat["bot-win"]));
    setSuddenDeathWinner(youWin ? "you" : "bot");
    setWinnerCelebration(youWin ? "you" : "bot");
    await sleep(2300);
    setWinnerCelebration(null); setStep("result"); setSdBusy(false);
  }

  function back() {
    if (step === "category") setStep("bot");
    else if (step === "setup") setStep("category");
    else if (step === "length") setStep(category === "around-the-green" ? "setup" : "category");
  }

  const label = step === "bot" ? "Motståndare" : step === "category" ? "Kategori" : step === "setup" ? "Setup" : category === "putting" || category === "approach" ? "Format" : "Matchlängd";
  const resultLabel = (hole: Hole) => {
    if (hole.botValue == null || !category) return "";
    if (category === "around-the-green") return `${hole.botValue} p`;
    if (category === "approach") return hole.botApproach ? formatApproachResult(hole.botApproach) : "";
    if (category === "putting") return `${hole.botValue} puttar`;
    return hole.botHit ? `${hole.botValue} m · fairway` : `${hole.botValue} m · miss`;
  };

  const approachSummary =
    approachDistance > 0
      ? formatApproachResult({
          actualDistance: approachDistance,
          lateral: approachLateral,
          side: approachLateral === 0 ? "center" : approachSide,
        })
      : "Ställ in slaglängden";

  const approachPlay = step === "play" && category === "approach";

  return (
    <main style={LIGHT_SURFACE} className={`mx-auto min-h-screen w-full max-w-md bg-background px-5 ${approachPlay ? "pt-4 pb-8" : step === "bot" ? "pt-6 pb-40" : "pt-6 pb-16"} text-foreground`}>
      {step !== "play" && step !== "sudden-death" && step !== "result" ? (
        <header className="flex items-center justify-between">
          {step === "bot" ? (
            <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</Link>
          ) : (
            <button onClick={back} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</button>
          )}
          <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">SG4 Match · Bot</p><p className="text-[11px] font-semibold text-slate-700">{label}</p></div>
          <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link>
        </header>
      ) : null}

      {step === "bot" ? (
        <>
          <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">1 mot 1</p><h1 className="mt-1 font-display text-4xl">Spela mot en bot</h1><p className="mt-2 text-sm text-slate-600">Välj en golfare. Varje bot har egen HCP, spelstil och styrkor.</p></section>
          <div className="mt-5 space-y-6">
            {BOT_TIERS.map((tier) => (
              <section key={tier}>
                <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{tier}</p>
                <div className="grid grid-cols-2 gap-3">
                  {BOTS.filter((item) => item.tier === tier).map((item) => {
                    const active = item.id === bot.id;
                    return (
                      <button key={item.id} disabled={item.locked} onClick={() => chooseBot(item)} className={`relative min-h-[176px] overflow-hidden rounded-[26px] border p-4 text-left transition ${item.locked ? "border-slate-300 bg-slate-100/90 opacity-75" : active ? selected : glass}`}>
                        {item.locked ? <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white"><Lock className="h-4 w-4" /></span> : active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" /></span> : null}
                        <span className={`text-5xl leading-none ${item.locked ? "grayscale" : ""}`}>{item.avatar}</span>
                        <span className="mt-3 block font-display text-2xl">{item.name}</span>
                        <span className="mt-1 block text-xs font-bold text-slate-700">HCP {formatHcp(item.hcp)}</span>
                        <span className="mt-1 block text-[11px] text-slate-500">{item.gender} · {item.role}</span>
                        {item.locked ? <span className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">Låst</span> : null}
                        {item.locked && item.unlockText ? <span className="mt-1 block text-[10px] leading-snug text-slate-500">{item.unlockText}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <section className={`mt-6 rounded-[28px] border p-4 ${glass}`}><div className="flex items-start gap-3"><span className="text-4xl">{bot.avatar}</span><div><p className="font-display text-xl">{bot.name}</p><p className="text-xs font-bold text-emerald-700">HCP {formatHcp(bot.hcp)} · {bot.role}</p><p className="mt-2 text-sm leading-5 text-slate-600">“{bot.intro}”</p></div></div></section>
          <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 bg-gradient-to-t from-white via-white/95 to-white/0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-8">
            <button onClick={() => setStep("category")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white shadow-xl">Spela mot {bot.name} <ChevronRight className="h-5 w-5" /></button>
          </div>
        </>
      ) : null}

      {step === "category" ? (
        <>
          <section className="mt-5"><div className="flex items-center gap-3"><span className="text-4xl">{bot.avatar}</span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><h1 className="mt-1 font-display text-4xl">Vad vill du spela?</h1></div></div></section>
          <div className="mt-5 grid grid-cols-2 gap-3">{CATEGORIES.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`relative min-h-32 rounded-[26px] border p-4 text-left ${category === item.id ? selected : glass}`}><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{item.sub}</span><span className="mt-2 block font-display text-2xl">{item.title}</span>{category === item.id ? <Check className="absolute right-3 top-3 h-5 w-5 text-emerald-600" /> : null}</button>)}</div>
          <button disabled={!category} onClick={() => setStep(category === "around-the-green" ? "setup" : "length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button>
        </>
      ) : null}

      {step === "setup" ? (
        <>
          <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Närspel</p><h1 className="mt-1 font-display text-4xl">Closest to Pin</h1><p className="mt-2 text-sm text-slate-600">Du spelar först. Därefter slår {bot.name} från exakt samma avstånd.</p></section>
          <div className={`mt-5 rounded-3xl border p-5 ${glass}`}><Target className="h-5 w-5 text-emerald-600" /><p className="mt-3 font-display text-2xl">10–30 meter</p><p className="mt-1 text-xs text-slate-500">Varierade närspelsavstånd.</p></div>
          <button onClick={() => setStep("length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white">Nästa <ChevronRight className="h-5 w-5" /></button>
        </>
      ) : null}

      {step === "length" ? (
        category === "putting" || category === "approach" ? (
          <>
            <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{category === "putting" ? "Putting Match" : "Approach Match"}</p><h1 className="mt-1 font-display text-4xl">Välj format</h1><p className="mt-2 text-sm text-slate-600">{category === "putting" ? `Samma spel varje gång – bara längden skiljer. Du och ${bot.name} puttar från exakt samma positioner.` : `Samma spel varje gång – bara längden skiljer. Du och ${bot.name} slår från exakt samma avstånd.`}</p></section>
            <div className="mt-5 space-y-3">{(category === "putting" ? PUTTING_MATCH_FORMATS : APPROACH_MATCH_FORMATS).map((f) => <button key={f.length} onClick={() => setLength(f.length)} className={`flex w-full items-center justify-between gap-4 rounded-[28px] border p-5 text-left ${length === f.length ? selected : glass}`}><span className="min-w-0"><span className="flex items-center gap-2"><span className="font-display text-2xl">{f.name}</span>{f.recommended ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white">Standard</span> : null}</span><span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{f.label}</span></span>{length === f.length ? <Check className="h-5 w-5 shrink-0 text-emerald-600" /> : null}</button>)}</div>
            {category === "putting" ? (
              <div className={`mt-4 rounded-3xl border p-4 ${glass}`}><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Så spelas Putting Match</p><ul className="mt-2 space-y-1">{PUTTING_MATCH_RULES.map((rule) => <li key={rule} className="text-[11px] leading-relaxed text-slate-600">· {rule}</li>)}</ul></div>
            ) : (
              <div className={`mt-4 rounded-3xl border p-4 ${glass}`}><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Så spelas Approach Match</p><p className="mt-2 text-[11px] leading-relaxed text-slate-600">· Ett slag per hål från samma målavstånd.</p><p className="text-[11px] leading-relaxed text-slate-600">· Längden startar på målavståndet. Justera till faktisk TrackMan-längd med ±5/±1.</p><p className="text-[11px] leading-relaxed text-slate-600">· Sidled startar på 0 m. Närmast flaggan vinner hålet.</p></div>
            )}
            <button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-slate-950 to-emerald-700 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button>
          </>
        ) : (
          <>
            <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><h1 className="mt-1 font-display text-4xl">Bäst av</h1></section>
            <div className="mt-5 grid grid-cols-3 gap-3">{([3, 5, 7] as const).map((v) => <button key={v} onClick={() => setLength(v)} className={`relative rounded-3xl border px-2 py-6 ${length === v ? selected : glass}`}><span className="font-display text-3xl">{v}</span><span className="mt-1 block text-[9px] font-black uppercase text-slate-500">hål</span></button>)}</div>
            <button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-slate-950 to-emerald-700 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button>
          </>
        )
      ) : null}

      {step === "play" && current ? (
        <>
          <header className="flex items-center justify-between"><Link to="/" className={`inline-flex ${approachPlay ? "h-9 w-9" : "h-9 w-9"} items-center justify-center rounded-full border ${glass}`}>‹</Link><div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Mot {bot.name}</p><p className="text-[10px] font-bold text-slate-700">HCP {formatHcp(bot.hcp)}</p></div><span className="text-3xl">{bot.avatar}</span></header>
          <section className={`${approachPlay ? "mt-2 rounded-[22px]" : "mt-3 rounded-[24px]"} overflow-hidden border ${glass}`}><div className="grid grid-cols-3 text-center"><div className={approachPlay ? "p-2.5" : "p-3"}><p className="text-[10px] font-black uppercase text-blue-600">{playerName}</p><p className="mt-1 font-display text-3xl text-blue-700">{score.you}</p></div><div className={`${approachPlay ? "p-2.5" : "p-3"} border-x border-slate-200`}><p className="text-[9px] font-black uppercase text-slate-500">Hål</p><p className="mt-1 font-display text-3xl">{holeIndex + 1}/{length}</p></div><div className={approachPlay ? "p-2.5" : "p-3"}><p className="text-[10px] font-black uppercase text-emerald-700">{bot.name}</p><p className="mt-1 font-display text-3xl text-emerald-700">{score.bot}</p></div></div></section>
          <div className={`${approachPlay ? "mt-2" : "mt-3"} flex items-start gap-2`}><span className="text-3xl">{bot.avatar}</span><div className={`relative max-w-[82%] rounded-2xl rounded-tl-md border border-slate-200 bg-white/90 ${approachPlay ? "px-3 py-2" : "px-3 py-2"} shadow-sm`}><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{bot.name}</p><p className="mt-0.5 text-sm leading-snug text-slate-700">“{botComment}”</p></div></div>
          <section className={`${approachPlay ? "mt-2 rounded-[24px] p-4" : "mt-3 rounded-[30px] p-5"} border text-center ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{category}</p><h1 className={`${approachPlay ? "mt-1 text-4xl" : "mt-2 text-5xl"} font-display`}>{current.title}</h1><p className={`${approachPlay ? "mt-1 text-[11px]" : "mt-2 text-xs"} text-slate-600`}>{current.detail}</p>{turnState === "you" && !approachPlay ? <div className="mt-4 rounded-2xl bg-blue-50 p-3"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Din tur</p><p className="mt-1 text-sm font-bold text-blue-900">Du spelar först</p></div> : null}{turnState === "bot-thinking" ? <div className={`${approachPlay ? "mt-2 p-3" : "mt-4 p-4"} rounded-2xl bg-emerald-50`}><div className="flex items-center justify-center gap-3"><span className="text-3xl">{bot.avatar}</span><div className="text-left"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">{bot.name} spelar…</p><div className="mt-2 flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-emerald-600" /></div></div></div></div> : null}{turnState === "reveal" && current.botValue != null ? <div className={`${approachPlay ? "mt-2 p-3" : "mt-4 p-4"} rounded-2xl bg-emerald-50`}><p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700">{bot.name}s resultat</p><p className="mt-1 font-display text-2xl text-emerald-800">{resultLabel(current)}</p><p className="mt-2 text-sm font-bold text-slate-800">{current.winner === "you" ? `${playerName} vinner hålet` : current.winner === "bot" ? `${bot.name} vinner hålet` : "Hålet delas"}</p></div> : null}</section>

          <section className={approachPlay ? "mt-2" : "mt-3"}>
            <p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ditt resultat</p>
            {category === "putting" ? (
              <div className="mt-2 grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((v) => <button key={v} disabled={turnState !== "you"} onClick={() => setYourValue(v)} className={`rounded-2xl border py-4 font-display text-2xl disabled:opacity-50 ${yourValue === v ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{v}</button>)}</div>
            ) : category === "around-the-green" ? (
              <div className="mt-3 grid grid-cols-3 gap-2.5">{CHIP_POINT_ZONES.map((zone) => <button key={zone.points} disabled={turnState !== "you"} onClick={() => setYourValue(zone.points)} className={`min-h-[64px] rounded-2xl border px-2 py-4 text-center font-display text-base leading-tight disabled:opacity-50 ${yourValue === zone.points ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{zone.label}</button>)}</div>
            ) : category === "approach" ? (
              <div className={`mt-2 rounded-[24px] border p-3.5 ${glass}`}>
                <div className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-2 text-white"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">Mål</span><span className="font-display text-2xl">{current.distance} m</span></div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Total längd</p>
                    <p className="mt-1 text-center font-display text-4xl text-slate-950">{approachDistance}<span className="ml-1 text-base text-slate-400">m</span></p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[-5, 5].map((delta) => <button key={delta} disabled={turnState !== "you"} onClick={() => adjustApproachDistance(delta)} className="min-h-11 rounded-xl border bg-white py-2.5 text-sm font-black disabled:opacity-40">{delta > 0 ? `+${delta}` : delta}</button>)}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[-1, 1].map((delta) => <button key={delta} disabled={turnState !== "you"} onClick={() => adjustApproachDistance(delta)} className="min-h-11 rounded-xl border bg-slate-50 py-2.5 text-sm font-black disabled:opacity-40">{delta > 0 ? `+${delta}` : delta}</button>)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Sidled</p>
                    <p className="mt-1 text-center font-display text-4xl text-slate-950">{approachLateral}<span className="ml-1 text-base text-slate-400">m</span></p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[-5, 5].map((delta) => <button key={delta} disabled={turnState !== "you"} onClick={() => adjustApproachLateral(delta)} className="min-h-11 rounded-xl border bg-white py-2.5 text-sm font-black disabled:opacity-40">{delta > 0 ? `+${delta}` : delta}</button>)}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[-1, 1].map((delta) => <button key={delta} disabled={turnState !== "you"} onClick={() => adjustApproachLateral(delta)} className="min-h-11 rounded-xl border bg-slate-50 py-2.5 text-sm font-black disabled:opacity-40">{delta > 0 ? `+${delta}` : delta}</button>)}
                    </div>
                    {approachLateral > 0 ? <div className="mt-2 grid grid-cols-2 gap-2">{(["left", "right"] as const).map((side) => <button key={side} disabled={turnState !== "you"} onClick={() => chooseApproachSide(side)} className={`min-h-10 rounded-xl border py-2 text-xs font-bold disabled:opacity-50 ${approachSide === side ? "border-blue-600 bg-blue-600 text-white" : "bg-white text-slate-700"}`}>{side === "left" ? "Vänster" : "Höger"}</button>)}</div> : <p className="mt-2 text-center text-[10px] text-slate-400">0 m = rakt</p>}
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] font-bold text-blue-950">{approachSummary}</p>
              </div>
            ) : (
              <div className={`mt-2 rounded-3xl border p-4 ${glass}`}><div className="grid grid-cols-2 gap-2"><button disabled={turnState !== "you"} onClick={() => setDriveHit(true)} className={`rounded-2xl border py-3 text-sm font-bold disabled:opacity-50 ${driveHit ? "border-blue-600 bg-blue-600 text-white" : "bg-white"}`}>Fairway</button><button disabled={turnState !== "you"} onClick={() => setDriveHit(false)} className={`rounded-2xl border py-3 text-sm font-bold disabled:opacity-50 ${!driveHit ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>Miss</button></div><p className="mt-4 text-center font-display text-4xl">{yourValue ?? 220}<span className="ml-1 text-xl text-slate-500">m</span></p><div className="mt-3 grid grid-cols-4 gap-2"><button disabled={turnState !== "you"} onClick={() => setYourValue(Math.max(0, (yourValue ?? 220) - 10))} className="rounded-xl border bg-white py-3 disabled:opacity-50">−10</button><button disabled={turnState !== "you"} onClick={() => setYourValue(Math.max(0, (yourValue ?? 220) - 1))} className="rounded-xl border bg-white py-3 disabled:opacity-50">−1</button><button disabled={turnState !== "you"} onClick={() => setYourValue((yourValue ?? 220) + 1)} className="rounded-xl border bg-white py-3 disabled:opacity-50">+1</button><button disabled={turnState !== "you"} onClick={() => setYourValue((yourValue ?? 220) + 10)} className="rounded-xl border bg-white py-3 disabled:opacity-50">+10</button></div></div>
            )}
            <button disabled={!canRegister || turnState !== "you"} onClick={register} className={`${approachPlay ? "mt-3 py-3.5 text-lg" : "mt-3 py-4 text-xl"} flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 font-display text-white disabled:opacity-35`}>{category === "approach" ? "Registrera slag" : "Spela mitt slag"} <ChevronRight className="h-5 w-5" /></button>
          </section>
        </>
      ) : null}

      {step === "sudden-death" ? (
        <>
          {showSuddenDeathIntro ? <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/95 backdrop-blur-md">
            <style>{`@keyframes sdBlueRush{0%{transform:translateX(-115%)}38%{transform:translateX(5%)}52%{transform:translateX(-2%)}64%{transform:translateX(2%)}100%{transform:translateX(0)}}@keyframes sdRedRush{0%{transform:translateX(115%)}38%{transform:translateX(-5%)}52%{transform:translateX(2%)}64%{transform:translateX(-2%)}100%{transform:translateX(0)}}@keyframes sdClash{0%,34%{opacity:0;transform:scale(.2) rotate(0deg)}45%{opacity:1;transform:scale(1.5) rotate(25deg)}62%{opacity:.95;transform:scale(.9) rotate(-15deg)}100%{opacity:.35;transform:scale(1.2) rotate(15deg)}}@keyframes sdTitle{0%,54%{opacity:0;transform:scale(.82) translateY(12px)}72%{opacity:1;transform:scale(1.06) translateY(0)}100%{opacity:1;transform:scale(1)}}@keyframes sdSparkL{0%,38%{opacity:0;transform:translate(0,0) scale(.4)}50%{opacity:1}100%{opacity:0;transform:translate(-42px,-34px) scale(1.25)}}@keyframes sdSparkR{0%,38%{opacity:0;transform:translate(0,0) scale(.4)}50%{opacity:1}100%{opacity:0;transform:translate(42px,34px) scale(1.25)}}`}</style>
            <div className="absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500/80" style={{animation:'sdBlueRush 1.35s cubic-bezier(.22,.8,.28,1) both',clipPath:'polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)'}} />
            <div className="absolute inset-y-0 right-0 w-[56%] bg-gradient-to-l from-red-700 via-red-600 to-red-500/80" style={{animation:'sdRedRush 1.35s cubic-bezier(.22,.8,.28,1) both',clipPath:'polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)'}} />
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-amber-200" style={{animation:'sdClash 1.8s ease-out both'}}>
          <span className="block text-7xl drop-shadow-[0_0_22px_rgba(253,224,71,.9)]">✦</span>
          <span className="absolute -left-2 top-4 text-xl" style={{animation:'sdSparkL 1.5s .15s ease-out both'}}>✦</span>
          <span className="absolute -right-2 bottom-2 text-lg" style={{animation:'sdSparkR 1.5s .12s ease-out both'}}>✦</span>
          <span className="absolute left-3 -top-2 text-sm" style={{animation:'sdSparkR 1.35s .2s ease-out both'}}>✦</span>
          <span className="absolute right-2 top-0 text-base" style={{animation:'sdSparkL 1.4s .18s ease-out both'}}>✦</span>
        </div>
            <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center" style={{animation:'sdTitle 2.15s ease-out both'}}>
          <div className="rounded-[32px] border border-white/20 bg-slate-950/50 px-7 py-6 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-white/70">AVGÖRANDE</p>
            <h1 className="mt-2 font-display text-6xl leading-none text-white">SUDDEN<br/>DEATH</h1>
            <p className="mt-4 text-sm font-black text-white">Närmast hålet vinner matchen</p>
          </div>
            </div>
          </div> : null}
          <section className="pt-3 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-100"><Target className="h-6 w-6 text-red-600" /></div><p className="mt-4 text-[10px] font-black uppercase tracking-[0.32em] text-red-600">Sudden death</p><h1 className="mt-1 font-display text-5xl leading-none">11 meter</h1><p className="mt-3 text-sm font-semibold text-slate-700">Du slår först · {bot.name} svarar efteråt</p><div className="mx-auto mt-3 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Avgörande {suddenDeathRound}</div></section>
          <section className={`mt-6 rounded-[28px] border p-5 shadow-xl shadow-slate-200/50 ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Ditt slag</p><p className="mt-1 text-sm text-slate-600">Registrera hur nära hålet du kom. Resultatet används bara för att avgöra matchen.</p><button disabled={sdBusy} onClick={() => void playSuddenDeath(null)} className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 font-black text-white disabled:opacity-40">Sänkt</button><div className="mt-2 grid grid-cols-4 gap-2">{[0.5, 1, 1.5, 2, 3, 5, 8, 11].map((v) => <button disabled={sdBusy} key={v} onClick={() => void playSuddenDeath(v)} className="rounded-xl border border-slate-200 bg-white/90 py-3 text-xs font-bold disabled:opacity-40">{v} m</button>)}</div></section>
          {sdBotText ? <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-center text-sm font-bold text-white">{sdBotText}</div> : null}
          <div className="mt-4 flex items-start gap-2"><span className="text-3xl">{bot.avatar}</span><div className={`rounded-2xl border p-3 text-sm ${glass}`}>“{sdBusy ? "Nu gäller det." : botComment}”</div></div>
                  </>
      ) : null}

      {winnerCelebration ? <div className={`fixed inset-0 z-[70] overflow-hidden ${winnerCelebration === "you" ? "bg-[#061d57]" : "bg-[#5f1018]"}`}>
        <style>{`@keyframes botWinIn{0%{opacity:0;transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}@keyframes botWinCard{0%{opacity:0;transform:translateY(24px) scale(.92)}55%{opacity:1;transform:translateY(-3px) scale(1.03)}100%{opacity:1;transform:none}}@keyframes botWinShard{0%{opacity:0;transform:translateY(-14vh) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate3d(var(--bx),112vh,0) rotate(var(--br))}}`}</style>
        <div className={`absolute inset-0 ${winnerCelebration === "you" ? "bg-[radial-gradient(circle_at_50%_38%,rgba(147,197,253,.46),transparent_34%),linear-gradient(145deg,#2563eb,#071b4f)]" : "bg-[radial-gradient(circle_at_50%_38%,rgba(254,202,202,.42),transparent_34%),linear-gradient(215deg,#ef4444,#591019)]"}`} style={{animation:'botWinIn 620ms ease-out both'}} />
        {Array.from({length:26}).map((_,i)=><span key={i} className="absolute top-[-8%] h-3 w-1 rounded-full bg-white/85" style={{left:`${4+(i*17)%92}%`,['--bx' as any]:`${(i%2?1:-1)*(16+(i%5)*10)}px`,['--br' as any]:`${180+(i%7)*60}deg`,animation:`botWinShard ${1.45+(i%5)*.13}s ${(i%9)*.06}s ease-out both`}} />)}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center text-white"><div className="relative overflow-hidden rounded-[40px] border border-white/25 bg-white/[.11] px-8 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,.38),0_36px_110px_rgba(0,0,0,.35)] backdrop-blur-3xl" style={{animation:'botWinCard 820ms 180ms cubic-bezier(.2,.8,.2,1) both'}}><span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"/><p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/65">MATCH AVGJORD</p><p className="mt-4 font-display text-6xl leading-none">{winnerCelebration === "you" ? playerName : bot.name}</p><div className="mx-auto mt-5 h-px w-20 bg-white/45"/><p className="mt-5 font-display text-4xl">VINNER</p></div></div>
      </div> : null}

      {step === "result" ? (
        <>
          <section className={`mt-6 rounded-[30px] border p-5 text-center ${glass}`}><span className="text-5xl">{bot.avatar}</span><Trophy className="mx-auto mt-3 h-6 w-6 text-amber-500" /><p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Slutresultat</p><h1 className="mt-2 font-display text-5xl">{suddenDeathWinner ? "SD" : `${score.you}–${score.bot}`}</h1><p className="mt-2 text-sm font-bold">{suddenDeathWinner === "you" ? `${playerName} vinner i sudden death` : suddenDeathWinner === "bot" ? `${bot.name} vinner i sudden death` : score.you > score.bot ? `${playerName} vinner över ${bot.name}` : score.bot > score.you ? `${bot.name} vinner` : "Matchen slutar delad"}</p>{suddenDeathWinner ? <p className="mt-1 text-xs font-semibold text-red-600">11 m · 1 slag · närmast flaggan</p> : null}<p className="mt-1 text-xs text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><p className="mt-1 text-xs text-slate-500">{score.tie ? `${score.tie} delade hål` : `${length} hål spelade`}</p></section>
          {resultRecommendation ? <a href={resultRecommendation.href} onClick={() => recordRecommendationOpen(resultRecommendation.id)} className={`mt-5 flex items-center gap-4 rounded-[26px] border p-4 text-left ${glass}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Target className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Nästa</span><span className="mt-1 block font-display text-2xl">{resultRecommendation.title}</span><span className="mt-1 block text-xs text-slate-600">{resultRecommendation.detail}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-slate-500" /></a> : null}<div className="mt-5 space-y-3"><button onClick={() => { recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button><button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link></div>
        </>
      ) : null}
    </main>
  );
}
