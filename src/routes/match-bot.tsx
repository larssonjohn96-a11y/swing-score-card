import { CourseGamePage } from "@/components/course-game-page";
import { MatchCourseChoice } from "@/components/match-course-choice";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Flag, Lock, RotateCcw, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ActivityReview } from "@/components/activity-review";
import { shortGameReviewInput, rawActivityOutcomes } from "@/lib/activity-review";
import { PuttingMatchReview } from "@/components/putting-match-review";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  PUTTING_MATCH_FORMATS,
  PUTTING_MATCH_RULES,
  formatPuttingDistance,
  generatePuttingMatchDistances,
} from "@/lib/putting-match";
import { CHIP_POINT_ZONES, generateChipMatchDistances } from "@/lib/chip-match";
import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, type EngineSkill } from "@/lib/sg4-engine";
import { getPlayRecommendations } from "@/lib/sg4-surface-recommendations";
import { recordRecommendationCompletion, recordRecommendationImpressions, recordRecommendationOpen, recordRecommendationSignal } from "@/lib/sg4-recommender";
import { simulateChipBotResult, simulateDriveBotResult, simulatePuttingBotStrokes, type BotCategoryHandicaps } from "@/lib/bot-skill-model";
import { archetypeLabels, effectiveCategoryHcp, type BotArchetype } from "@/lib/bot-archetypes";
import { getPlayerPressureNotice } from "@/lib/bot-match-pressure";
import { getActiveCupMatch, recordActiveCupResult } from "@/lib/cup-engine";
import { chooseBotNextStep } from "@/lib/bot-next-step";
import { recordBotCategoryMatch } from "@/lib/bot-match-history";
import { getSmartBotResultReaction } from "@/lib/bot-smart-result";
import { BOT_PERSONALITIES, getBotRelationship, personalityLine, recordBotMatch, relationshipLine } from "@/lib/bot-personality";
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

type Step = "course" | "bot" | "category" | "setup" | "length" | "play" | "sudden-death" | "result";
type Category = "off-the-tee" | "approach" | "around-the-green" | "bunker" | "putting";
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
  tier: "Nybörjare" | "Klubbspelare" | "Medel" | "Avancerad" | "Elit" | "PRO" | "Tour" | "Final Boss";
  avatar: string;
  intro: string;
  categoryHcp: BotCategoryHandicaps;
  archetype: BotArchetype;
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
  botResultText?: string;
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

function makeBot({
  id, name, hcp, gender, role, tier, avatar, intro, label, playStyle = "balanced", temperament = "calm", communication = "focused", aggression = 0.5, consistency = 0.65, clutch = 0.6, traits = [], locked = false,
}: {
  id: string; name: string; hcp: number; gender: "Kvinna" | "Man"; role: string; tier: BotProfile["tier"]; avatar: string; intro: string; label: string;
  playStyle?: BotArchetype["playStyle"]; temperament?: BotArchetype["temperament"]; communication?: BotArchetype["communication"]; aggression?: number; consistency?: number; clutch?: number; traits?: string[]; locked?: boolean;
}): BotProfile {
  const base = hcp;
  return {
    id, name, hcp, gender, role, tier, avatar, intro,
    categoryHcp: { putting: base - 1, chipping: base, approach: base + 1, driving: base + 2 },
    archetype: { label, playStyle, temperament, communication, aggression, consistency, clutch, traits },
    locked,
    unlockText: locked ? "Vinn matcher för att låsa upp" : undefined,
    chat: genericChat,
  };
}

const BOTS: BotProfile[] = [
  makeBot({ id: "erik", name: "Erik", hcp: 52, gender: "Man", role: "Förstagångsgolfare", tier: "Nybörjare", avatar: "🧑🏼", intro: "Nytt är kul. Varje bra slag firas.", label: "Rookien", temperament: "streaky", communication: "social", consistency: .20, clutch: .25, traits: ["Ojämn", "Entusiastisk"] }),
  makeBot({ id: "sara", name: "Sara", hcp: 48, gender: "Kvinna", role: "Nybörjare", tier: "Nybörjare", avatar: "👩🏻", intro: "Lugn golf och stora leenden.", label: "Glädjespelaren", communication: "warm", consistency: .26, traits: ["Lugn", "Positiv"] }),
  makeBot({ id: "ali", name: "Ali", hcp: 42, gender: "Man", role: "Nybörjare", tier: "Nybörjare", avatar: "🧑🏽", intro: "Har fart men inte alltid riktning.", label: "Power-rookien", playStyle: "aggressive", aggression: .7, consistency: .28, traits: ["Lång", "Vild"] }),
  makeBot({ id: "margaret", name: "Margaret", hcp: 33, gender: "Kvinna", role: "Grandma golfer", tier: "Nybörjare", avatar: "👵🏻", intro: "Varm, erfaren och lite för nöjd när gamla knep fungerar.", label: "Klubbmormorn", playStyle: "conservative", communication: "warm", consistency: .55, clutch: .64, traits: ["Kortspel", "Tålamod"] }),

  makeBot({ id: "lisa", name: "Lisa", hcp: 32, gender: "Kvinna", role: "Klubbspelare", tier: "Klubbspelare", avatar: "👩🏻", intro: "Spelar enkelt och håller bollen i spel.", label: "Fairway-först", playStyle: "conservative", consistency: .48, traits: ["Rak", "Trygg"] }),
  makeBot({ id: "johan", name: "Johan", hcp: 26, gender: "Man", role: "Klubbspelare", tier: "Klubbspelare", avatar: "🧔🏼", intro: "Stabil klubbspelare utan stora utsvävningar.", label: "Klubbmotorn", consistency: .53, traits: ["Stabil", "Jämn"] }),
  makeBot({ id: "zach", name: "Zach", hcp: 22, gender: "Man", role: "Weekend golfer", tier: "Klubbspelare", avatar: "🧔🏻", intro: "Jag gillar att slå långt. Precisionen får vi se hur det går med.", label: "Bombaren", playStyle: "aggressive", temperament: "competitive", communication: "cocky", aggression: .88, consistency: .34, clutch: .47, traits: ["Lång från tee"] }),
  makeBot({ id: "peter", name: "Peter", hcp: 18, gender: "Man", role: "Klubbspelare", tier: "Klubbspelare", avatar: "🧢", intro: "Gillar ordning, tempo och fairways.", label: "Poängplockaren", playStyle: "conservative", consistency: .60, traits: ["Fairways", "Bogeyfri"] }),

  makeBot({ id: "anna", name: "Anna", hcp: 17, gender: "Kvinna", role: "Medelhandicap", tier: "Medel", avatar: "👩🏻", intro: "Jag ger sällan bort ett hål.", label: "Klubbmaskinen", playStyle: "conservative", consistency: .70, clutch: .61, traits: ["Ger bort få hål"] }),
  makeBot({ id: "marcus", name: "Marcus", hcp: 15, gender: "Man", role: "Tävlingsspelare", tier: "Medel", avatar: "👨🏽", intro: "Går gärna rakt på flaggan.", label: "Pin huntern", playStyle: "aggressive", temperament: "competitive", aggression: .82, consistency: .58, traits: ["Aggressiv", "Flaggjägare"] }),
  makeBot({ id: "elin", name: "Elin", hcp: 13, gender: "Kvinna", role: "Klubbspelare", tier: "Medel", avatar: "👱🏻‍♀️", intro: "Kontrollerad fart och bra känsla.", label: "Tempospelaren", consistency: .67, traits: ["Tempo", "Kontroll"] }),
  makeBot({ id: "oskar", name: "Oskar", hcp: 12, gender: "Man", role: "Tävlingsgolfare", tier: "Medel", avatar: "🧑🏻", intro: "Börjar se scorer under 80 allt oftare.", label: "Scorern", temperament: "competitive", consistency: .69, clutch: .66, traits: ["Scoring", "Press"] }),

  makeBot({ id: "emma", name: "Emma", hcp: 9, gender: "Kvinna", role: "Singelhandicap", tier: "Avancerad", avatar: "👩🏼‍🦱", intro: "Fairways, greener och tålamod. Jag gör inte många stora misstag.", label: "Fairway-maskinen", playStyle: "conservative", temperament: "calm", aggression: .28, consistency: .84, clutch: .72, traits: ["Spelar rakt", "Trygg puttare", "Jämn"] }),
  makeBot({ id: "david", name: "David", hcp: 6, gender: "Man", role: "Singelhandicap", tier: "Avancerad", avatar: "🧑🏽", intro: "Aggressiv när läget finns.", label: "Shotmakern", playStyle: "aggressive", aggression: .73, consistency: .79, clutch: .78, traits: ["Attack", "Shape"] }),
  makeBot({ id: "nora", name: "Nora", hcp: 5, gender: "Kvinna", role: "Tävlingsgolfare", tier: "Avancerad", avatar: "👱🏻‍♀️", intro: "Tar smarta beslut och missar på rätt sida.", label: "Strategen", playStyle: "conservative", consistency: .83, clutch: .80, traits: ["Smart", "Konsekvent"] }),
  makeBot({ id: "ryan", name: "Ryan", hcp: 3, gender: "Man", role: "College player", tier: "Avancerad", avatar: "🧑🏽", intro: "Collegegolf. Jag kommer att pressa dig från första slaget.", label: "College grindern", playStyle: "aggressive", temperament: "competitive", aggression: .72, consistency: .86, clutch: .86, traits: ["Press", "Tempo"], locked: true }),

  makeBot({ id: "stella", name: "Stella", hcp: 2, gender: "Kvinna", role: "Elitamatör", tier: "Elit", avatar: "👱🏻‍♀️", intro: "Stabil elitgolf med få misstag.", label: "Elitmaskinen", consistency: .89, clutch: .86, traits: ["Precision", "Stabil"] }),
  makeBot({ id: "viktor", name: "Viktor", hcp: 1, gender: "Man", role: "Elitamatör", tier: "Elit", avatar: "🧑🏻", intro: "Pars känns som missade chanser.", label: "Birdiejägaren", playStyle: "aggressive", aggression: .78, consistency: .90, clutch: .88, traits: ["Birdies", "Attack"] }),
  makeBot({ id: "alma", name: "Alma", hcp: 0, gender: "Kvinna", role: "Scratch", tier: "Elit", avatar: "👩🏻", intro: "Scratch. Inga gratis slag.", label: "Scratch-taktikern", temperament: "ice-cold", consistency: .92, clutch: .92, traits: ["Scratch", "Kall"] }),
  makeBot({ id: "noah", name: "Noah", hcp: -2, gender: "Man", role: "College standout", tier: "Elit", avatar: "🧑🏼‍🦰", intro: "Jag spelar för att vinna. Pars räcker inte alltid.", label: "College-killern", playStyle: "aggressive", temperament: "ice-cold", aggression: .80, consistency: .93, clutch: .94, traits: ["Attack", "Clutch"], locked: true }),

  makeBot({ id: "linn", name: "Linn", hcp: -2, gender: "Kvinna", role: "Pro", tier: "PRO", avatar: "👩🏻", intro: "Professionell rytm och väldigt få stora missar.", label: "Pro precision", consistency: .94, clutch: .93, traits: ["Precision", "Tempo"] }),
  makeBot({ id: "axel", name: "Axel", hcp: -3, gender: "Man", role: "Pro", tier: "PRO", avatar: "🧑🏻", intro: "Spelar aggressivt när siffrorna säger ja.", label: "Data-proffset", playStyle: "aggressive", consistency: .95, clutch: .94, traits: ["Data", "Attack"] }),
  makeBot({ id: "maya", name: "Maya", hcp: -4, gender: "Kvinna", role: "Pro", tier: "PRO", avatar: "👩🏾", intro: "Nästan inga gratis slag.", label: "Pro taktiker", temperament: "ice-cold", consistency: .96, clutch: .96, traits: ["Komplett", "Kall"], locked: true }),
  makeBot({ id: "sofia", name: "Sofia", hcp: -5, gender: "Kvinna", role: "Tour prospect", tier: "PRO", avatar: "👩🏻‍🦰", intro: "Små marginaler. Ett svagt slag och jag tar hålet.", label: "Tour prospect", temperament: "ice-cold", consistency: .97, clutch: .97, traits: ["Små marginaler"], locked: true }),

  makeBot({ id: "julia", name: "Julia", hcp: -6, gender: "Kvinna", role: "Tour player", tier: "Tour", avatar: "👩🏼", intro: "Tourtempo från första slaget.", label: "Tour scorer", temperament: "ice-cold", consistency: .975, clutch: .97, traits: ["Tour", "Scoring"] }),
  makeBot({ id: "henrik", name: "Henrik", hcp: -8, gender: "Man", role: "Tour player", tier: "Tour", avatar: "🧔🏻", intro: "Varje miss är liten och varje birdiechans räknas.", label: "Tour grindern", consistency: .98, clutch: .98, traits: ["Birdies", "Grind"] }),
  makeBot({ id: "isabelle", name: "Isabelle", hcp: -10, gender: "Kvinna", role: "Tour star", tier: "Tour", avatar: "👩🏼‍🦱", intro: "Världsklass över hela spelet.", label: "Tourstjärnan", temperament: "ice-cold", consistency: .99, clutch: .99, traits: ["Världsklass", "Clutch"], locked: true }),
  makeBot({ id: "alex", name: "Alex", hcp: -12, gender: "Man", role: "Tour elite", tier: "Tour", avatar: "😎", intro: "Du behöver spela nära ditt tak för att slå mig.", label: "Tour elite", temperament: "ice-cold", consistency: .995, clutch: .995, traits: ["Komplett", "Obeveklig"], locked: true }),

  {
    ...makeBot({ id: "mer-birdie-man", name: "Mer Birdie Man", hcp: -18, gender: "Man", role: "Final Boss", tier: "Final Boss", avatar: "😎", intro: "Gör birdie på varje hål.", label: "Final Boss", playStyle: "aggressive", temperament: "ice-cold", communication: "cocky", aggression: 1, consistency: 1, clutch: 1, traits: ["Birdie varje hål", "Legendisk precision", "Alltid hotande"], locked: true }),
    categoryHcp: { putting: -18, chipping: -18, approach: -18, driving: -18 },
  },
];

const BOT_TIER_META: { tier: BotProfile["tier"]; range: string }[] = [
  { tier: "Nybörjare", range: "HCP 52–33" },
  { tier: "Klubbspelare", range: "HCP 32–18" },
  { tier: "Medel", range: "HCP 17–12" },
  { tier: "Avancerad", range: "HCP 11–3" },
  { tier: "Elit", range: "HCP 2–+2" },
  { tier: "PRO", range: "HCP +2–+5" },
  { tier: "Tour", range: "HCP +6–+12" },
  { tier: "Final Boss", range: "HCP +18" },
];

const CATEGORIES = [
  { id: "off-the-tee", title: "Utslag", sub: "Driver · fairway" },
  { id: "approach", title: "Inspel", sub: "Järn & wedge · närmast flaggan" },
  { id: "around-the-green", title: "Chippning", sub: "Chipping" },
  { id: "bunker", title: "Bunker", sub: "Bunkerslag" },
  { id: "putting", title: "Puttning", sub: "Putting" },
] as const;

const BOT_BUNKER_POINT_ZONES = [
  { points: 5, label: "Sänkt" },
  { points: 4, label: "Inom 1 m" },
  { points: 3, label: "Inom 2 m" },
  { points: 2, label: "Inom 3 m" },
  { points: 1, label: "På green · utanför 3 m" },
  { points: 0, label: "Missad green" },
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

function puttingBotStrokes(distance: number, bot: BotProfile, lateMatch = false) {
  const hcp = effectiveCategoryHcp(bot.categoryHcp.putting, bot.archetype, lateMatch);
  return simulatePuttingBotStrokes(distance, hcp, Math.random, bot.archetype);
}

function drivingBotScore(bot: BotProfile, lateMatch = false) {
  const hcp = effectiveCategoryHcp(bot.categoryHcp.driving, bot.archetype, lateMatch);
  return simulateDriveBotResult(hcp, Math.random, bot.archetype);
}

function BotMatchPage() {
  const [courseSelected, setCourseSelected] = useState(false);
  useHideBottomNav(true);
  const { displayName } = useAuth();
  const [cupContext] = useState(() => getActiveCupMatch());
  const [cupRecorded, setCupRecorded] = useState(false);
  const [step, setStep] = useState<Step>(() => cupContext ? "length" : "bot");
  const [botId, setBotId] = useState(() => cupContext?.botId ?? "emma");
  const [category, setCategory] = useState<Category | null>(() => cupContext?.category ?? null);
  const [length, setLength] = useState<MatchLength>(() => cupContext?.matchLength ?? 5);
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

  useEffect(() => {
    if (cupContext) return;
    const currentState = window.history.state ?? {};
    if (currentState.sg4BotMatchStep === step) return;
    const nextState = { ...currentState, sg4BotMatchStep: step };
    if (step === "bot") window.history.replaceState(nextState, "", window.location.href);
    else window.history.pushState(nextState, "", window.location.href);
  }, [step, cupContext]);

  useEffect(() => {
    if (cupContext) return;
    const onPopState = (event: PopStateEvent) => {
      const target = event.state?.sg4BotMatchStep as Step | undefined;
      if (target) setStep(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [cupContext]);

  const selectedBot = BOTS.find((item) => item.id === botId);
  const bot = selectedBot && !selectedBot.locked ? selectedBot : BOTS.find((item) => !item.locked) ?? BOTS[0];
  const [botComment, setBotComment] = useState(() => { const initial = selectedBot && !selectedBot.locked ? selectedBot : BOTS[3]; return personalityLine(initial.id, "start") ?? randomLine(initial.chat.start); });

  useEffect(() => {
    if (!cupContext) return;
    buildHoles();
    // Cup format is fixed by the tournament: no category or length selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const selectedCategory = CATEGORIES.find((item) => item.id === category);
  const playedHoles = score.you + score.bot + score.tie;
  const matchDiff = score.you - score.bot;
  const holesRemaining = Math.max(0, length - playedHoles);
  const liveLeader: "blue" | "red" | null = matchDiff > 0 ? "blue" : matchDiff < 0 ? "red" : null;
  const topScoreText = matchDiff === 0 ? "AS" : `${Math.abs(matchDiff)} UP`;
  const pressureNotice = getPlayerPressureNotice(matchDiff, holesRemaining, bot.name);
  const resultLeader: "blue" | "red" | null = suddenDeathWinner === "you" ? "blue" : suddenDeathWinner === "bot" ? "red" : liveLeader;
  const resultRecommendation = getPlayRecommendations(1, ["play-bot"])[0];
  const resultOutcome: "player" | "bot" = suddenDeathWinner === "you" ? "player" : suddenDeathWinner === "bot" ? "bot" : score.you > score.bot ? "player" : "bot";
  const resultMargin = suddenDeathWinner ? 1 : Math.max(1, Math.abs(score.you - score.bot));
  const resultNextStep = category ? chooseBotNextStep({
    currentBotId: bot.id,
    currentBotHcp: bot.hcp,
    category,
    outcome: resultOutcome,
    margin: resultMargin,
    candidates: BOTS.map((item) => ({ id: item.id, hcp: item.hcp, locked: item.locked })),
  }) : { action: "rematch" as const, rematchScore: 1, challengeScore: 0 };
  const resultChallengeBot = resultNextStep.targetBotId ? BOTS.find((item) => item.id === resultNextStep.targetBotId) : undefined;
  const resultReactionLine = category ? getSmartBotResultReaction({
    botId: bot.id,
    botName: bot.name,
    outcome: resultOutcome,
    category,
    nextStep: resultNextStep,
    targetBotName: resultChallengeBot?.name,
  }) : (resultOutcome === "player" ? "Bra spelat. En till?" : "Bra match. Revansch?");
  useEffect(() => {
    if (step !== "result") return;
    recordRecommendationCompletion("play-bot");
    if (resultRecommendation) recordRecommendationImpressions([resultRecommendation.id]);
    if (cupContext && !cupRecorded) {
      recordActiveCupResult(bot.id, resultOutcome);
      setCupRecorded(true);
    }
  }, [step, resultRecommendation?.id, cupContext, cupRecorded, bot.id, resultOutcome]);
  const glass = "border-slate-300/80 bg-white/78 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/60 bg-gradient-to-br from-blue-100/58 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const redGlass = "border-red-300/60 bg-gradient-to-br from-red-100/58 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const selected = "border-blue-500 bg-blue-50/95 ring-2 ring-blue-500/25";
  const ryderNext = "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[20px] border border-blue-300/55 bg-[linear-gradient(180deg,rgba(96,165,250,.78)_0%,rgba(37,99,235,.88)_42%,rgba(29,78,216,.90)_100%)] py-4 font-display text-xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,.58),inset_0_-1px_0_rgba(30,64,175,.35),0_14px_32px_-20px_rgba(37,99,235,.72)] backdrop-blur-2xl transition duration-200 active:scale-[.985] active:brightness-[.97] disabled:opacity-30";

  function goToStep(next: Step) {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => { finished: Promise<void> } };
    if (doc.startViewTransition) { doc.startViewTransition(() => setStep(next)); return; }
    setStep(next);
  }

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
    setBotComment(personalityLine(item.id, "start") ?? randomLine(item.chat.start));
  }

  function buildHoles() {
    if (!category || bot.locked) return;
    const puttingDistances = category === "putting" ? generatePuttingMatchDistances(length, holes.flatMap(h => h.distance === undefined ? [] : [h.distance])) : [];
    const chipDistances = category === "around-the-green" ? generateChipMatchDistances(length, holes.flatMap(h => h.distance === undefined ? [] : [h.distance])) : [];
    const approachDistances = category === "approach" ? generateApproachMatchDistances(length) : [];
    const next: Hole[] = Array.from({ length }, (_unused, holeNr) => {
      if (category === "putting") {
        const d = puttingDistances[holeNr] ?? 3;
        return { title: formatPuttingDistance(d), distance: d, detail: "Samma position för båda · färre puttar vinner hålet" };
      }
      if (category === "bunker") {
        return { title: `Bunkerslag ${holeNr + 1}`, detail: "Närmast flaggan vinner." };
      }
      if (category === "around-the-green") {
        const d = chipDistances[holeNr] ?? 15;
        return { title: `${d} m`, distance: d, detail: "Närmast flaggan vinner." };
      }
      if (category === "approach") {
        const d = approachDistances[holeNr] ?? 120;
        return { title: `${d} m`, distance: d, detail: "Justera faktisk längd från målavståndet · 0 m sidled = rakt" };
      }
      return { title: "Utslag", detail: "Samma fairway och samma slag för båda spelarna" };
    });
    setBotComment(personalityLine(bot.id, "start") ?? randomLine(bot.chat.start));
    setHoles(next);
    setHoleIndex(0);
    resetShotInput(category === "approach" ? next[0]?.distance ?? 0 : 0);
    setTurnState("you");
    setSuddenDeathRound(1); setSdBotText(""); setSdBusy(false); setSuddenDeathWinner(null);
    setStep("play");
  }

  function simulateBot(hole: Hole) {
    const lateMatch = holesRemaining <= 2;
    if (!category) return { value: 0, hit: true, approachResult: undefined as ApproachResult | undefined };
    if (category === "putting") return { value: puttingBotStrokes(hole.distance ?? 3, bot, lateMatch), hit: true, approachResult: undefined };
    if (category === "around-the-green" || category === "bunker") {
      const chipHcp = effectiveCategoryHcp(bot.categoryHcp.chipping, bot.archetype, lateMatch);
      const chip = simulateChipBotResult(hole.distance ?? 15, chipHcp, Math.random, bot.archetype);
      return { value: chip.points, hit: true, approachResult: undefined, resultText: chip.description };
    }
    if (category === "approach") {
      const approachHcp = effectiveCategoryHcp(bot.categoryHcp.approach, bot.archetype, lateMatch);
      const approachResult = simulateApproachResult(approachHcp, 0, hole.distance ?? 120);
      return { value: approachProximity(approachResult, hole.distance ?? 120), hit: true, approachResult, resultText: undefined };
    }
    const result = drivingBotScore(bot, lateMatch);
    return { value: result.carry, hit: result.hit, approachResult: undefined, resultText: result.strike === "top" ? `Toppad · ${result.carry} m` : result.strike === "wild" ? `Grov miss · ${result.carry} m` : undefined };
  }

  function decideWinner(userValue: number, userHit: boolean, botValue: number, botHit: boolean): Winner {
    if (category === "around-the-green" || category === "bunker") return userValue > botValue ? "you" : userValue < botValue ? "bot" : "tie";
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
      : category === "around-the-green" || category === "bunker"
        ? chipPerformanceFromPoints(lockedYourValue)
        : null;
    if (engineSkill && enginePerformance !== null) {
      recordEngineOutcome({
        skill: engineSkill,
        distance: current.distance,
        performance: enginePerformance,
        context: "game",
        activityId: engineSkill === "putting" ? "putting-match" : "chip-match",
      });
    }
    setHoles((prev) => prev.map((h, i) => {
      if (i === holeIndex) return { ...h, yourValue: lockedYourValue, yourHit: lockedDriveHit, yourApproach: lockedApproach };
      return h;
    }));

    setTurnState("bot-thinking");
    await sleep(rand(2000, 3000));
    const simulated = simulateBot(current);
    const winner = decideWinner(lockedYourValue, lockedDriveHit, simulated.value, simulated.hit);

    setHoles((prev) => prev.map((h, i) =>
      i === holeIndex
        ? { ...h, botValue: simulated.value, botHit: simulated.hit, botApproach: simulated.approachResult, botResultText: simulated.resultText, winner }
        : h,
    ));

    const isPressure = Boolean(pressureNotice);
    const event: BotEvent = isPressure ? "pressure" : winner === "bot" ? "bot-win" : winner === "you" ? "player-win" : "tie";
    const playerBad = (category === "putting" && lockedYourValue >= 3) || ((category === "around-the-green" || category === "bunker") && lockedYourValue <= 1) || (category === "off-the-tee" && !lockedDriveHit);
    const botBad = (category === "putting" && simulated.value >= 3) || ((category === "around-the-green" || category === "bunker") && simulated.value <= 1) || (category === "off-the-tee" && !simulated.hit);
    const personalityEvent = isPressure ? "pressure" : playerBad ? "player-bad" : botBad ? "bot-bad" : event;
    setBotComment(personalityLine(bot.id, personalityEvent) ?? randomLine(bot.chat[event]));
    setTurnState("reveal");
    await sleep(1400);
    setTurnState("you");
    if (holeIndex >= holes.length - 1) {
      resetShotInput();
      const finalYou = score.you + (winner === "you" ? 1 : 0);
      const finalBot = score.bot + (winner === "bot" ? 1 : 0);
      if (finalYou === finalBot) { setSuddenDeathRound(1); setSdBotText(""); setStep("sudden-death"); }
      else { const matchWinner = finalYou > finalBot ? "you" : "bot"; recordBotMatch(bot.id, matchWinner === "you" ? "player" : "bot"); if (category) recordBotCategoryMatch(bot.id, category, matchWinner === "you" ? "player" : "bot", Math.abs(finalYou - finalBot)); setWinnerCelebration(matchWinner); await sleep(2300); setWinnerCelebration(null); setStep("result"); }
    } else {
      const nextIndex = holeIndex + 1;
      resetShotInput(category === "approach" ? holes[nextIndex]?.distance ?? 0 : 0);
      setHoleIndex(nextIndex);
    }
  }

  function simulateSuddenDeathBot() {
    const skillHcp = bot.categoryHcp.putting;
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
    recordBotMatch(bot.id, youWin ? "player" : "bot");
    if (category) recordBotCategoryMatch(bot.id, category, youWin ? "player" : "bot", 1);
    setWinnerCelebration(youWin ? "you" : "bot");
    await sleep(2300);
    setWinnerCelebration(null); setStep("result"); setSdBusy(false);
  }

  function back() {
    if (cupContext) { window.location.assign("/cup"); return; }
    if (step === "bot") return;
    window.history.back();
  }

  const label = step === "bot" ? "Motståndare" : step === "category" ? "Kategori" : step === "setup" ? "Setup" : category === "putting" || category === "approach" ? "Format" : "Matchlängd";
  const sideResultLabel = (hole: Hole, side: "you" | "bot") => {
    if (!category) return "–";
    const value = side === "you" ? hole.yourValue : hole.botValue;
    const hit = side === "you" ? hole.yourHit : hole.botHit;
    const approach = side === "you" ? hole.yourApproach : hole.botApproach;
    if (category === "around-the-green" || category === "bunker") {
      if (side === "bot" && hole.botResultText && category === "around-the-green") return hole.botResultText;
      const zones = category === "bunker" ? BOT_BUNKER_POINT_ZONES : CHIP_POINT_ZONES;
      return typeof value === "number" ? zones.find((zone) => zone.points === value)?.label ?? "–" : "–";
    }
    if (category === "approach") return approach ? formatApproachResult(approach) : "–";
    if (category === "putting") return typeof value === "number" ? `${value}` : "–";
    if (typeof value !== "number") return "–";
    return `${value}m${hit ? " ✓" : " ×"}`;
  };
  const resultLabel = (hole: Hole) => sideResultLabel(hole, "bot");

  const approachSummary =
    approachDistance > 0
      ? formatApproachResult({
          actualDistance: approachDistance,
          lateral: approachLateral,
          side: approachLateral === 0 ? "center" : approachSide,
        })
      : "Ställ in slaglängden";

  const approachPlay = step === "play" && category === "approach";

  if (step === "course") return <CourseGamePage
    initialOpponent={{ mode: "bot", name: bot.name, botLevel: bot.hcp >= 25 ? 0 : bot.hcp >= 10 ? 1 : 2 }}
    onBack={() => goToStep("category")} />;

  return (
    <main style={LIGHT_SURFACE} className={`mx-auto min-h-screen w-full max-w-md bg-background px-5 ${approachPlay ? "pt-4 pb-8" : step === "bot" ? "pt-6 pb-56" : "pt-6 pb-16"} text-foreground`}>

      <style>{`
        @keyframes sg4MatchStepIn{0%{opacity:.15;transform:translateX(10px) scale(.992)}100%{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes sg4MatchStepOut{0%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(-8px)}}
        ::view-transition-old(root){animation:sg4MatchStepOut 170ms cubic-bezier(.4,0,.2,1) both}
        ::view-transition-new(root){animation:sg4MatchStepIn 230ms cubic-bezier(.2,.8,.2,1) both}
      `}</style>
      {step !== "play" && step !== "sudden-death" && step !== "result" ? (
        <header className="flex items-center justify-between">
          {step === "bot" ? (
            <Link to="/spela" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl ${glass}`}>‹</Link>
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
          <section className={`sticky top-2 z-30 mt-4 rounded-[24px] border px-4 py-3.5 ${glass}`}>
            <div className="flex items-center gap-3">
              <span className="text-5xl leading-none">{bot.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-[23px] leading-none">{bot.name}</p>
                  <p className="ml-auto shrink-0 text-xs font-black text-red-700">HCP {formatHcp(bot.hcp)}</p>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label} · {bot.role}</p>
                <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">{bot.intro}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{bot.archetype.traits.slice(0, 3).map((trait) => <span key={trait} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{trait}</span>)}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end border-t border-slate-200/80 pt-2 text-[10px] font-semibold text-slate-500"><span className="capitalize">{bot.archetype.playStyle === "aggressive" ? "Aggressiv" : bot.archetype.playStyle === "conservative" ? "Kontrollerad" : "Balanserad"} spelstil</span></div>
          </section>
          <div className="mt-4 space-y-5">
            {BOT_TIER_META.map(({ tier, range }) => {
              const tierBots = BOTS.filter((item) => item.tier === tier);
              if (tier === "Final Boss") {
                const item = tierBots[0];
                if (!item) return null;
                return <section key={tier}><div className="mb-2 flex items-baseline justify-between px-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Final Boss</p><p className="text-[10px] font-bold text-slate-400">{range}</p></div><button disabled className="relative w-full overflow-hidden rounded-[26px] border border-emerald-900/30 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 p-4 text-left text-white shadow-xl"><span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Lock className="h-4 w-4" /></span><div className="flex items-center gap-4"><span className="text-5xl">{item.avatar}</span><div><p className="font-display text-2xl">{item.name}</p><p className="mt-1 text-sm font-black text-emerald-300">HCP {formatHcp(item.hcp)}</p><p className="mt-1 text-xs text-white/75">Gör birdie på varje hål.</p></div></div></button></section>;
              }
              return (
                <section key={tier}>
                  <div className="mb-2 flex items-baseline justify-between px-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{tier}</p><p className="text-[10px] font-bold text-slate-400">{range}</p></div>
                  <div className="grid grid-cols-4 gap-2">
                    {tierBots.map((item) => {
                      const active = item.id === bot.id;
                      return (
                        <button key={item.id} disabled={item.locked} onClick={() => chooseBot(item)} className={`relative min-h-[132px] overflow-hidden rounded-[20px] border px-1.5 py-3 text-center transition ${item.locked ? "border-slate-300 bg-slate-100/90 opacity-60" : active ? selected : glass}`}>
                          {item.locked ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white"><Lock className="h-3 w-3" /></span> : active ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                          <span className={`block text-[36px] leading-none ${item.locked ? "grayscale" : ""}`}>{item.avatar}</span>
                          <span className="mt-2 block truncate font-display text-[15px] leading-none">{item.name}</span>
                          <span className="mt-2 block text-[11px] font-bold text-slate-600">HCP {formatHcp(item.hcp)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center bg-gradient-to-t from-white via-white/98 to-white/0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-10">
            <div className="pointer-events-auto w-full max-w-md">
              <button onClick={() => goToStep("category")} className={`sg4-ryder-next ${ryderNext} shadow-xl`}>Spela mot {bot.name} <ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </>
      ) : null}

      {step === "category" ? (
        <>
          <section className="mt-5"><div className="flex items-center gap-3"><span className="text-4xl">{bot.avatar}</span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><h1 className="mt-1 font-display text-4xl">Vad vill du spela?</h1></div></div></section>
          <MatchCourseChoice selected={courseSelected} onSelect={() => setCourseSelected(true)} />
          <h2 className="mt-6 text-sm font-bold text-slate-600">Ett moment</h2>
          <div className="mt-2 grid grid-cols-2 gap-3">{CATEGORIES.map((item) => <button key={item.id} onClick={() => { setCourseSelected(false); setCategory(item.id); }} className={`relative min-h-32 rounded-[26px] border p-4 text-left ${!courseSelected && category === item.id ? selected : glass}`}><span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{item.sub}</span><span className="mt-2 block font-display text-2xl">{item.title}</span>{!courseSelected && category === item.id ? <Check className="absolute right-3 top-3 h-5 w-5 text-blue-600" /> : null}</button>)}</div>
          <button disabled={!category && !courseSelected} onClick={() => goToStep(courseSelected ? "course" : category === "around-the-green" || category === "bunker" ? "setup" : "length")} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button>
        </>
      ) : null}

      {step === "setup" ? (
        <>
          <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{category === "bunker" ? "Bunker" : "Chippning"}</p><h1 className="mt-1 font-display text-4xl">{category === "bunker" ? "Bunker" : "Chipping"}</h1><p className="mt-2 text-sm text-slate-600">Du spelar först. Därefter slår {bot.name} från exakt samma avstånd.</p></section>
          <div className={`mt-5 rounded-3xl border p-5 ${glass}`}><Target className="h-5 w-5 text-red-600" /><p className="mt-3 font-display text-2xl">{category === "bunker" ? "10–30 meter" : "8–18 meter"}</p><p className="mt-1 text-xs text-slate-500">Varierade närspelsavstånd.</p></div>
          <button onClick={() => goToStep("length")} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button>
        </>
      ) : null}

      {step === "length" ? (
        category === "putting" || category === "approach" ? (
          <>
            <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{category === "putting" ? "Putting Match" : "Approach Match"}</p><h1 className="mt-1 font-display text-4xl">Välj format</h1><p className="mt-2 text-sm text-slate-600">{category === "putting" ? `Samma spel varje gång – bara längden skiljer. Du och ${bot.name} puttar från exakt samma positioner.` : `Samma spel varje gång – bara längden skiljer. Du och ${bot.name} slår från exakt samma avstånd.`}</p></section>
            <div className="mt-5 space-y-3">{(category === "putting" ? PUTTING_MATCH_FORMATS : APPROACH_MATCH_FORMATS).map((f) => <button key={f.length} onClick={() => setLength(f.length)} className={`flex w-full items-center justify-between gap-4 rounded-[28px] border p-5 text-left ${length === f.length ? selected : glass}`}><span className="min-w-0"><span className="flex items-center gap-2"><span className="font-display text-2xl">{f.name}</span>{f.recommended ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white">Standard</span> : null}</span><span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{f.label}</span></span>{length === f.length ? <Check className="h-5 w-5 shrink-0 text-blue-600" /> : null}</button>)}</div>
            {category === "putting" ? (
              <div className={`mt-4 rounded-3xl border p-4 ${glass}`}><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Så spelas Putting Match</p><ul className="mt-2 space-y-1">{PUTTING_MATCH_RULES.map((rule) => <li key={rule} className="text-[11px] leading-relaxed text-slate-600">· {rule}</li>)}</ul></div>
            ) : (
              <div className={`mt-4 rounded-3xl border p-4 ${glass}`}><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Så spelas Approach Match</p><p className="mt-2 text-[11px] leading-relaxed text-slate-600">· Ett slag per hål från samma målavstånd.</p><p className="text-[11px] leading-relaxed text-slate-600">· Längden startar på målavståndet. Justera till faktisk TrackMan-längd med ±5/±1.</p><p className="text-[11px] leading-relaxed text-slate-600">· Sidled startar på 0 m. Närmast flaggan vinner hålet.</p></div>
            )}
            <button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-950 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button>
          </>
        ) : (
          <>
            <section className="mt-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{bot.name} · HCP {formatHcp(bot.hcp)}</p><h1 className="mt-1 font-display text-4xl">Bäst av</h1></section>
            <div className="mt-5 grid grid-cols-3 gap-3">{([3, 5, 7] as const).map((v) => <button key={v} onClick={() => setLength(v)} className={`relative rounded-3xl border px-2 py-6 ${length === v ? selected : glass}`}><span className="font-display text-3xl">{v}</span><span className="mt-1 block text-[9px] font-black uppercase text-slate-500">hål</span></button>)}</div>
            <button onClick={buildHoles} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-950 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button>
          </>
        )
      ) : null}

      {step === "play" && current ? (
        <>
          <header className="relative flex h-9 items-center justify-center"><Link to="/" aria-label="Till startsidan" className={`absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xl leading-none ${glass}`}>‹</Link><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Match Play · {selectedCategory?.title}</p><span className="absolute right-0 top-0 inline-flex h-9 items-center rounded-full border border-red-200 bg-red-50/90 px-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-red-700">Red · HCP {formatHcp(bot.hcp)}</span></header>
          <style>{`@keyframes sg4PressureEnter{0%{opacity:.25;transform:scale(.985)}55%{opacity:1;transform:scale(1.006)}100%{opacity:1;transform:scale(1)}}@keyframes sg4PressurePulse{0%,100%{transform:scale(1);box-shadow:0 12px 28px -20px rgba(245,158,11,.52),0 0 0 0 rgba(250,204,21,0)}45%{transform:scale(1.012);box-shadow:0 18px 34px -19px rgba(245,158,11,.78),0 0 0 2px rgba(250,204,21,.32)}65%{transform:scale(1.006);box-shadow:0 15px 31px -19px rgba(245,158,11,.66),0 0 0 1px rgba(250,204,21,.18)}}@keyframes sg4PressureWave{0%{transform:translateX(-145%) skewX(-18deg);opacity:0}12%{opacity:.18}48%{opacity:.62}78%{opacity:.18}100%{transform:translateX(245%) skewX(-18deg);opacity:0}}`}</style>
          <section className="mt-1">
            <div className="overflow-hidden rounded-[20px] border border-slate-300/80 bg-white/85 shadow-[0_14px_34px_-28px_rgba(15,23,42,.55)] backdrop-blur-2xl">
              <div className="grid min-h-[52px] grid-cols-[1fr_82px_1fr] items-stretch">
                <div style={liveLeader === "blue" ? { clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" } : undefined} className={`flex min-w-0 items-center px-3 pr-5 ${liveLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[12px] font-black uppercase leading-tight ${liveLeader === "blue" ? "text-white" : "text-slate-700"}`}>{playerName}</p><p className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${liveLeader === "blue" ? "text-blue-100" : "text-blue-600"}`}>{liveLeader === "blue" ? "leder" : "Blue"}</p></div></div>
                <div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Hål {Math.min(holeIndex + 1, length)} av {length}</p><p className={`mt-0.5 font-display text-[22px] leading-none ${liveLeader === "red" ? "text-red-600" : liveLeader === "blue" ? "text-blue-600" : "text-slate-950"}`}>{topScoreText}</p></div>
                <div style={liveLeader === "red" ? { clipPath: "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)" } : undefined} className={`flex min-w-0 items-center justify-end px-3 pl-5 text-right ${liveLeader === "red" ? "bg-red-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[12px] font-black uppercase leading-tight ${liveLeader === "red" ? "text-white" : "text-slate-700"}`}>{bot.name}</p><p className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${liveLeader === "red" ? "text-red-100" : "text-red-600"}`}>{liveLeader === "red" ? "leder" : "Red"}</p></div></div>
              </div>
              <div className="flex items-center justify-center gap-[3px] border-t border-slate-200/80 px-2 py-1">{holes.map((h, i) => <span key={`live-${i}`} className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold ${h.winner === "you" ? "bg-blue-600 text-white" : h.winner === "bot" ? "bg-red-600 text-white" : h.winner === "tie" ? "bg-slate-300 text-slate-700" : i === holeIndex ? "border border-slate-500 bg-white text-slate-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>)}</div>
            </div>
            {pressureNotice ? <div className="mt-2 overflow-hidden"><div key={`pressure-${holeIndex}-${pressureNotice}`} className="relative overflow-hidden rounded-[22px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-5 py-3 text-center text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureEnter 420ms cubic-bezier(.2,.8,.25,1) both, sg4PressurePulse 1.9s ease-in-out 520ms infinite" }}><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-transparent via-white/90 to-transparent blur-[1px]" style={{ animation: "sg4PressureWave 1.18s cubic-bezier(.2,.75,.25,1) 150ms both" }} /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">Pressläge · Nu gäller det</p><p className="mt-1 text-xs font-bold leading-snug text-slate-800">{pressureNotice}</p></div></div></div> : null}
          </section>

          <div className="mt-2 flex items-start justify-end gap-2"><div className="relative max-w-[82%] rounded-2xl rounded-tr-md border border-red-200 bg-red-50/90 px-3 py-2 text-right shadow-sm"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-red-600">{bot.name} · Red</p><p className="mt-0.5 text-sm leading-snug text-slate-700">“{botComment}”</p></div><span className="text-3xl">{bot.avatar}</span></div>

          <section className={`${approachPlay ? "mt-2 rounded-[28px] p-3" : "mt-2 rounded-[32px] p-4"} border border-slate-300/90 bg-slate-100/90 text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl`}><h1 className={`${category === "putting" ? "text-5xl" : approachPlay ? "text-4xl" : "text-5xl"} font-display leading-[1.05]`}>{current.title}</h1><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{selectedCategory?.sub}</p><p className="mt-1 text-xs text-slate-600">{current.detail}</p>{turnState === "you" && !approachPlay ? <div className={`mt-3 rounded-[20px] border p-3 text-left ${blueGlass}`}><p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Blue · Din tur</p><p className="mt-1 text-sm font-bold text-blue-950">Du spelar först</p></div> : null}{turnState === "bot-thinking" ? <div className={`mt-3 rounded-[20px] border p-3 ${redGlass}`}><div className="flex items-center justify-center gap-3"><span className="text-3xl">{bot.avatar}</span><div className="text-left"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-700">Red · {bot.name} spelar…</p><div className="mt-2 flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.3s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-red-600 [animation-delay:-0.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-red-600" /></div></div></div></div> : null}{turnState === "reveal" && current.botValue != null ? <div className={`mt-3 rounded-[20px] border p-3 ${current.winner === "you" ? blueGlass : current.winner === "bot" ? redGlass : glass}`}><p className={`text-[9px] font-black uppercase tracking-[0.14em] ${current.winner === "you" ? "text-blue-700" : current.winner === "bot" ? "text-red-700" : "text-slate-600"}`}>{bot.name}s resultat · {resultLabel(current)}</p><p className={`mt-1 font-display text-2xl ${current.winner === "you" ? "text-blue-700" : current.winner === "bot" ? "text-red-700" : "text-slate-800"}`}>{current.winner === "you" ? `${playerName} vinner hålet` : current.winner === "bot" ? `${bot.name} vinner hålet` : "Hålet delas"}</p></div> : null}</section>

          <section className={approachPlay ? "mt-2" : "mt-3"}>
            <p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ditt resultat</p>
            {category === "putting" ? (
              <div className="mt-2 grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((v) => <button key={v} disabled={turnState !== "you"} onClick={() => setYourValue(v)} className={`rounded-2xl border py-4 font-display text-2xl disabled:opacity-50 ${yourValue === v ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{v}</button>)}</div>
            ) : category === "around-the-green" ? (
              <div className="mt-3 grid grid-cols-3 gap-2.5">{((category as string) === "bunker" ? BOT_BUNKER_POINT_ZONES : CHIP_POINT_ZONES).map((zone) => <button key={zone.points} disabled={turnState !== "you"} onClick={() => setYourValue(zone.points)} className={`min-h-[64px] rounded-2xl border px-2 py-4 text-center font-display text-base leading-tight disabled:opacity-50 ${yourValue === zone.points ? "border-blue-600 bg-blue-600 text-white" : glass}`}>{zone.label}</button>)}</div>
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
          <section className="pt-3 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-red-100 ring-1 ring-slate-200"><Target className="h-6 w-6 text-slate-800" /></div><p className="mt-4 text-[10px] font-black uppercase tracking-[0.32em] text-slate-700">Sudden death</p><h1 className="mt-1 font-display text-5xl leading-none">11 meter</h1><p className="mt-3 text-sm font-semibold text-slate-700">Du slår först · {bot.name} svarar efteråt</p><div className="mx-auto mt-3 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Avgörande {suddenDeathRound}</div></section>
          <section className={`mt-6 rounded-[28px] border p-5 shadow-xl shadow-slate-200/50 ${glass}`}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Ditt slag</p><p className="mt-1 text-sm text-slate-600">Registrera hur nära hålet du kom. Resultatet används bara för att avgöra matchen.</p><button disabled={sdBusy} onClick={() => void playSuddenDeath(null)} className="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-black text-white disabled:opacity-40">Sänkt</button><div className="mt-2 grid grid-cols-4 gap-2">{[0.5, 1, 1.5, 2, 3, 5, 8, 11].map((v) => <button disabled={sdBusy} key={v} onClick={() => void playSuddenDeath(v)} className="rounded-xl border border-slate-200 bg-white/90 py-3 text-xs font-bold disabled:opacity-40">{v} m</button>)}</div></section>
          {sdBotText ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-600 p-4 text-center text-sm font-bold text-white">{sdBotText}</div> : null}
          <div className="mt-4 flex items-start justify-end gap-2"><div className={`rounded-2xl border p-3 text-right text-sm ${redGlass}`}>“{sdBusy ? "Nu gäller det." : botComment}”</div><span className="text-3xl">{bot.avatar}</span></div>
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
          <section className="mt-6 overflow-hidden rounded-[28px] border border-slate-300/85 bg-white/90 shadow-[0_22px_52px_-30px_rgba(15,23,42,.5)] backdrop-blur-2xl">
            <div className="px-4 pt-4 text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selectedCategory?.title} · Matchresultat</p></div>
            <div className="mt-3 grid min-h-[104px] grid-cols-[1fr_88px_1fr] items-stretch">
              <div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pr-5 text-center ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{playerName}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "blue" ? "text-white" : "text-blue-700"}`}>{score.you}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "blue" ? "text-blue-100" : "text-slate-500"}`}>vunna hål</p></div>
              <div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><Trophy className="mb-1 h-4 w-4 text-amber-500" /><p className="font-display text-[26px] leading-none text-slate-950">{suddenDeathWinner ? "SD" : `${score.you}–${score.bot}`}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Slutresultat</p></div>
              <div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pl-5 text-center ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{bot.name}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "red" ? "text-white" : "text-red-700"}`}>{score.bot}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "red" ? "text-red-100" : "text-slate-500"}`}>vunna hål</p></div>
            </div>
            <div className="border-t border-slate-200 px-4 py-3 text-center"><p className="text-xs font-bold text-slate-800">{suddenDeathWinner === "you" ? `${playerName} vinner i sudden death` : suddenDeathWinner === "bot" ? `${bot.name} vinner i sudden death` : score.you > score.bot ? `${playerName} vinner över ${bot.name}` : score.bot > score.you ? `${bot.name} vinner` : "Matchen slutar delad"}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Blue · {playerName} · {score.you} hål&nbsp;&nbsp;•&nbsp;&nbsp;Red · {bot.name} · HCP {formatHcp(bot.hcp)} · {score.bot} hål{score.tie ? ` · ${score.tie} delade` : ""}</p></div>
          </section>

          {category === "putting" ? <PuttingMatchReview holes={holes} /> : <ActivityReview activity="match" input={category === "around-the-green" || category === "bunker" ? shortGameReviewInput(selectedCategory?.title ?? "Match", holes.filter(h => h.winner && h.yourValue !== undefined).map(h => ({ distance: h.distance, points: h.yourValue! })), category === "bunker") : { title: selectedCategory?.title ?? "Match", outcomes: rawActivityOutcomes(holes.filter(h => h.winner).map(h => h.yourApproach ? { ...h.yourApproach, target: h.distance } : { carry: h.yourValue, hit: h.yourHit, distance: h.distance })) }} />}

          {cupContext ? (
            <section className="mt-4 overflow-hidden rounded-[26px] border border-amber-300 bg-amber-50/90 p-4 text-center shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">Club Cup · {cupContext.round === "quarterfinal" ? "Kvartsfinal" : cupContext.round === "semifinal" ? "Semifinal" : "Final"}</p>
              <p className="mt-2 font-display text-2xl text-slate-950">{resultOutcome === "player" ? "Du är vidare" : "Du är utslagen"}</p>
              <p className="mt-1 text-xs text-slate-600">Resultatet är registrerat i bracketen.</p>
              <a href="/cup" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 font-display text-lg text-slate-950 shadow-sm">Till bracket <ChevronRight className="h-4 w-4" /></a>
            </section>
          ) : null}

          <section className={`mt-4 overflow-hidden rounded-[26px] border ${redGlass}`}>
            <div className="flex items-start gap-3 p-4">
              <span className="text-4xl leading-none">{bot.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-xl text-slate-950">{bot.name}</p>
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-red-700">{BOT_PERSONALITIES[bot.id]?.label ?? bot.archetype.label}</p>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-6 text-slate-800">“{resultReactionLine}”</p>
              </div>
            </div>
            <div className="border-t border-red-200/70 p-3">
              {resultNextStep.action === "challenge" && resultChallengeBot && !resultChallengeBot.locked ? (
                <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:challenge:${resultChallengeBot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); chooseBot(resultChallengeBot); setStep(category === "around-the-green" ? "setup" : category ? "length" : "category"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm">Utmana {resultChallengeBot.name} <ChevronRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:rematch:${bot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 font-display text-lg text-white shadow-sm"><RotateCcw className="h-4 w-4" /> Rematch mot {bot.name}</button>
              )}
            </div>
          </section>

          <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p><h2 className="font-display text-2xl">Hela matchen</h2></div><p className="text-[10px] font-bold uppercase text-slate-500">{playedHoles} spelade</p></div><div className={`overflow-hidden rounded-[24px] border ${glass}`}><div className="overflow-x-auto"><div className="min-w-max"><div className="grid" style={{ gridTemplateColumns: `minmax(92px,1.35fr) repeat(${length},58px)` }}><div className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">Hål</div>{holes.map((_, i) => <div key={`rh-${i}`} className="border-b border-r border-slate-200 bg-slate-100 py-2 text-center text-[10px] font-bold text-slate-700">{i + 1}</div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-blue-700 truncate">{playerName}</div>{holes.map((h, i) => <div key={`ry-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 px-1 py-2 text-center text-[9px] font-bold text-blue-700"><span className={`inline-flex min-h-[28px] min-w-[42px] items-center justify-center rounded-md px-1 ${h.winner === "you" ? "bg-blue-600 text-white" : ""}`}>{sideResultLabel(h, "you")}</span></div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-red-700 truncate">{bot.name}</div>{holes.map((h, i) => <div key={`rb-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 px-1 py-2 text-center text-[9px] font-bold text-red-700"><span className={`inline-flex min-h-[28px] min-w-[42px] items-center justify-center rounded-md px-1 ${h.winner === "bot" ? "bg-red-600 text-white" : ""}`}>{sideResultLabel(h, "bot")}</span></div>)}<div className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">Vinnare</div>{holes.map((h, i) => <div key={`rw-${i}`} className={`border-r border-slate-200 bg-slate-50 py-2 text-center text-[9px] font-bold ${h.winner === "you" ? "text-blue-700" : h.winner === "bot" ? "text-red-700" : "text-slate-600"}`}>{h.winner === "you" ? "B" : h.winner === "bot" ? "R" : "AS"}</div>)}</div></div></div></div></section>

          {resultRecommendation ? <a href={resultRecommendation.href} onClick={() => recordRecommendationOpen(resultRecommendation.id)} className={`mt-5 flex items-center gap-4 rounded-[26px] border p-4 text-left ${glass}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><Target className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Nästa</span><span className="mt-1 block font-display text-2xl">{resultRecommendation.title}</span><span className="mt-1 block text-xs text-slate-600">{resultRecommendation.detail}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-slate-500" /></a> : null}
          <div className="mt-5 space-y-3">
            {resultNextStep.action === "challenge" ? (
              <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:rematch:${bot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); buildHoles(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch mot {bot.name}</button>
            ) : resultChallengeBot && !resultChallengeBot.locked ? (
              <button onClick={() => { if (category) recordRecommendationSignal(`bot-next:challenge:${resultChallengeBot.id}:${category}`, "engage"); recordRecommendationOpen("play-bot"); chooseBot(resultChallengeBot); setStep(category === "around-the-green" ? "setup" : category ? "length" : "category"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><Target className="h-5 w-5" /> Utmana {resultChallengeBot.name}</button>
            ) : null}
            <button onClick={() => { setCategory(null); setStep("bot"); }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl ${glass}`}><Target className="h-5 w-5" /> Välj ny motståndare</button>
            <Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/75 py-4 text-sm font-bold">Hem</Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
