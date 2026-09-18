import { ActivityReview } from "@/components/activity-review";
import { PuttingMatchReview } from "@/components/putting-match-review";
import { rawActivityOutcomes, shortGameReviewInput } from "@/lib/activity-review";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Loader2, Flag, Home, Minus, Plus, RotateCcw, Target, Trophy, User, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listFriendships, type Friendship } from "@/lib/friends-cloud";
import { loadCardProfile } from "@/lib/rating-card";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LIGHT_SURFACE } from "./8-bollar";
import {
  createMatchMultiplayerSession,
  fetchMatchMultiplayerSession,
  subscribeMatchMultiplayerSession,
  updateMatchMultiplayerState,
  type MatchCloudState,
} from "@/lib/match-multiplayer";
import { formatPuttingDistance, generatePuttingMatchDistances } from "@/lib/putting-match";
import { CHIP_POINT_ZONES, generateChipMatchDistances, getChipDistanceBand, getChipPointZone } from "@/lib/chip-match";
import { chipPerformanceFromPoints, puttingPerformanceFromStrokes, recordEngineOutcome, selectNextEngineDistance, type EngineSkill } from "@/lib/sg4-engine";
import { allowedDistancesInsideBand, getFriendHeadToHead, getFriendMatchPacing, getMostPlayedOpponentKey, getPlannedDistanceBand, recordFriendMatchHistory } from "@/lib/friend-match-experience";

export const Route = createFileRoute("/match")({
  head: () => ({ meta: [{ title: "Match Play | SG4" }] }),
  component: MatchPlayPage,
});

type Step = "players" | "teams" | "scoring" | "category" | "type" | "setup" | "approach-setup" | "length" | "play" | "sudden-death" | "result";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "bunker" | "putting" | "speed";
type HoleWinner = "blue" | "red" | "tie" | null;
type MatchMode = "singles" | "fourball" | "foursomes";
type ScoringMode = "match" | "stroke";
type MatchLength = 3 | 5 | 7;
type Player = { id: string; name: string; avatarUrl?: string | null; isSelf?: boolean; isGuest?: boolean };
type Challenge = { eyebrow: string; title: string; detail: string };
type ApproachResult = { longitudinalDirection: "short" | "long"; longitudinal: number; lateralDirection: "left" | "right"; lateral: number; proximity: number };
type Hole = { challenge: Challenge; winner: HoleWinner; blueStrokes?: number; redStrokes?: number; bluePoints?: number; redPoints?: number; blueApproach?: ApproachResult; redApproach?: ApproachResult; blueSpeed?: number; redSpeed?: number };
type ShortGameLie = "fairway" | "rough";
type ApproachRangeId = "50-100" | "100-150" | "150-200" | "custom";

const LOCAL_MATCH_KEY = "sg4.active-match.v1";

const CATEGORIES = [
  { id: "putting", title: "Puttning", subtitle: "Putting", description: "Spela en riktig puttingmatch hål för hål. Färre puttar vinner hålet." },
  { id: "around-the-green", title: "Chippning", subtitle: "Chipping", description: "Chippingmatch mot samma mål. Närmast hålet vinner." },
  { id: "bunker", title: "Bunker", subtitle: "Bunkerslag", description: "Samma bunkerläge för båda. Närmast hålet vinner." },
  { id: "approach", title: "Inspel", subtitle: "Järn & wedge · närmast flaggan", description: "Slå mot samma mål från varierade avstånd. Närmast flaggan vinner." },
  { id: "off-the-tee", title: "Driver", subtitle: "Driver · fairway", description: "Längsta godkända drive inom en 30 meter bred fairway vinner." },
  { id: "speed", title: "Speed", subtitle: "Ball speed", description: "Match Play i speed. Högsta ball speed vinner varje omgång." },
] as const;

const MATCH_TYPES: Record<MatchCategory, Array<{ id: string; title: string; description: string }>> = {
  "off-the-tee": [
    { id: "fairway", title: "Utslag", description: "Längsta slaget inom den 30 m breda fairwaykorridoren vinner hålet." },
  ],
  approach: [
    { id: "closest", title: "Inspel", description: "Samma målavstånd för båda. Närmast flaggan vinner hålet." },
  ],
  "around-the-green": [
    { id: "closest", title: "Chippning", description: "Ett slag mot flaggan. Närmast flaggan vinner hålet." },
  ],
  bunker: [
    { id: "closest", title: "Bunker", description: "Ett bunkerslag mot flaggan. Närmast flaggan vinner hålet." },
  ],
  putting: [
    { id: "standard", title: "Puttning", description: "Standardiserat format · samma position för båda · färre puttar vinner hålet" },
  ],
  speed: [
    { id: "7-iron", title: "7-järn", description: "Ball speed med 7-järn. Högsta speed vinner omgången." },
    { id: "driver", title: "Driver", description: "Ball speed med driver. Högsta speed vinner omgången." },
  ],
};

const BUNKER_POINT_ZONES = [
  { points: 5, label: "Sänkt" },
  { points: 4, label: "Inom 1 m" },
  { points: 3, label: "Inom 2 m" },
  { points: 2, label: "Inom 3 m" },
  { points: 1, label: "På green · utanför 3 m" },
  { points: 0, label: "Missad green" },
] as const;

const SHORT_GAME_LIES: Array<{ id: ShortGameLie; title: string }> = [
  { id: "fairway", title: "Fairway" },
  { id: "rough", title: "Rough" },
];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(items: readonly T[]) { return items[Math.floor(Math.random() * items.length)]; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(""); }
function liveStatus(diff: number) { return diff === 0 ? "AS" : diff > 0 ? `${diff} UP` : `${Math.abs(diff)} DN`; }
function lieLabel(lie: ShortGameLie) { return lie === "fairway" ? "fairway" : "rough"; }
function holeDistance(hole?: Hole) {
  const value = Number.parseFloat(hole?.challenge.title ?? "");
  return Number.isFinite(value) ? value : undefined;
}
function engineSkillForMatchCategory(category: MatchCategory | null): EngineSkill | null {
  if (category === "putting") return "putting";
  if (category === "around-the-green" || category === "bunker") return "chip";
  if (category === "approach") return "approach";
  if (category === "off-the-tee") return "driver";
  return null;
}
function approachRangeBounds(id: ApproachRangeId, customMin: number, customMax: number): [number, number] {
  if (id === "50-100") return [50, 100];
  if (id === "100-150") return [100, 150];
  if (id === "150-200") return [150, 200];
  return [Math.min(customMin, customMax), Math.max(customMin, customMax)];
}
function generateApproachDistances(length: MatchLength, selected: ApproachRangeId[], customMin: number, customMax: number) {
  const ranges = selected.length ? selected : (["100-150"] as ApproachRangeId[]);
  const order = [...ranges].sort(() => Math.random() - 0.5);
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    const id = order[i % order.length];
    const [min, max] = approachRangeBounds(id, customMin, customMax);
    let value = rand(min, max);
    let tries = 0;
    while (i > 0 && Math.abs(value - out[i - 1]) < 8 && tries < 12) { value = rand(min, max); tries++; }
    out.push(value);
  }
  return out;
}
function generateShortGameLieSequence(length: MatchLength, selected: ShortGameLie[]) {
  const lies: ShortGameLie[] = selected.length ? selected : ["fairway"];
  return Array.from({ length }, () => pick(lies));
}

function generateChallenge(category: MatchCategory, typeId: string, mode: MatchMode, shortGameLies: ShortGameLie[] = ["fairway", "rough"], approachDistance?: number): Challenge {
  const suffix = mode === "fourball" ? " · registrera lagets bästa resultat" : mode === "foursomes" ? " · laget spelar vartannat slag" : "";
  if (category === "putting") {
    const distance = approachDistance ?? 1.5;
    return { eyebrow: "Puttning", title: formatPuttingDistance(distance), detail: `${formatPuttingDistance(distance)} från flaggan · håla ut · färre puttar vinner${suffix}` };
  }
  if (category === "bunker") {
    return { eyebrow: "Bunker", title: "Bunkerslag", detail: `Närmast flaggan vinner${suffix}` };
  }
  if (category === "around-the-green") {
    const distance = approachDistance ?? rand(8, 30);
    const band = getChipDistanceBand(distance);
    return { eyebrow: band.label, title: `${distance} m`, detail: `${distance} m från flaggan · närmast flaggan vinner${suffix}` };
  }
  if (category === "approach") {
    const d = approachDistance ?? rand(100, 150);
    return { eyebrow: "Inspel", title: `${d} m`, detail: `Samma mål för båda · närmast flaggan vinner${suffix}` };
  }
  if (category === "speed") {
    const club = typeId === "driver" ? "Driver" : "7-järn";
    return { eyebrow: "Speed · Ball speed", title: club, detail: `Högsta ball speed vinner omgången${suffix}` };
  }
  if (typeId === "distance") return { eyebrow: "Off the Tee", title: "Long Drive", detail: `Längsta godkända drive vinner${suffix}` };
  if (typeId === "shape") return { eyebrow: "Driver", title: pick(["Draw", "Fade"] as const), detail: `Rätt bollflykt och spelbar drive vinner${suffix}` };
  return { eyebrow: "Off the Tee", title: "Utslag", detail: `Längsta slaget inom fairwaykorridoren vinner hålet${suffix}` };
}

function matchScore(holes: Hole[]) {
  return holes.reduce((s, h) => {
    if (h.winner === "blue") s.blue++;
    if (h.winner === "red") s.red++;
    if (h.winner !== null) s.played++;
    if (typeof h.blueStrokes === "number") s.blueStrokes += h.blueStrokes;
    if (typeof h.redStrokes === "number") s.redStrokes += h.redStrokes;
    if (typeof h.bluePoints === "number") s.bluePoints += h.bluePoints;
    if (typeof h.redPoints === "number") s.redPoints += h.redPoints;
    return s;
  }, { blue: 0, red: 0, played: 0, blueStrokes: 0, redStrokes: 0, bluePoints: 0, redPoints: 0 });
}

function PlayerAvatar({ player, tone, large = false }: { player: Player; tone: "blue" | "red"; large?: boolean }) {
  const cls = tone === "blue" ? "border-blue-500 bg-blue-500/10 text-blue-600" : "border-red-500 bg-red-500/10 text-red-600";
  return <span className={`flex ${large ? "h-16 w-16 text-lg" : "h-10 w-10 text-xs"} items-center justify-center overflow-hidden rounded-full border-[3px] font-display ${cls}`}>
    {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(player.name) || <User className={large ? "h-6 w-6" : "h-4 w-4"} />}
  </span>;
}

function SelectedCheck({ className = "absolute right-3 top-3" }: { className?: string }) {
  return <span className={`${className} flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm`}><Check className="h-3.5 w-3.5" /></span>;
}

function MatchPlayPage() {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const [entryFlow] = useState<"friend" | "team">(() => {
    if (typeof window === "undefined") return "friend";
    return new URLSearchParams(window.location.search).get("flow") === "team" ? "team" : "friend";
  });
  const [step, setStep] = useState<Step>("players");
  const [mode, setMode] = useState<MatchMode | null>(() => entryFlow === "friend" ? "singles" : null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [abortConfirmOpen, setAbortConfirmOpen] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [guests, setGuests] = useState<Player[]>([]);
  const [guestName, setGuestName] = useState("");
  const [selfName, setSelfName] = useState("Du");
  const [selfAvatar, setSelfAvatar] = useState<string | null>(() => loadCardProfile().photo ?? null);
  const [blueMateId, setBlueMateId] = useState<string | null>(null);
  const [category, setCategory] = useState<MatchCategory | null>(null);
  const [matchType, setMatchType] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("match");
  const [matchLength, setMatchLength] = useState<MatchLength>(5);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [finalText, setFinalText] = useState("");
  const [suddenDeathRound, setSuddenDeathRound] = useState(1);
  const [sdBlue, setSdBlue] = useState<number | null>(null);
  const [sdRed, setSdRed] = useState<number | null>(null);
  const [sdBlueSunk, setSdBlueSunk] = useState(false);
  const [sdRedSunk, setSdRedSunk] = useState(false);
  const [sdMessage, setSdMessage] = useState("");
  const [showSuddenDeathIntro, setShowSuddenDeathIntro] = useState(false);
  const [sdWinnerCelebration, setSdWinnerCelebration] = useState<"blue" | "red" | null>(null);
  const [normalWinnerCelebration, setNormalWinnerCelebration] = useState<"blue" | "red" | null>(null);
  const [matchRunId, setMatchRunId] = useState(() => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [headToHead, setHeadToHead] = useState({ played: 0, wins: 0, losses: 0, ties: 0 });
  const recordedHistoryIdRef = useRef<string | null>(null);
  const [blueStrokes, setBlueStrokes] = useState(1);
  const [redStrokes, setRedStrokes] = useState(1);
  const [blueStrokesSelected, setBlueStrokesSelected] = useState(false);
  const [redStrokesSelected, setRedStrokesSelected] = useState(false);
  const [bluePoints, setBluePoints] = useState<number | null>(null);
  const [redPoints, setRedPoints] = useState<number | null>(null);
  const [blueSpeed, setBlueSpeed] = useState(0);
  const [redSpeed, setRedSpeed] = useState(0);
  const [blueSpeedSelected, setBlueSpeedSelected] = useState(false);
  const [redSpeedSelected, setRedSpeedSelected] = useState(false);
  const [speedBaseline, setSpeedBaseline] = useState(0);
  const [shortGameLies, setShortGameLies] = useState<ShortGameLie[]>([]);
  const [approachRanges, setApproachRanges] = useState<ApproachRangeId[]>([]);
  const [approachCustomMin, setApproachCustomMin] = useState(30);
  const [approachCustomMax, setApproachCustomMax] = useState(200);
  const [approachTurn, setApproachTurn] = useState<"blue" | "red">("blue");
  const [approachLongDirection, setApproachLongDirection] = useState<"short" | "long">("short");
  const [approachLong, setApproachLong] = useState(0);
  const [approachLateralDirection, setApproachLateralDirection] = useState<"left" | "right">("left");
  const [approachLateral, setApproachLateral] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMatchReady, setLocalMatchReady] = useState(false);

  const liveStepRef = useRef<Step>(step);
  useEffect(() => { liveStepRef.current = step; }, [step]);

  useEffect(() => {
    const currentState = window.history.state ?? {};
    if (currentState.sg4MatchStep === step) return;
    const nextState = { ...currentState, sg4MatchStep: step };
    const live = step === "play" || step === "sudden-death" || step === "result";
    if (step === "players" || live) window.history.replaceState(nextState, "", window.location.href);
    else window.history.pushState(nextState, "", window.location.href);
  }, [step]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const current = liveStepRef.current;
      if (current === "play" || current === "sudden-death") {
        window.history.pushState({ ...(window.history.state ?? {}), sg4MatchStep: current }, "", window.location.href);
        return;
      }
      const target = event.state?.sg4MatchStep as Step | undefined;
      if (target && current !== "result") setStep(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (step !== "sudden-death") return;
    setShowSuddenDeathIntro(true);
    const timer = window.setTimeout(() => setShowSuddenDeathIntro(false), 2400);
    return () => window.clearTimeout(timer);
  }, [step, suddenDeathRound]);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [editingHoleIndex, setEditingHoleIndex] = useState<number | null>(null);
  const [returnHoleIndex, setReturnHoleIndex] = useState<number | null>(null);
  const [matchSessionId, setMatchSessionId] = useState<string | null>(null);
  const [matchSessionHostId, setMatchSessionHostId] = useState<string | null>(null);
  const [sessionBlueTeam, setSessionBlueTeam] = useState<Player[] | null>(null);
  const [sessionRedTeam, setSessionRedTeam] = useState<Player[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setFriends([]); setFriendsLoading(false); return; }
    let cancelled = false;
    setFriendsLoading(true);
    void listFriendships().then((r) => { if (!cancelled) { setFriends(r.accepted); setFriendsLoading(false); } });
    void supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      if (data?.display_name) setSelfName(data.display_name);
      if (data?.avatar_url) setSelfAvatar(data.avatar_url);
    });
    return () => { cancelled = true; };
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const sessionId = new URLSearchParams(window.location.search).get("session");
    if (!sessionId) return;
    let cancelled = false;

    const applySession = async () => {
      try {
        const session = await fetchMatchMultiplayerSession(sessionId);
        if (cancelled || !session?.state) return;
        const state = session.state;
        setMatchSessionId(session.id);
        setMatchSessionHostId(session.hostUserId);
        setSessionBlueTeam(state.blueTeam as Player[]);
        setSessionRedTeam(state.redTeam as Player[]);
        setMode(state.mode);
        setCategory(state.category);
        setMatchType(state.matchType);
        setScoringMode(state.scoringMode);
        setMatchLength(state.matchLength);
        setHoles(state.holes as Hole[]);
        setHoleIndex(Math.min(state.holeIndex, Math.max(0, state.matchLength - 1)));
        setFinalText(state.finalText ?? "");
        setSuddenDeathRound(state.suddenDeathRound ?? 1);
        setSdBlue(state.sdBlue ?? null); setSdRed(state.sdRed ?? null);
        setSdBlueSunk(Boolean(state.sdBlueSunk)); setSdRedSunk(Boolean(state.sdRedSunk)); setSdMessage(state.sdMessage ?? "");
        setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
        if (state.category === "speed") {
          const cloudHoles = state.holes as Hole[];
          const previous = [...cloudHoles].slice(0, state.holeIndex).reverse().find((hole) => typeof hole.blueSpeed === "number" && typeof hole.redSpeed === "number");
          const baseline = previous ? Math.round(((previous.blueSpeed ?? 0) + (previous.redSpeed ?? 0)) / 2) : state.matchType === "driver" ? 140 : 110;
          setSpeedBaseline(baseline);
          setBlueSpeed(baseline); setRedSpeed(baseline);
          setBlueSpeedSelected(false); setRedSpeedSelected(false);
        }
        setApproachTurn("blue");
        setStep(session.status === "completed" || state.step === "result" || Boolean(state.finalText) ? "result" : state.step === "sudden-death" ? "sudden-death" : "play");
      } catch {
        // If a stale session link cannot be loaded, keep the normal match flow available.
      }
    };

    void applySession();
    const unsubscribe = subscribeMatchMultiplayerSession(sessionId, () => { void applySession(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

  // Restore an interrupted local match after an app reload / iOS process restart.
  useEffect(() => {
    const hasCloudSession = new URLSearchParams(window.location.search).has("session");
    if (hasCloudSession) { setLocalMatchReady(true); return; }
    try {
      const raw = window.localStorage.getItem(LOCAL_MATCH_KEY);
      if (!raw) { setLocalMatchReady(true); return; }
      const saved = JSON.parse(raw) as any;
      if (!saved || saved.version !== 1 || (saved.step !== "play" && saved.step !== "sudden-death")) {
        window.localStorage.removeItem(LOCAL_MATCH_KEY);
        setLocalMatchReady(true);
        return;
      }
      setMode(saved.mode ?? "singles");
      setCategory(saved.category ?? null);
      setMatchType(saved.matchType ?? null);
      setScoringMode(saved.scoringMode ?? "match");
      setMatchLength(saved.matchLength ?? 5);
      const restoredHoles = Array.isArray(saved.holes) ? saved.holes.slice(0, saved.matchLength ?? 5) : [];
      if (!restoredHoles.length || !restoredHoles.every((hole: any) => hole && hole.challenge && typeof hole.challenge.title === "string")) {
        window.localStorage.removeItem(LOCAL_MATCH_KEY);
        setLocalMatchReady(true);
        return;
      }
      setHoles(restoredHoles);
      setHoleIndex(Math.min(Math.max(0, Number.isFinite(saved.holeIndex) ? saved.holeIndex : 0), restoredHoles.length - 1));
      setFinalText(saved.finalText ?? "");
      setSuddenDeathRound(saved.suddenDeathRound ?? 1);
      setSdMessage(saved.sdMessage ?? "");
      setBlueStrokes(saved.blueStrokes ?? 1);
      setRedStrokes(saved.redStrokes ?? 1);
      setBlueStrokesSelected(Boolean(saved.blueStrokesSelected));
      setRedStrokesSelected(Boolean(saved.redStrokesSelected));
      setBluePoints(saved.bluePoints ?? null);
      setRedPoints(saved.redPoints ?? null);
      const restoredSpeedBaseline = saved.speedBaseline ?? (saved.matchType === "driver" ? 140 : 110);
      setSpeedBaseline(restoredSpeedBaseline);
      setBlueSpeed(saved.blueSpeed ?? restoredSpeedBaseline);
      setRedSpeed(saved.redSpeed ?? restoredSpeedBaseline);
      setBlueSpeedSelected(Boolean(saved.blueSpeedSelected));
      setRedSpeedSelected(Boolean(saved.redSpeedSelected));
      setShortGameLies(Array.isArray(saved.shortGameLies) ? saved.shortGameLies : []);
      setApproachRanges(Array.isArray(saved.approachRanges) ? saved.approachRanges : []);
      setApproachCustomMin(saved.approachCustomMin ?? 30);
      setApproachCustomMax(saved.approachCustomMax ?? 200);
      setApproachTurn(saved.approachTurn === "red" ? "red" : "blue");
      setApproachLong(saved.approachLong ?? 0);
      setApproachLateralDirection(saved.approachLateralDirection === "right" ? "right" : "left");
      setApproachLateral(saved.approachLateral ?? 0);
      setSelectedFriendIds(Array.isArray(saved.selectedFriendIds) ? saved.selectedFriendIds : []);
      setGuests(Array.isArray(saved.guests) ? saved.guests : []);
      setBlueMateId(saved.blueMateId ?? null);
      if (saved.selfName) setSelfName(saved.selfName);
      if (saved.matchRunId) setMatchRunId(saved.matchRunId);
      setSessionBlueTeam(Array.isArray(saved.blueTeam) ? saved.blueTeam : null);
      setSessionRedTeam(Array.isArray(saved.redTeam) ? saved.redTeam : null);
      setStep(saved.step);
    } catch {
      window.localStorage.removeItem(LOCAL_MATCH_KEY);
    } finally {
      setLocalMatchReady(true);
    }
  }, []);

  const selfPlayer: Player = { id: user?.id ?? "self", name: selfName, avatarUrl: selfAvatar, isSelf: true };
  const selectedFriends: Player[] = friends.filter((f) => selectedFriendIds.includes(f.other.id)).map((f) => ({ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }));
  const selectedOthers = [...selectedFriends, ...guests];
  const selectedPlayers = [selfPlayer, ...selectedOthers];
  const neededOthers = mode === "singles" ? 1 : 3;
  const canContinuePlayers = mode !== null && selectedOthers.length === neededOthers;
  const blueMate = selectedPlayers.find((p) => p.id === blueMateId) ?? null;
  const blueTeam = sessionBlueTeam ?? (mode === "singles" ? [selfPlayer] : [selfPlayer, ...(blueMate ? [blueMate] : [])]);
  const redTeam = sessionRedTeam ?? selectedPlayers.filter((p) => !blueTeam.some((b) => b.id === p.id));
  const teamsReady = mode === "singles" || (mode !== null && blueTeam.length === 2 && redTeam.length === 2);
  const selectedCategory = CATEGORIES.find((i) => i.id === category);
  const selectedType = category ? MATCH_TYPES[category].find((i) => i.id === matchType) : null;
  const score = useMemo(() => matchScore(holes), [holes]);
  const diff = score.blue - score.red;
  const strokeDiff = score.redStrokes - score.blueStrokes;
  const pointDiff = score.bluePoints - score.redPoints;
  const current = holes[holeIndex];
  const lastScoredHoleIndex = holes.reduce((last, hole, index) => hole.winner !== null ? index : last, -1);
  const loadingSocial = loading || friendsLoading;
  const blueLabel = blueTeam.map((p) => p.name).join(" + ") || "Blue";
  const redLabel = redTeam.map((p) => p.name).join(" + ") || "Red";
  const holesRemaining = Math.max(0, matchLength - score.played);
  const matchLeader = diff > 0 ? "blue" : diff < 0 ? "red" : null;
  const leadingLabel = diff > 0 ? blueLabel : diff < 0 ? redLabel : "";
  const trailingLabel = diff > 0 ? redLabel : diff < 0 ? blueLabel : "";
  const pressureNotice = scoringMode !== "match" || holesRemaining <= 0 ? null
    : diff === 0 && holesRemaining === 1
      ? "Sista hålet avgör matchen."
      : Math.abs(diff) === holesRemaining
        ? `${leadingLabel} kan avgöra matchen nu. ${trailingLabel} måste vinna hålet.`
        : Math.abs(diff) === holesRemaining - 1 && Math.abs(diff) > 0
          ? `${trailingLabel} måste vinna eller dela hålet för att hålla matchen vid liv.`
          : null;
  const strokeLeader = category === "around-the-green" || category === "bunker"
    ? pointDiff > 0 ? "blue" : pointDiff < 0 ? "red" : null
    : strokeDiff > 0 ? "blue" : strokeDiff < 0 ? "red" : null;
  const liveLeader = scoringMode === "match" ? matchLeader : strokeLeader;
  const topScoreText = scoringMode === "match"
    ? diff === 0 ? "AS" : `${Math.abs(diff)} UP`
    : category === "around-the-green" || category === "bunker" ? `${score.bluePoints}–${score.redPoints}` : `${score.blueStrokes}–${score.redStrokes}`;
  const topScoreMeta = scoringMode === "match"
    ? `${category === "speed" ? "Omgång" : "Hål"} ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`
    : category === "around-the-green" || category === "bunker" ? "Poäng" : "Slag";
  const resultLeader = scoringMode === "match"
    ? matchLeader
    : category === "around-the-green" || category === "bunker"
      ? pointDiff > 0 ? "blue" : pointDiff < 0 ? "red" : null
      : strokeDiff > 0 ? "blue" : strokeDiff < 0 ? "red" : null;
  const resultScoreText = scoringMode === "match"
    ? diff === 0 ? "AS" : `${Math.abs(diff)}&${holesRemaining}`
    : category === "around-the-green" || category === "bunker"
      ? `${score.bluePoints}–${score.redPoints}`
      : `${score.blueStrokes}–${score.redStrokes}`;
  const tiedHoles = Math.max(0, score.played - score.blue - score.red);
  const isPutting = category === "putting";
  const isPgaPutting = isPutting;
  const isShortGame = category === "around-the-green";
  const isBunker = category === "bunker";
  const isShortGameScoring = isShortGame || isBunker;
  const isApproach = category === "approach";
  const isSpeed = category === "speed";
  const isScoredHole = isPutting || isShortGameScoring;
  const unitLabel = isPutting || isShortGameScoring || isApproach ? "Hål" : "Omgång";
  const setupValid = shortGameLies.length > 0;
  const approachSetupValid = approachRanges.length > 0 && (!approachRanges.includes("custom") || (approachCustomMin >= 30 && approachCustomMax <= 250 && approachCustomMin < approachCustomMax));
  const approachTargetDistance = Number.parseInt(current?.challenge.title ?? "0", 10) || 0;
  const approachLongitudinalPreview = Math.abs(approachLong - approachTargetDistance);
  const approachProximityPreview = Math.sqrt(approachLongitudinalPreview * approachLongitudinalPreview + approachLateral * approachLateral);
  const blueMaxSpeed = Math.max(0, ...holes.map((hole) => hole.blueSpeed ?? 0));
  const redMaxSpeed = Math.max(0, ...holes.map((hole) => hole.redSpeed ?? 0));
  const matchMaxSpeed = Math.max(blueMaxSpeed, redMaxSpeed);
  const compact = step === "play";
  const tight = compact && Boolean(pressureNotice);
  const matchPacing = getFriendMatchPacing(matchLength);
  const friendOpponent = entryFlow === "friend" ? redTeam[0] ?? selectedOthers[0] ?? null : null;
  const selfHistoryKey = user?.id ?? `self:${selfName.toLowerCase()}`;
  const opponentHistoryKey = friendOpponent?.id ?? (friendOpponent ? `guest:${friendOpponent.name.toLowerCase()}` : "");

  useEffect(() => {
    if (entryFlow !== "friend" || step !== "players" || friendsLoading || selectedFriendIds.length || guests.length) return;
    const mostPlayed = getMostPlayedOpponentKey(selfHistoryKey);
    if (!mostPlayed || !friends.some((friend) => friend.other.id === mostPlayed)) return;
    setSelectedFriendIds([mostPlayed]);
  }, [entryFlow, step, friendsLoading, friends, selectedFriendIds.length, guests.length, selfHistoryKey]);
  const resolvedResultWinner: "blue" | "red" | "tie" = resultLeader
    ?? (finalText.startsWith(blueLabel) ? "blue" : finalText.startsWith(redLabel) ? "red" : "tie");

  const glass = "border-slate-300/75 bg-white/68 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/60 bg-gradient-to-br from-blue-100/58 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const redGlass = "border-red-300/60 bg-gradient-to-br from-red-100/54 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const selectedGlass = "border-blue-400/80 bg-gradient-to-br from-blue-100/80 via-white/80 to-blue-50/60 text-slate-950 shadow-[0_18px_44px_-32px_rgba(37,99,235,.4)] ring-2 ring-blue-500/40 backdrop-blur-2xl";
  const selectedRing = selectedGlass;
  const ryderNext = "group relative flex w-full items-center justify-center gap-2 rounded-[20px] border border-blue-700/35 bg-[#2563eb] py-4 font-display text-[23px] leading-none text-white shadow-[0_5px_0_#1d4ed8,0_10px_18px_-12px_rgba(29,78,216,.72)] transition duration-150 hover:bg-[#245bd7] active:translate-y-[2px] active:scale-[.995] active:bg-[#1f55c8] active:shadow-[0_3px_0_#1e40af,0_7px_14px_-12px_rgba(29,78,216,.65)] disabled:translate-y-0 disabled:opacity-30 disabled:shadow-[0_5px_0_#1d4ed8]";

  function goToStep(next: Step) {
    const live = next === "play" || next === "sudden-death" || next === "result";
    const from = step === "play" || step === "sudden-death" || step === "result";
    const doc = document as Document & { startViewTransition?: (callback: () => void) => { finished: Promise<void> } };
    if (!live && !from && doc.startViewTransition) { doc.startViewTransition(() => setStep(next)); return; }
    setStep(next);
  }


  function makeCloudState(nextHoles = holes, nextHoleIndex = holeIndex, nextFinalText = finalText): MatchCloudState | null {
    if (!mode || !category || !matchType) return null;
    return {
      mode,
      category,
      categoryTitle: selectedCategory?.title ?? category,
      matchType,
      scoringMode,
      matchLength,
      holes: nextHoles,
      holeIndex: nextHoleIndex,
      finalText: nextFinalText,
      step: step === "sudden-death" ? "sudden-death" : step === "result" ? "result" : "play",
      suddenDeathRound,
      sdBlue,
      sdRed,
      sdBlueSunk,
      sdRedSunk,
      sdMessage,
      blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
      redTeam: redTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
    };
  }

  useEffect(() => {
    if (!matchSessionId || !user || matchSessionHostId !== user.id || (step !== "play" && step !== "sudden-death" && step !== "result")) return;
    const state = makeCloudState();
    if (!state) return;
    const timer = window.setTimeout(() => {
      void updateMatchMultiplayerState(
        matchSessionId,
        state,
        Math.min(score.played, matchLength),
        step === "result" ? "completed" : "active",
      ).catch(() => undefined);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [matchSessionId, matchSessionHostId, user?.id, step, holes, holeIndex, finalText, suddenDeathRound, sdBlue, sdRed, sdBlueSunk, sdRedSunk, sdMessage, mode, category, matchType, scoringMode, matchLength, blueLabel, redLabel, score.played]);

  // Persist every meaningful in-progress change so leaving the app never resets the match.
  useEffect(() => {
    if (!localMatchReady) return;
    if (step === "result") {
      window.localStorage.removeItem(LOCAL_MATCH_KEY);
      return;
    }
    if (step !== "play" && step !== "sudden-death") return;
    const payload = {
      version: 1, savedAt: Date.now(), step, mode, category, matchType, scoringMode, matchLength, holes, holeIndex, finalText,
      suddenDeathRound, sdMessage, blueStrokes, redStrokes, blueStrokesSelected, redStrokesSelected, bluePoints, redPoints,
      blueSpeed, redSpeed, blueSpeedSelected, redSpeedSelected, speedBaseline,
      shortGameLies, approachRanges, approachCustomMin, approachCustomMax, approachTurn, approachLong, approachLateralDirection, approachLateral,
      selectedFriendIds, guests, blueMateId, selfName, matchRunId,
      blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
      redTeam: redTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
    };
    try { window.localStorage.setItem(LOCAL_MATCH_KEY, JSON.stringify(payload)); } catch { /* storage may be unavailable */ }
  }, [localMatchReady, matchSessionId, step, mode, category, matchType, scoringMode, matchLength, holes, holeIndex, finalText, suddenDeathRound, sdMessage, blueStrokes, redStrokes, blueStrokesSelected, redStrokesSelected, bluePoints, redPoints, blueSpeed, redSpeed, blueSpeedSelected, redSpeedSelected, speedBaseline, shortGameLies, approachRanges, approachCustomMin, approachCustomMax, approachTurn, approachLong, approachLateralDirection, approachLateral, selectedFriendIds, guests, blueMateId, selfName, matchRunId, blueLabel, redLabel]);

  function chooseMode(next: MatchMode) { setMode(next); setSelectedFriendIds([]); setGuests([]); setGuestName(""); setBlueMateId(null); }
  function toggleFriend(id: string) {
    setSelectedFriendIds((ids) => {
      const active = ids.includes(id);
      if (active) return ids.filter((x) => x !== id);
      if (ids.length + guests.length >= neededOthers) return ids;
      const next = [...ids, id];
      if (next.length + guests.length >= neededOthers) window.setTimeout(() => setPickerOpen(false), 0);
      return next;
    });
  }
  function toggleShortGameLie(id: ShortGameLie) { setShortGameLies((items) => items.includes(id) ? items.filter((x) => x !== id) : [...items, id]); }
  function toggleApproachRange(id: ApproachRangeId) {
    setApproachRanges((items) => {
      if (id === "custom") return items.includes("custom") ? [] : ["custom"];
      const base = items.includes("custom") ? [] : items;
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });
  }
  function resetApproachInput(carry = 0) { setApproachLongDirection("short"); setApproachLong(carry); setApproachLateralDirection("left"); setApproachLateral(0); }
  function addGuest() {
    const name = guestName.trim();
    if (!name || selectedOthers.length >= neededOthers) return;
    setGuests((old) => [...old, { id: `guest-${Date.now()}-${old.length}`, name, isGuest: true }]);
    setGuestName("");
    if (selectedOthers.length + 1 >= neededOthers) window.setTimeout(() => setPickerOpen(false), 0);
  }
  function removeGuest(id: string) { setGuests((old) => old.filter((g) => g.id !== id)); if (blueMateId === id) setBlueMateId(null); }
  function startMatch() {
    if (!mode || !teamsReady || !category || !matchType) return;
    const nextRunId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMatchRunId(nextRunId);
    recordedHistoryIdRef.current = null;
    const initialSpeedBaseline = matchType === "driver" ? 140 : 110;
    const nextHoles = isPgaPutting
      ? generatePuttingMatchDistances(matchLength).map((distance) => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies, distance), winner: null as HoleWinner }))
      : isBunker
      ? Array.from({ length: matchLength }, (_, index) => ({ challenge: { eyebrow: "Bunker", title: `Bunkerslag ${index + 1}`, detail: `Närmast flaggan vinner` }, winner: null as HoleWinner }))
      : isShortGame
      ? generateChipMatchDistances(matchLength).map((distance) => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies, distance), winner: null as HoleWinner }))
      : isApproach
        ? generateApproachDistances(matchLength, approachRanges, approachCustomMin, approachCustomMax).map((distance) => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies, distance), winner: null as HoleWinner }))
        : Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies), winner: null as HoleWinner }));
    setHoles(nextHoles);
    setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setSpeedBaseline(initialSpeedBaseline); setBlueSpeed(initialSpeedBaseline); setRedSpeed(initialSpeedBaseline); setBlueSpeedSelected(false); setRedSpeedSelected(false); setApproachTurn("blue"); resetApproachInput(isApproach ? (Number.parseInt(nextHoles[0]?.challenge.title ?? "0", 10) || 0) : 0); setFinalText(""); setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("play");
    setSessionBlueTeam(null); setSessionRedTeam(null);

    if (user && selectedOthers.length > 0 && selectedOthers.every((player) => !player.isGuest)) {
      const state: MatchCloudState = {
        mode,
        category,
        categoryTitle: selectedCategory?.title ?? category,
        matchType,
        scoringMode,
        matchLength,
        holes: nextHoles,
        holeIndex: 0,
        finalText: "",
        blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
        redTeam: redTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
      };
      void createMatchMultiplayerSession(
        selectedOthers.map((player) => ({ id: player.id, displayName: player.name })),
        state,
      ).then((id) => {
        setMatchSessionId(id);
        setMatchSessionHostId(user.id);
        window.history.replaceState(window.history.state, "", `/match?session=${id}`);
      }).catch(() => undefined);
    }
  }
  function advance(next: Hole[]) {
    const s = matchScore(next);
    const d = s.blue - s.red;
    const rem = matchLength - s.played;
    setHoles(next);
    if (scoringMode === "match" && (Math.abs(d) > rem || s.played >= matchLength)) {
      if (d === 0) { if (isSpeed) { setFinalText("Matchen slutar AS"); setStep("result"); return; } setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setStep("sudden-death"); return; }
      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);
      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);
      setNormalWinnerCelebration(d > 0 ? "blue" : "red");
      window.setTimeout(() => { setNormalWinnerCelebration(null); setStep("result"); }, matchPacing.resultCelebrationMs);
      return;
    }
    if (scoringMode === "stroke" && s.played >= matchLength) {
      if (isShortGameScoring) {
        const delta = s.bluePoints - s.redPoints;
        if (delta === 0) { setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setStep("sudden-death"); return; }
        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} poäng`);
      } else {
        const delta = s.redStrokes - s.blueStrokes;
        if (delta === 0) { setSuddenDeathRound(1); setSdBlue(null); setSdRed(null); setSdBlueSunk(false); setSdRedSunk(false); setSdMessage(""); setStep("sudden-death"); return; }
        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} slag`);
      }
      const strokeWinner = isShortGameScoring ? (s.bluePoints > s.redPoints ? "blue" : "red") : (s.blueStrokes < s.redStrokes ? "blue" : "red");
      setNormalWinnerCelebration(strokeWinner);
      window.setTimeout(() => { setNormalWinnerCelebration(null); setStep("result"); }, matchPacing.resultCelebrationMs);
      return;
    }
    setHoleIndex(Math.min(holeIndex + 1, matchLength - 1));
    setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
  }
  function adjustSpeed(tone: "blue" | "red", delta: number) {
    const setter = tone === "blue" ? setBlueSpeed : setRedSpeed;
    setter((value) => Math.max(50, Math.min(220, value + delta)));
    if (tone === "blue") setBlueSpeedSelected(true);
    else setRedSpeedSelected(true);
  }
  function recordSpeed() {
    if (isSubmitting || !blueSpeedSelected || !redSpeedSelected || blueSpeed <= 0 || redSpeed <= 0) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = blueSpeed > redSpeed ? "blue" : redSpeed > blueSpeed ? "red" : "tie";
    const nextBaseline = Math.round((blueSpeed + redSpeed) / 2);
    setTransitionMessage(`Omgång ${registered + 1} registrerad`);
    const next = holes.map((h, i) => i === registered ? { ...h, winner, blueSpeed, redSpeed } : h);
    window.setTimeout(() => {
      advance(next);
      if (registered < matchLength - 1) {
        setSpeedBaseline(nextBaseline);
        setBlueSpeed(nextBaseline); setRedSpeed(nextBaseline);
        setBlueSpeedSelected(false); setRedSpeedSelected(false);
      }
      setTransitionMessage(null); setIsSubmitting(false);
    }, matchPacing.transitionMs);
  }
  function recordWinner(w: Exclude<HoleWinner, null>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    setTransitionMessage(`${unitLabel} ${registered + 1} registrerad`);
    const next = holes.map((h, i) => i === registered ? { ...h, winner: w } : h);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);
  }
  function finishScoredEdit(next: Hole[], registered: number) {
    setHoles(next);
    const target = returnHoleIndex ?? next.findIndex((h) => h.winner === null);
    const nextIndex = target >= 0 ? target : registered;
    setHoleIndex(nextIndex);
    const targetHole = next[nextIndex];
    setBlueStrokes(targetHole?.blueStrokes ?? 1); setRedStrokes(targetHole?.redStrokes ?? 1);
    setBlueStrokesSelected(typeof targetHole?.blueStrokes === "number"); setRedStrokesSelected(typeof targetHole?.redStrokes === "number");
    setBluePoints(typeof targetHole?.bluePoints === "number" ? targetHole.bluePoints : null); setRedPoints(typeof targetHole?.redPoints === "number" ? targetHole.redPoints : null);
    setEditingHoleIndex(null); setReturnHoleIndex(null); setIsSubmitting(false);
    setTransitionMessage(`${unitLabel} ${registered + 1} uppdaterad`);
    window.setTimeout(() => setTransitionMessage(null), 520);
  }
  function adaptNextChallenge(next: Hole[], registered: number, performance: number) {
    if (!category || !mode || registered >= next.length - 1) return next;
    if (category !== "putting" && category !== "around-the-green") return next;
    const currentDistance = holeDistance(next[registered]);
    const plannedNextDistance = holeDistance(next[registered + 1]);
    if (typeof currentDistance !== "number" || typeof plannedNextDistance !== "number") return next;
    const skill = category === "putting" ? "putting" : "chip";
    const band = getPlannedDistanceBand(skill, plannedNextDistance);
    const allowedDistances = allowedDistancesInsideBand(skill, plannedNextDistance, currentDistance);
    const nextDistance = selectNextEngineDistance({
      skill,
      objective: "balanced",
      context: "game",
      min: band.min,
      max: band.max,
      previousDistance: currentDistance,
      previousPerformance: performance,
      allowedDistances,
    });
    const nextIndex = registered + 1;
    const adapted = [...next];
    adapted[nextIndex] = {
      ...adapted[nextIndex],
      challenge: generateChallenge(category, matchType ?? "closest", mode, shortGameLies, nextDistance),
    };
    return adapted;
  }
  function recordPutting() {
    if (isSubmitting || !blueStrokesSelected || !redStrokesSelected) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = blueStrokes < redStrokes ? "blue" : redStrokes < blueStrokes ? "red" : "tie";
    const selfPerformance = puttingPerformanceFromStrokes(blueStrokes);
    if (editingHoleIndex === null) {
      recordEngineOutcome({ skill: "putting", distance: holeDistance(holes[registered]), performance: selfPerformance, context: "game", activityId: "putting-match" });
    }
    const scored = holes.map((h, i) => i === registered ? { ...h, winner, blueStrokes, redStrokes } : h);
    const matchPerformance = (selfPerformance + puttingPerformanceFromStrokes(redStrokes)) / 2;
    const next = editingHoleIndex === null ? adaptNextChallenge(scored, registered, matchPerformance) : scored;
    if (editingHoleIndex !== null) { finishScoredEdit(next, registered); return; }
    setTransitionMessage(`${unitLabel} ${registered + 1} registrerad`);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);
  }
  function recordShortGame() {
    if (isSubmitting || bluePoints === null || redPoints === null) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = bluePoints > redPoints ? "blue" : redPoints > bluePoints ? "red" : "tie";
    const selfPerformance = chipPerformanceFromPoints(bluePoints);
    if (editingHoleIndex === null) {
      recordEngineOutcome({ skill: "chip", distance: holeDistance(holes[registered]), performance: selfPerformance, context: "game", activityId: isBunker ? "bunker-match" : "chip-match" });
    }
    const scored = holes.map((h, i) => i === registered ? { ...h, winner, bluePoints, redPoints } : h);
    const matchPerformance = (selfPerformance + chipPerformanceFromPoints(redPoints)) / 2;
    const next = editingHoleIndex === null ? adaptNextChallenge(scored, registered, matchPerformance) : scored;
    if (editingHoleIndex !== null) { finishScoredEdit(next, registered); return; }
    setTransitionMessage(`${unitLabel} ${registered + 1} registrerad`);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);
  }
  function recordApproach() {
    if (isSubmitting) return;
    const targetDistance = Number.parseInt(current?.challenge.title ?? "0", 10) || 0;
    const longitudinalDelta = approachLong - targetDistance;
    const longitudinal = Math.abs(longitudinalDelta);
    const result: ApproachResult = { longitudinalDirection: longitudinalDelta < 0 ? "short" : "long", longitudinal, lateralDirection: approachLateralDirection, lateral: approachLateral, proximity: Math.sqrt(longitudinal * longitudinal + approachLateral * approachLateral) };
    if (approachTurn === "blue") {
      setHoles((items) => items.map((h, i) => i === holeIndex ? { ...h, blueApproach: result } : h));
      setApproachTurn("red"); resetApproachInput(targetDistance); return;
    }
    const blue = holes[holeIndex]?.blueApproach;
    if (!blue) return;
    setIsSubmitting(true);
    const winner: Exclude<HoleWinner, null> = blue.proximity < result.proximity ? "blue" : result.proximity < blue.proximity ? "red" : "tie";
    const next = holes.map((h, i) => i === holeIndex ? { ...h, redApproach: result, winner } : h);
    const nextTargetDistance = Number.parseInt(holes[holeIndex + 1]?.challenge.title ?? "0", 10) || 0;
    setTransitionMessage(`${unitLabel} ${holeIndex + 1} registrerad`);
    window.setTimeout(() => { advance(next); setApproachTurn("blue"); resetApproachInput(nextTargetDistance); setTransitionMessage(null); setIsSubmitting(false); }, matchPacing.transitionMs);
  }
  function editScoredHole(index: number) {
    if (isSubmitting || !isScoredHole) return;
    const hole = holes[index];
    if (isPutting && (typeof hole?.blueStrokes !== "number" || typeof hole?.redStrokes !== "number")) return;
    if (isShortGameScoring && (typeof hole?.bluePoints !== "number" || typeof hole?.redPoints !== "number")) return;
    setReturnHoleIndex(holeIndex); setEditingHoleIndex(index); setHoleIndex(index);
    setBlueStrokes(hole.blueStrokes ?? 1); setRedStrokes(hole.redStrokes ?? 1);
    setBlueStrokesSelected(typeof hole.blueStrokes === "number"); setRedStrokesSelected(typeof hole.redStrokes === "number");
    setBluePoints(typeof hole.bluePoints === "number" ? hole.bluePoints : null); setRedPoints(typeof hole.redPoints === "number" ? hole.redPoints : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function recordSuddenDeath(outcome: "blue" | "red" | "tie") {
    if (outcome === "tie") {
      setSdMessage("Båda satte den · vi fortsätter");
      window.setTimeout(() => {
        setSuddenDeathRound((r) => r + 1);
        setSdMessage("");
      }, 900);
      return;
    }
    setFinalText(`${outcome === "blue" ? blueLabel : redLabel} vinner i sudden death · närmast hålet`);
    setSdWinnerCelebration(outcome);
    window.setTimeout(() => {
      setSdWinnerCelebration(null);
      setStep("result");
    }, 2300);
  }

  useEffect(() => {
    if (step !== "result" || entryFlow !== "friend" || !friendOpponent || !category || score.played <= 0) return;
    const historyId = matchSessionId ? `cloud:${matchSessionId}` : matchRunId;
    if (recordedHistoryIdRef.current === historyId) return;
    recordedHistoryIdRef.current = historyId;
    recordFriendMatchHistory({
      id: historyId,
      playedAt: new Date().toISOString(),
      selfKey: selfHistoryKey,
      opponentKey: opponentHistoryKey,
      selfName,
      opponentName: friendOpponent.name,
      category,
      length: matchLength,
      winner: resolvedResultWinner,
      finalText,
    });
    setHeadToHead(getFriendHeadToHead(selfHistoryKey, opponentHistoryKey));
  }, [step, entryFlow, friendOpponent?.id, friendOpponent?.name, category, score.played, matchSessionId, matchRunId, selfHistoryKey, opponentHistoryKey, selfName, matchLength, resolvedResultWinner, finalText]);

  function rematch() {
    startMatch();
  }
  function newCompetition() {
    try { window.localStorage.removeItem(LOCAL_MATCH_KEY); } catch {}
    setCategory(null); setMatchType(null); setHoles([]); setHoleIndex(0); setFinalText("");
    setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null);
    setShortGameLies([]); setApproachRanges([]); setApproachTurn("blue"); resetApproachInput();
    setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setMatchSessionId(null); setMatchSessionHostId(null); setSessionBlueTeam(null); setSessionRedTeam(null); window.history.replaceState(window.history.state, "", `/match?flow=${entryFlow}`); setStep("category");
  }
  function reset() {
    try { window.localStorage.removeItem(LOCAL_MATCH_KEY); } catch {}
    setMode(entryFlow === "friend" ? "singles" : null); setSelectedFriendIds([]); setGuests([]); setGuestName(""); setBlueMateId(null); setCategory(null); setMatchType(null);
    setScoringMode("match"); setMatchLength(5); setHoles([]); setHoleIndex(0); setFinalText(""); setBlueStrokes(1); setRedStrokes(1); setBlueStrokesSelected(false); setRedStrokesSelected(false); setBluePoints(null); setRedPoints(null); setShortGameLies([]); setApproachRanges([]); setApproachCustomMin(30); setApproachCustomMax(200); setApproachTurn("blue"); resetApproachInput(); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setMatchSessionId(null); setMatchSessionHostId(null); setSessionBlueTeam(null); setSessionRedTeam(null); window.history.replaceState(window.history.state, "", `/match?flow=${entryFlow}`); setStep("players");
  }
  function back() {
    if (step === "players") return;
    if (step === "teams") { goToStep("players"); return; }
    if (step === "category") { goToStep(entryFlow === "friend" ? "players" : "teams"); return; }
    if (step === "type" || step === "setup" || step === "approach-setup" || step === "scoring" || step === "length") { goToStep("category"); return; }
  }

  function abortMatch() {
    setAbortConfirmOpen(false);
    reset();
  }

  const stepLabel = step === "players" ? (entryFlow === "friend" ? "Välj kompis" : "Lagspel · Format & spelare") : step === "teams" ? "2 · Lag" : step === "scoring" ? "Spelsätt" : step === "category" ? "Kategori" : step === "type" ? "Spel" : step === "setup" ? "Chippning" : step === "approach-setup" ? "Inspel · Avstånd" : "Matchlängd";

  return <main style={LIGHT_SURFACE} className={`mx-auto min-h-screen w-full max-w-md bg-background px-5 text-foreground ${step === "play" ? "pb-4 pt-2" : "pb-16 pt-6"}`}>
    {(step === "play" || step === "sudden-death") ? <button type="button" onClick={() => setAbortConfirmOpen(true)} aria-label="Avbryt spel" title="Avbryt spel" className="fixed right-4 top-[max(10px,env(safe-area-inset-top))] z-[45] inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200/90 bg-red-50/90 text-red-600 shadow-sm backdrop-blur-xl transition active:scale-95"><X className="h-[18px] w-[18px]" /></button> : null}

    {step !== "play" && step !== "sudden-death" && step !== "result" ? <style>{`
      @keyframes sg4MatchStepIn{0%{opacity:.15;transform:translateX(10px) scale(.992)}100%{opacity:1;transform:translateX(0) scale(1)}}
      @keyframes sg4MatchStepOut{0%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(-8px)}}
      ::view-transition-old(root){animation:sg4MatchStepOut 170ms cubic-bezier(.4,0,.2,1) both}
      ::view-transition-new(root){animation:sg4MatchStepIn 230ms cubic-bezier(.2,.8,.2,1) both}
    `}</style> : <style>{`::view-transition-group(root){animation:none}::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}::view-transition-old(root){display:none}`}</style>}
    {step !== "play" && step !== "sudden-death" && step !== "result" ? <header className="flex items-center justify-between">{step === "players" ? <Link to="/spela" aria-label="Tillbaka till Spela" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass}`}>‹</Link> : <button onClick={back} aria-label="Föregående steg" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass}`}>‹</button>}<div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match</p><p className="text-[11px] font-semibold text-slate-700">{stepLabel}</p></div><span aria-hidden="true" className="h-10 w-10" /></header> : null}

    {step === "players" ? <>
      {entryFlow === "friend" ? <>
        <section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">1 mot 1</p><h1 className="mt-1 font-display text-4xl leading-none">Välj kompis</h1><p className="mt-2 text-sm text-slate-600">Välj vem du vill möta. Singles är redan valt.</p></section>
        <section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${blueGlass}`}><PlayerAvatar player={selfPlayer} tone="blue" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Du · Blue</p></div><span className="rounded-xl bg-slate-950 px-2.5 py-2 font-display text-xl text-white">VS</span>{selectedOthers[0] ? <button onClick={() => setPickerOpen(true)} className={`relative flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><PlayerAvatar player={selectedOthers[0]} tone="red" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selectedOthers[0].name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">Red · tryck för att ändra</p>{selectedOthers[0].isGuest ? <span onClick={(e) => { e.stopPropagation(); removeGuest(selectedOthers[0].id); }} className="absolute right-3 top-3 rounded-full bg-white/75 p-1.5 text-slate-500"><X className="h-3.5 w-3.5" /></span> : null}</button> : <button onClick={() => setPickerOpen(true)} className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-red-400 text-red-500"><Plus className="h-6 w-6" /></span><p className="mt-3 font-display text-xl">Välj kompis</p><p className="mt-1 text-[10px] text-slate-500">Vän eller gäst</p></button>}</section>
        <button disabled={!canContinuePlayers} onClick={() => goToStep("category")} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button>
      </> : <>
        <section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Lagspel</p><h1 className="mt-1 font-display text-4xl leading-none">Välj lagformat</h1><p className="mt-2 text-sm text-slate-600">Välj Fourball eller Foursomes och därefter tre spelare.</p></section>
        <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => chooseMode("fourball")} className={`relative rounded-3xl border p-4 text-center ${mode === "fourball" ? selectedRing : glass}`}>{mode === "fourball" ? <SelectedCheck className="absolute right-2 top-2" /> : null}<span className="block font-display text-xl">Fourball</span><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">2 mot 2 · bästa boll</span></button><button onClick={() => chooseMode("foursomes")} className={`relative rounded-3xl border p-4 text-center ${mode === "foursomes" ? selectedRing : glass}`}>{mode === "foursomes" ? <SelectedCheck className="absolute right-2 top-2" /> : null}<span className="block font-display text-xl">Foursomes</span><span className="mt-1 text-[9px] font-bold uppercase text-slate-500">2 mot 2 · vartannat slag</span></button></div>
        {mode ? <><div className="mt-6 flex items-center justify-between"><h2 className="font-display text-2xl">Spelare</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">4 spelare</span></div><button onClick={() => setPickerOpen(true)} className={`mt-3 flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${selectedOthers.length ? redGlass : glass}`}><Users className="h-5 w-5 text-red-600" /><span className="min-w-0 flex-1"><span className="block font-display text-xl">Välj tre spelare</span><span className="text-[10px] text-slate-500">{selectedOthers.length}/3 valda</span></span><ChevronRight className="h-5 w-5 text-slate-500" /></button><button disabled={!canContinuePlayers} onClick={() => goToStep("teams")} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button></> : null}
      </>}
    </> : null}

    {step === "teams" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Bygg lagen</p><h1 className="mt-1 font-display text-4xl">Vem spelar med dig?</h1></section><div className="mt-5 space-y-3">{selectedOthers.map((p) => { const sel = blueMateId === p.id; return <button key={p.id} onClick={() => setBlueMateId(p.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${sel ? selectedRing : glass}`}><PlayerAvatar player={p} tone={sel ? "blue" : "red"} /><span className="min-w-0 flex-1"><span className="block font-display text-xl">{p.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{sel ? "Blue Team" : "Välj som lagkamrat"}</span></span>{sel ? <SelectedCheck className="" /> : null}</button>; })}</div><button disabled={!teamsReady} onClick={() => goToStep("category")} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button></> : null}


    {step === "scoring" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Spelsätt</p><h1 className="mt-1 font-display text-4xl leading-none">Hur räknas resultatet?</h1></section><div className="mt-5 grid grid-cols-1 gap-3"><button onClick={() => setScoringMode("match")} className={`relative rounded-[28px] border p-5 text-left ${scoringMode === "match" ? selectedRing : glass}`}>{scoringMode === "match" ? <SelectedCheck /> : null}<span className="block font-display text-2xl">Match Play</span><span className="mt-2 block text-xs text-slate-600">Ni spelar hål mot hål. Ställningen visas som AS, 1 UP eller 2 UP.</span></button><button onClick={() => setScoringMode("stroke")} className={`relative rounded-[28px] border p-5 text-left ${scoringMode === "stroke" ? selectedRing : glass}`}>{scoringMode === "stroke" ? <SelectedCheck /> : null}<span className="block font-display text-2xl">Slagspel</span><span className="mt-2 block text-xs text-slate-600">Alla resultat räknas ihop. Bäst totalt vinner.</span></button></div><button onClick={() => goToStep("length")} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "category" ? <>
      <section className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Match</p>
        <h1 className="mt-1 font-display text-4xl">Vad ska ni tävla i?</h1>
      </section>
      <div className="mt-6 grid grid-cols-2 gap-3">{CATEGORIES.map((i) => { const active = category === i.id; return <button key={i.id} onClick={() => { setCategory(i.id); setScoringMode("match"); }} className={`relative flex min-h-32 w-full items-center rounded-[26px] border p-4 text-left transition active:scale-[.985] ${active ? selectedRing : glass}`}>
        {active ? <SelectedCheck /> : null}
        <span className={`font-display text-[27px] leading-[.95] ${active ? "text-blue-700" : "text-slate-950"}`}>{i.title}</span>
      </button>; })}</div>
      <button disabled={!category} onClick={() => {
        if (!category) return;
        setScoringMode("match");
        if (category === "putting") { setMatchType("standard"); setMatchLength(5); goToStep("length"); return; }
        if (category === "around-the-green" || category === "bunker") { setMatchType("closest"); setMatchLength(5); goToStep("length"); return; }
        if (category === "approach") { setMatchType("closest"); setApproachRanges([]); goToStep("approach-setup"); return; }
        if (category === "speed") { setMatchType(null); setMatchLength(5); goToStep("type"); return; }
        setMatchType("fairway"); goToStep("length");
      }} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button>
    </> : null}

    {step === "type" && category && !isShortGame && !isApproach ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{selectedCategory?.title}</p><h1 className="mt-1 font-display text-4xl">{isSpeed ? "Välj klubba" : "Välj spel"}</h1>{isPutting ? <p className="mt-2 text-sm text-slate-600">Håla ut från varje avstånd. SG4 räknar resultatet automatiskt.</p> : null}</section><div className="mt-5 space-y-3">{MATCH_TYPES[category].map((i) => { const active = matchType === i.id; return <button key={i.id} onClick={() => { setMatchType(i.id); }} className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left ${active ? selectedRing : glass}`}><span className="min-w-0 flex-1"><span className="block font-display text-2xl">{i.title}</span><span className="mt-1 block text-xs text-slate-600">{i.description}</span></span>{active ? <SelectedCheck className="" /> : null}</button>; })}</div><button disabled={!matchType} onClick={() => { if (isSpeed) { setScoringMode("match"); setMatchLength(5); goToStep("length"); } else goToStep("scoring"); }} className={`sg4-ryder-next mt-6 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "setup" && isShortGame ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Chipp</p><h1 className="mt-1 font-display text-4xl">Setup</h1><p className="mt-2 text-sm text-slate-600">Välj vilka lies som ska ingå.</p></section><div className={`relative mt-5 rounded-3xl border p-5 text-center ${selectedRing}`}><SelectedCheck /><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Spelform</p><p className="mt-1 font-display text-2xl text-slate-900">Closest to the Pin</p><p className="mt-1 text-xs text-slate-600">Ett slag per spelare · närmast flaggan vinner hålet.</p></div><div className="mt-6 flex items-center justify-between"><h2 className="font-display text-2xl">Välj lies</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Välj minst en</span></div><div className="mt-3 grid grid-cols-3 gap-2">{SHORT_GAME_LIES.map((item) => { const active = shortGameLies.includes(item.id); return <button key={item.id} onClick={() => toggleShortGameLie(item.id)} className={`relative flex min-h-20 items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center ${active ? selectedRing : glass}`}><span className="text-sm font-bold">{item.title}</span>{active ? <SelectedCheck className="absolute right-1.5 top-1.5" /> : null}</button>; })}</div>{!setupValid ? <p className="mt-2 text-center text-[10px] font-bold text-amber-700">Välj minst ett lie.</p> : null}<button disabled={!setupValid} onClick={() => goToStep("length")} className={`sg4-ryder-next mt-5 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "approach-setup" && isApproach ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Inspel · Järn & wedge</p><h1 className="mt-1 font-display text-4xl">Välj avstånd</h1><p className="mt-2 text-sm text-slate-600">Välj ett eller flera fasta intervall, eller skapa ett eget.</p></section>{!approachRanges.includes("custom") ? <><div className="mt-5"><div className="flex items-baseline justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Fasta intervall</p><p className="text-[10px] font-semibold text-slate-400">Välj ett eller flera avstånd</p></div><div className="mt-2 grid grid-cols-3 gap-2.5">{([[["50-100","50–100"],["100-150","100–150"],["150-200","150–200"]]] as const)[0].map(([id,label]) => { const active = approachRanges.includes(id); return <button key={id} onClick={() => toggleApproachRange(id)} className={`relative min-h-[74px] rounded-2xl border px-2 py-5 text-center transition-all ${active ? selectedRing + " text-blue-700" : "border-slate-300/80 bg-white/60 text-slate-700 opacity-60"}`}>{active ? <SelectedCheck className="absolute right-1.5 top-1.5" /> : null}<span className="block font-display text-xl leading-none">{label}</span><span className={`mt-1 block text-[9px] font-bold uppercase ${active ? "text-blue-500" : "text-slate-500"}`}>meter</span></button>; })}</div></div><div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-slate-300/80" /><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">eller</span><span className="h-px flex-1 bg-slate-300/80" /></div></> : null}<button onClick={() => toggleApproachRange("custom")} className={`w-full rounded-2xl border px-4 py-4 text-left ${approachRanges.includes("custom") ? "mt-5 " + selectedRing : glass}`}><span className="flex items-center justify-between"><span><span className="block font-display text-xl">Eget intervall</span><span className="mt-1 block text-[10px] font-semibold text-slate-500">30–250 meter</span></span>{approachRanges.includes("custom") ? <SelectedCheck className="" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}</span></button>{approachRanges.includes("custom") ? <div className={`mt-4 rounded-3xl border p-5 ${glass}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Eget intervall</p><p className="mt-1 text-xs text-slate-500">Dra lägsta och högsta avståndet.</p></div><button type="button" onClick={() => setApproachRanges([])} className="shrink-0 rounded-full border border-slate-300 bg-white/80 px-3 py-1.5 text-[9px] font-bold text-slate-600">← Fasta intervall</button></div><p className="mt-4 text-center font-display text-3xl text-slate-900">{approachCustomMin}–{approachCustomMax} m</p><div className="relative mt-5 h-8"><div className="absolute left-0 right-0 top-3 h-2 rounded-full bg-blue-100" /><div className="absolute top-3 h-2 rounded-full bg-blue-400" style={{ left: `${((approachCustomMin - 30) / 220) * 100}%`, right: `${100 - ((approachCustomMax - 30) / 220) * 100}%` }} /><input aria-label="Lägsta avstånd" type="range" min={30} max={249} step={1} value={approachCustomMin} onChange={(e) => setApproachCustomMin(Math.min(Number(e.target.value), approachCustomMax - 1))} className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md" /><input aria-label="Högsta avstånd" type="range" min={31} max={250} step={1} value={approachCustomMax} onChange={(e) => setApproachCustomMax(Math.max(Number(e.target.value), approachCustomMin + 1))} className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md" /></div><div className="mt-1 flex justify-between text-[10px] font-bold text-slate-500"><span>30 m</span><span>250 m</span></div></div> : null}<button disabled={!approachSetupValid} onClick={() => goToStep("length")} className={`sg4-ryder-next mt-5 ${ryderNext}`}>Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "length" && selectedType ? <>{isPutting ? <>
      <section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Putting Match</p><h1 className="mt-1 font-display text-4xl">Välj format</h1></section>
      <div className="mt-5 grid grid-cols-3 gap-3">{([3, 5, 7] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`relative rounded-3xl border px-2 py-6 text-center ${matchLength === v ? selectedRing : glass}`}>{matchLength === v ? <SelectedCheck className="absolute right-1.5 top-1.5" /> : null}<span className="block whitespace-nowrap font-display text-3xl leading-none">{v} <span className="text-xl">hål</span></span>{v === 3 ? <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Snabb</span> : v === 5 ? <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.12em] text-blue-600">Standard</span> : null}</button>)}</div>
      <button onClick={startMatch} className={`mt-5 ${ryderNext}`}><Flag className="h-5 w-5" /> Starta</button>
    </> : <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{isPgaPutting ? "PGA Tour Putting" : scoringMode === "match" ? "Match Play" : "Slagspel"}</p><h1 className="mt-1 font-display text-4xl">{isSpeed ? "Välj antal omgångar" : isShortGameScoring ? "Välj antal hål" : isPgaPutting ? "Matchlängd" : scoringMode === "stroke" ? "Antal hål" : "Bäst av"}</h1>{isPgaPutting ? <p className="mt-2 text-sm text-slate-600">Välj 3, 5 eller 7 hål. Alla längder får en mix av korta, mellanlånga och långa PGA Tour-avstånd.</p> : null}</section><div className="mt-5 grid grid-cols-3 gap-3">{([3, 5, 7] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`relative rounded-3xl border px-3 py-6 ${matchLength === v ? selectedRing : glass}`}>{matchLength === v ? <SelectedCheck className="absolute right-1.5 top-1.5" /> : null}<span className="block whitespace-nowrap font-display text-3xl leading-none">{v} <span className="text-xl">{isSpeed ? "rundor" : "hål"}</span></span>{v === 3 ? <span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Snabb</span> : v === 5 ? <span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600">Standard</span> : null}</button>)}</div><button onClick={startMatch} className={`mt-5 ${ryderNext}`}><Flag className="h-5 w-5" /> Starta</button></>}</> : null}

    {step === "play" && current ? <><header className="relative flex h-9 items-center justify-center"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{scoringMode === "match" ? "Match Play" : "Slagspel"} · {selectedCategory?.title}</p>{editingHoleIndex !== null ? <div className="absolute left-0 top-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">Redigerar</div> : null}</header>
      <style>{`@keyframes sg4PressureEnter{0%{opacity:.25;transform:scale(.985)}55%{opacity:1;transform:scale(1.006)}100%{opacity:1;transform:scale(1)}}@keyframes sg4PressurePulse{0%,100%{transform:scale(1);box-shadow:0 12px 28px -20px rgba(245,158,11,.52),0 0 0 0 rgba(250,204,21,0)}45%{transform:scale(1.012);box-shadow:0 18px 34px -19px rgba(245,158,11,.78),0 0 0 2px rgba(250,204,21,.32)}65%{transform:scale(1.006);box-shadow:0 15px 31px -19px rgba(245,158,11,.66),0 0 0 1px rgba(250,204,21,.18)}}@keyframes sg4PressureWave{0%{transform:translateX(-145%) skewX(-18deg);opacity:0}12%{opacity:.18}48%{opacity:.62}78%{opacity:.18}100%{transform:translateX(245%) skewX(-18deg);opacity:0}}`}</style>
      <section className="mt-1">
        <div className="overflow-hidden rounded-[20px] border border-slate-300/80 bg-white/85 shadow-[0_14px_34px_-28px_rgba(15,23,42,.55)] backdrop-blur-2xl"><div className={`grid grid-cols-[1fr_82px_1fr] items-stretch ${compact ? "min-h-[52px]" : "min-h-[62px]"}`}><div style={liveLeader === "blue" ? { clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" } : undefined} className={`flex min-w-0 items-center px-3 pr-5 ${liveLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[12px] font-black uppercase leading-tight ${liveLeader === "blue" ? "text-white" : "text-slate-700"}`}>{blueLabel}</p>{liveLeader === "blue" ? <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-100">leder</p> : null}</div></div><div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{topScoreMeta}</p><p className={`mt-0.5 font-display text-[22px] leading-none ${liveLeader === "red" ? "text-red-600" : liveLeader === "blue" ? "text-blue-600" : "text-slate-950"}`}>{topScoreText}</p></div><div style={liveLeader === "red" ? { clipPath: "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)" } : undefined} className={`flex min-w-0 items-center justify-end px-3 pl-5 text-right ${liveLeader === "red" ? "bg-red-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[12px] font-black uppercase leading-tight ${liveLeader === "red" ? "text-white" : "text-slate-700"}`}>{redLabel}</p>{liveLeader === "red" ? <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-red-100">leder</p> : null}</div></div></div><div className={`flex items-center justify-center gap-[3px] border-t border-slate-200/80 px-2 ${compact ? "py-1" : "py-2"}`}>{holes.map((h, i) => <span key={`live-${i}`} className={`flex items-center justify-center rounded-full font-bold ${(matchLength as number) === 18 ? "h-3.5 w-3.5 text-[7px]" : "h-5 w-5 text-[8px]"} ${h.winner === "blue" ? "bg-blue-600 text-white" : h.winner === "red" ? "bg-red-600 text-white" : h.winner === "tie" ? "bg-slate-300 text-slate-700" : i === holeIndex ? "border border-slate-500 bg-white text-slate-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>)}</div></div>
        {pressureNotice && scoringMode === "match" ? <div className="mt-2 overflow-hidden"><div key={`pressure-${holeIndex}-${pressureNotice}`} className="relative overflow-hidden rounded-[22px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-5 py-3 text-center text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureEnter 420ms cubic-bezier(.2,.8,.25,1) both, sg4PressurePulse 1.9s ease-in-out 520ms infinite" }}><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[52%] bg-gradient-to-r from-transparent via-white/90 to-transparent blur-[1px]" style={{ animation: "sg4PressureWave 1.18s cubic-bezier(.2,.75,.25,1) 150ms both" }} /><div className="relative"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">Pressläge · Nu gäller det</p><p className="mt-1 text-xs font-bold leading-snug text-slate-800">{pressureNotice}</p></div></div></div> : null}
      </section>
      <section className={`rounded-[32px] border text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl ${tight ? (isPutting ? "mt-1.5 p-3" : "mt-1.5 p-2") : compact ? (isPutting ? "mt-2 p-4" : "mt-2 p-3") : "mt-4 p-5"} ${isPutting || isShortGameScoring || isApproach ? "border-slate-300/90 bg-slate-100/90" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}>{category === "off-the-tee" ? <Target className="mx-auto h-6 w-6 text-blue-600" /> : null}<h1 className={`${isPutting || isShortGameScoring ? "mt-0" : compact ? "mt-1" : "mt-2"} whitespace-nowrap pb-1 font-display leading-[1.05] ${isPutting ? (compact || tight ? "text-5xl" : "text-6xl") : compact ? (isShortGameScoring ? "text-3xl" : "text-4xl") : isShortGameScoring ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}</h1>{!isShortGameScoring && !isPgaPutting ? <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{current.challenge.eyebrow}</p> : null}<p className={`text-xs text-slate-600 ${compact ? "mt-1" : "mt-2"}`}>{current.challenge.detail}</p></section>

      {isPutting ? <section className={tight ? "mt-2" : compact ? "mt-3" : "mt-5"}><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className={`font-display text-2xl ${compact ? "mt-0" : "mt-1"}`}>Antal puttar</h2>{compact ? null : <p className="mt-1 text-[10px] font-semibold text-slate-500">Välj 1–4 puttar för varje spelare.</p>}</div><div className={`space-y-3 ${tight ? "mt-2" : compact ? "mt-3" : "mt-4"}`}>{([[blueLabel, blueStrokes, setBlueStrokes, "blue"], [redLabel, redStrokes, setRedStrokes, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[26px] border ${tight ? "p-2.5" : compact ? "p-3" : "p-4"} ${tone === "blue" ? blueGlass : redGlass}`}><div className="flex items-center justify-between"><p className={`max-w-[68%] truncate font-display text-[34px] leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><p className={`font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{(tone === "blue" ? blueStrokesSelected : redStrokesSelected) ? `${value} ${value === 1 ? "putt" : "puttar"}` : "–"}</p></div><div className="mt-3 grid grid-cols-4 gap-2.5">{([1, 2, 3, 4] as const).map((strokes) => <button key={strokes} type="button" disabled={isSubmitting} onClick={() => { setter(strokes); if (tone === "blue") setBlueStrokesSelected(true); else setRedStrokesSelected(true); }} className={`rounded-xl border px-1 text-center transition-colors focus:outline-none ${compact ? "py-2" : "py-3"} ${value === strokes && (tone === "blue" ? blueStrokesSelected : redStrokesSelected) ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-red-600 bg-red-600 text-white" : "border-slate-300 bg-slate-100 text-slate-700 shadow-sm"}`}><span className="block font-display text-2xl leading-none">{strokes}</span><span className="mt-1 block text-[8px] font-bold uppercase">{strokes === 1 ? "putt" : "puttar"}</span></button>)}</div></div>)}</div><button disabled={isSubmitting || !blueStrokesSelected || !redStrokesSelected} onClick={recordPutting} style={{ viewTransitionName: "none" }} className={`relative isolate flex min-h-[50px] w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl bg-slate-950 px-4 font-display text-xl leading-none text-white disabled:opacity-45 ${tight ? "mt-1" : compact ? "mt-2" : "mt-4"}`}><span style={{ viewTransitionName: "none" }} className="flex min-w-0 shrink-0 items-center justify-center gap-2 whitespace-nowrap leading-none"><span className="whitespace-nowrap">{isSubmitting ? (editingHoleIndex !== null ? "Sparar ändring…" : "Registrerar…") : editingHoleIndex !== null ? `Spara ${unitLabel.toLowerCase()} ${holeIndex + 1}` : `Registrera ${unitLabel.toLowerCase()} ${holeIndex + 1}`}</span>{isSubmitting ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <ChevronRight className="h-5 w-5 shrink-0" />}</span></button></section> : isShortGameScoring ? <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}><div className="text-center"><h2 className="font-display text-2xl">{isBunker ? "Var stannade bollen?" : "Hur nära hålet?"}</h2>{compact ? null : <p className="mt-1 text-[10px] font-semibold text-slate-600">Välj zonen där bollen stannade.</p>}</div><div className={`space-y-3 ${tight ? "mt-2" : compact ? "mt-3" : "mt-4"}`}>{([[blueLabel, bluePoints, setBluePoints, "blue"], [redLabel, redPoints, setRedPoints, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[26px] border ${tight ? "p-2.5" : compact ? "p-3" : "p-4"} ${tone === "blue" ? blueGlass : redGlass}`}><div className="flex items-center justify-between gap-3"><p className={`max-w-[55%] truncate font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><p className={`text-right text-sm font-bold leading-tight ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{value === null ? (isBunker ? "Välj resultat" : "Välj avstånd") : (isBunker ? BUNKER_POINT_ZONES.find((zone) => zone.points === value)?.label : getChipPointZone(value)?.label)}</p></div><div className={`grid grid-cols-3 gap-2.5 ${compact ? "mt-2.5" : "mt-3.5"}`}>{(isBunker ? BUNKER_POINT_ZONES : CHIP_POINT_ZONES).map((zone) => <button key={zone.points} disabled={isSubmitting} onClick={() => setter(zone.points)} className={`min-w-0 rounded-2xl border px-2 text-center font-display text-base leading-tight transition-colors ${compact ? "min-h-[54px] py-3" : "min-h-[64px] py-4"} ${value === zone.points ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-red-600 bg-red-600 text-white" : "border-slate-300 bg-white/90 text-slate-800 shadow-sm"}`}>{zone.label}</button>)}</div></div>)}</div>{compact ? null : <p className="mt-3 text-center text-[10px] font-bold text-slate-600">Samma zon delar hålet · bättre zon vinner</p>}<button disabled={isSubmitting || bluePoints === null || redPoints === null} onClick={recordShortGame} className={`flex min-h-[50px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-950 px-4 font-display text-xl leading-none text-white disabled:opacity-30 ${tight ? "mt-1" : compact ? "mt-2" : "mt-3"}`}>{isSubmitting ? (editingHoleIndex !== null ? "Sparar ändring…" : "Registrerar…") : editingHoleIndex !== null ? `Spara poäng för hål ${holeIndex + 1}` : `Registrera poäng för hål ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : isApproach ? <section className="mt-2"><div className={`rounded-[22px] border px-3 py-2 ${approachTurn === "blue" ? "border-blue-300 bg-blue-50/90" : "border-red-300 bg-red-50/90"}`}><div className="flex items-center gap-3"><PlayerAvatar player={approachTurn === "blue" ? blueTeam[0] : redTeam[0]} tone={approachTurn} /><div className="min-w-0 flex-1"><p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${approachTurn === "blue" ? "text-blue-600" : "text-red-600"}`}>Nu spelar</p><p className="truncate font-display text-2xl leading-none text-slate-950">{approachTurn === "blue" ? blueLabel : redLabel}</p></div><div className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${approachTurn === "blue" ? "bg-blue-600 text-white" : "bg-red-600 text-white"}`}>Din tur</div></div>{approachTurn === "red" && current.blueApproach ? <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] font-semibold text-slate-600">{blueLabel}: {current.blueApproach.proximity.toFixed(1)} m från flaggan</p> : null}</div><div className={`mt-2 rounded-[24px] border ${tight ? "p-1.5" : compact ? "p-2" : "p-3"} ${glass}`}><div><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Carry</p><p className="text-[10px] font-semibold text-slate-400">Mål {approachTargetDistance} m</p></div><div className={`mt-1.5 flex items-center justify-center rounded-2xl bg-slate-100 ${compact ? "py-1" : "py-2"}`}><p className="font-display text-4xl leading-none text-slate-950">{approachLong}<span className="ml-1 text-lg text-slate-500">m</span></p></div><div className="mt-3 grid grid-cols-4 gap-2"><button onClick={() => setApproachLong(Math.max(0, approachLong - 5))} className="rounded-xl border border-slate-300 bg-white/90 py-2 text-sm font-bold text-slate-700">−5</button><button onClick={() => setApproachLong(Math.max(0, approachLong - 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">−1</button><button onClick={() => setApproachLong(Math.min(300, approachLong + 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">+1</button><button onClick={() => setApproachLong(Math.min(300, approachLong + 5))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">+5</button></div><p className="mt-1 text-center text-[9px] font-semibold text-slate-500">{approachLong === approachTargetDistance ? "Exakt längd" : approachLong < approachTargetDistance ? `${approachTargetDistance - approachLong} m kort` : `${approachLong - approachTargetDistance} m lång`}</p></div><div className="my-2.5 h-px bg-slate-200" /><div><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Sidmiss</p><p className="font-display text-2xl text-slate-900">{approachLateral} m</p></div><div className="mt-1.5 grid grid-cols-2 gap-2"><button onClick={() => setApproachLateralDirection("left")} className={`rounded-xl border py-2 text-sm font-bold ${approachLateralDirection === "left" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white/80 text-slate-700"}`}>Vänster</button><button onClick={() => setApproachLateralDirection("right")} className={`rounded-xl border py-2.5 text-sm font-bold ${approachLateralDirection === "right" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white/80 text-slate-700"}`}>Höger</button></div><div className="mt-2 grid grid-cols-[1fr_1fr_1.25fr_1fr_1fr] gap-2"><button onClick={() => setApproachLateral(Math.max(0, approachLateral - 5))} className="rounded-xl border border-slate-300 bg-white/90 py-2 font-bold text-slate-700">−5</button><button onClick={() => setApproachLateral(Math.max(0, approachLateral - 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">−1</button><div className="flex items-center justify-center rounded-xl bg-slate-100 px-2 font-display text-3xl text-slate-950">{approachLateral}</div><button onClick={() => setApproachLateral(Math.min(100, approachLateral + 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">+1</button><button onClick={() => setApproachLateral(Math.min(100, approachLateral + 5))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">+5</button></div></div><div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2"><span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Avstånd från flaggan</span><span className="font-display text-2xl text-slate-950">{approachProximityPreview.toFixed(1)} m</span></div></div><button disabled={isSubmitting} onClick={recordApproach} className="mt-2 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 font-display text-xl leading-none text-white disabled:opacity-30">Spara slag <ChevronRight className="h-5 w-5" /></button></section> : isSpeed ? <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Ball speed</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">Gemensam utgångspunkt {speedBaseline} mph · justera till exakt värde</p></div><div className={`space-y-3 ${compact ? "mt-3" : "mt-4"}`}>{([[blueLabel, blueSpeed, "blue"], [redLabel, redSpeed, "red"]] as const).map(([label, value, tone]) => { const selected = tone === "blue" ? blueSpeedSelected : redSpeedSelected; return <div key={tone} className={`rounded-[26px] border-2 ${compact ? "p-3" : "p-4"} ${tone === "blue" ? "border-blue-300 bg-blue-50/75" : "border-red-300 bg-red-50/75"}`}><div className="flex items-center justify-between gap-3"><p className={`min-w-0 truncate font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><p className={`shrink-0 font-display text-3xl leading-none transition-colors ${selected ? tone === "blue" ? "text-blue-700" : "text-red-700" : "text-slate-400"}`}>{value}<span className="ml-1 text-xs font-bold uppercase">mph</span></p></div><div className="mt-3 grid grid-cols-4 gap-2">{([-5, -1, 1, 5] as const).map((delta) => <button key={delta} type="button" disabled={isSubmitting} onClick={() => adjustSpeed(tone, delta)} className={`rounded-xl border py-2.5 text-sm font-bold shadow-sm transition active:scale-[.97] ${tone === "blue" ? "border-blue-200 bg-white text-blue-700" : "border-red-200 bg-white text-red-700"}`}>{delta > 0 ? `+${delta}` : delta}</button>)}</div></div>; })}</div><button disabled={isSubmitting || !blueSpeedSelected || !redSpeedSelected} onClick={recordSpeed} className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 font-display text-xl leading-none text-white disabled:opacity-30 ${tight ? "mt-1" : compact ? "mt-2" : "mt-4"}`}>{isSubmitting ? "Registrerar…" : `Registrera omgång ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : <section className={tight ? "mt-1" : compact ? "mt-2" : "mt-4"}><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Vem vann?</h2><p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</p></div><div className="mt-4 grid grid-cols-2 gap-4"><button disabled={isSubmitting} onClick={() => recordWinner("blue")} className={`rounded-3xl border p-5 font-display text-xl text-blue-700 disabled:opacity-40 ${blueGlass}`}>{blueLabel}</button><button disabled={isSubmitting} onClick={() => recordWinner("red")} className={`rounded-3xl border p-5 font-display text-xl text-red-700 disabled:opacity-40 ${redGlass}`}>{redLabel}</button></div><button disabled={isSubmitting} onClick={() => recordWinner("tie")} className={`mt-3 w-full rounded-2xl border py-3.5 text-sm font-bold disabled:opacity-40 ${glass}`}>Delat · AS</button></section>}

      {isScoredHole && lastScoredHoleIndex >= 0 ? <button type="button" disabled={isSubmitting} onClick={() => editScoredHole(lastScoredHoleIndex)} className="mt-2 w-full py-2 text-center text-[10px] font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 disabled:opacity-40">Redigera senaste {unitLabel.toLowerCase()}</button> : null}</> : null}

    {step === "sudden-death" ? <>
      <style>{`
        @keyframes sdPageIn{0%{opacity:0;transform:scale(1.018)}100%{opacity:1;transform:scale(1)}}
        @keyframes sdBlueRush{0%{transform:translateX(-120%)}42%{transform:translateX(4%)}58%{transform:translateX(-1.5%)}72%{transform:translateX(.6%)}100%{transform:translateX(0)}}
        @keyframes sdRedRush{0%{transform:translateX(120%)}42%{transform:translateX(-4%)}58%{transform:translateX(1.5%)}72%{transform:translateX(-.6%)}100%{transform:translateX(0)}}
        @keyframes sdImpact{0%,34%{opacity:0;transform:translate(-50%,-50%) scale(.2)}45%{opacity:1;transform:translate(-50%,-50%) scale(1.3)}68%{opacity:.9;transform:translate(-50%,-50%) scale(.92)}100%{opacity:.25;transform:translate(-50%,-50%) scale(1.06)}}
        @keyframes sdHeroIn{0%,48%{opacity:0;transform:translateY(16px) scale(.94)}72%{opacity:1;transform:translateY(0) scale(1.02)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes sdGlassFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-10px,0)}}
        @keyframes sdWinnerTakeover{0%{clip-path:circle(0% at 50% 50%)}100%{clip-path:circle(78% at 50% 50%)}}
        @keyframes sdBurstRing{0%{opacity:0;transform:scale(.15)}18%{opacity:1}100%{opacity:0;transform:scale(2.8)}}
        @keyframes sdRay{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateY(0) scaleY(.2)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--r)) translateY(-130px) scaleY(1)}}
        @keyframes sdShard{0%{opacity:0;transform:translate3d(0,-15vh,0) rotate(0deg)}12%{opacity:1}100%{opacity:0;transform:translate3d(var(--x),110vh,0) rotate(var(--rot))}}
        @keyframes sdGlowPulse{0%,100%{opacity:.42;transform:scale(.94)}50%{opacity:.8;transform:scale(1.08)}}
      `}</style>

      <div className="fixed inset-0 z-40 overflow-hidden bg-[#07101f] text-white">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_18%_24%,rgba(125,211,252,.35),transparent_32%),linear-gradient(145deg,#2563eb_0%,#1d4ed8_48%,#0b1f5f_100%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_82%_24%,rgba(254,202,202,.28),transparent_32%),linear-gradient(215deg,#ef4444_0%,#dc2626_48%,#641313_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.13),transparent_28%)]" />
        <div className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2 bg-white/35 shadow-[0_0_32px_rgba(255,255,255,.38)]" />
        <div className="absolute left-[8%] top-[18%] h-28 w-28 rounded-full border border-white/15 bg-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-3xl" style={{animation:'sdGlassFloat 5s ease-in-out infinite'}} />
        <div className="absolute right-[7%] bottom-[18%] h-36 w-36 rounded-full border border-white/15 bg-white/[.06] shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_20px_70px_rgba(0,0,0,.2)] backdrop-blur-3xl" style={{animation:'sdGlassFloat 6.2s 600ms ease-in-out infinite'}} />

        <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-[max(22px,env(safe-area-inset-top))]" style={{animation:'sdPageIn 650ms ease-out both'}}>
          <div className="flex items-center justify-between pt-3">
            <span className="max-w-[40%] truncate font-display text-2xl text-white drop-shadow-sm">{blueLabel}</span>
            <span className="rounded-full border border-white/20 bg-white/[.10] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,.22)] backdrop-blur-2xl">Avgörande {suddenDeathRound}</span>
            <span className="max-w-[40%] truncate text-right font-display text-2xl text-white drop-shadow-sm">{redLabel}</span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-7 text-center">
            <div className="relative w-full overflow-hidden rounded-[34px] border border-white/20 bg-white/[.10] px-5 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_28px_80px_rgba(0,0,0,.28)] backdrop-blur-3xl">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
              <div className="pointer-events-none absolute -left-14 -top-16 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />
              <div className="pointer-events-none absolute -right-14 -bottom-16 h-40 w-40 rounded-full bg-red-300/20 blur-3xl" />
              <p className="relative text-[10px] font-black uppercase tracking-[0.42em] text-white/70">AVGÖRANDE</p>
              <h1 className="relative mt-2 font-display text-6xl leading-[.88] text-white drop-shadow-[0_6px_22px_rgba(0,0,0,.3)]">SUDDEN<br/>DEATH</h1>
              <div className="relative mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <p className="relative mt-5 font-display text-5xl leading-none text-white">11 M</p>
              <p className="relative mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">från hålet</p>
              <p className="relative mt-4 text-sm font-bold text-white/90">Närmast hålet vinner matchen</p>
            </div>
          </div>

          <div className="pb-[max(0px,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Vem vann?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => recordSuddenDeath("blue")} className="group relative min-h-28 overflow-hidden rounded-[28px] border border-blue-100/25 bg-white/[.11] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_18px_46px_rgba(3,18,56,.28)] backdrop-blur-3xl transition duration-200 active:scale-[.97]">
                <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-blue-100/80 to-transparent" />
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/80">Närmast</span>
                <span className="mt-3 block truncate font-display text-2xl text-white">{blueLabel}</span>
              </button>
              <button onClick={() => recordSuddenDeath("red")} className="group relative min-h-28 overflow-hidden rounded-[28px] border border-red-100/25 bg-white/[.11] px-3 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_18px_46px_rgba(56,3,3,.28)] backdrop-blur-3xl transition duration-200 active:scale-[.97]">
                <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-red-100/80 to-transparent" />
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-red-100/80">Närmast</span>
                <span className="mt-3 block truncate font-display text-2xl text-white">{redLabel}</span>
              </button>
            </div>
            <button onClick={() => recordSuddenDeath("tie")} className="relative mt-3 w-full overflow-hidden rounded-[24px] border border-white/20 bg-white/[.08] px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.2)] backdrop-blur-3xl transition active:scale-[.985]">
              <span className="font-display text-xl text-white">Lika</span>
              <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">Båda satte den</span>
            </button>
            {sdMessage ? <div className="mt-3 rounded-[22px] border border-white/20 bg-white/[.09] p-3 text-center text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-3xl">{sdMessage}</div> : null}
          </div>
        </div>
      </div>

      {showSuddenDeathIntro ? <div className="fixed inset-0 z-50 overflow-hidden bg-[#050a12]">
        <div className="absolute inset-y-0 left-0 w-[57%] bg-[radial-gradient(circle_at_20%_32%,rgba(186,230,253,.38),transparent_28%),linear-gradient(135deg,#1d4ed8,#0b2b72)]" style={{animation:'sdBlueRush 1.7s cubic-bezier(.18,.82,.24,1) both',clipPath:'polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)'}} />
        <div className="absolute inset-y-0 right-0 w-[57%] bg-[radial-gradient(circle_at_80%_32%,rgba(254,202,202,.34),transparent_28%),linear-gradient(225deg,#dc2626,#711515)]" style={{animation:'sdRedRush 1.7s cubic-bezier(.18,.82,.24,1) both',clipPath:'polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)'}} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.14),transparent_26%)]" />
        <div className="absolute left-1/2 top-1/2 z-10 h-44 w-44 rounded-full border border-white/30 bg-white/[.08] shadow-[0_0_70px_rgba(255,255,255,.24),inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-2xl" style={{animation:'sdImpact 2s ease-out both'}} />
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 text-center" style={{animation:'sdHeroIn 2.25s ease-out both'}}>
          <div className="relative overflow-hidden rounded-[36px] border border-white/25 bg-white/[.09] px-8 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,.3),0_30px_90px_rgba(0,0,0,.38)] backdrop-blur-3xl">
            <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            <p className="text-[10px] font-black uppercase tracking-[0.42em] text-white/70">AVGÖRANDE</p>
            <h1 className="mt-2 font-display text-6xl leading-[.88] text-white">SUDDEN<br/>DEATH</h1>
            <p className="mt-5 text-sm font-black text-white/90">11 meter · närmast hålet vinner</p>
          </div>
        </div>
      </div> : null}

      {sdWinnerCelebration ? <div className={`fixed inset-0 z-[60] overflow-hidden ${sdWinnerCelebration === "blue" ? "bg-[#082a72]" : "bg-[#741717]"}`} style={{animation:'sdWinnerTakeover 760ms cubic-bezier(.2,.8,.2,1) both'}}>
        <div className={`absolute inset-0 ${sdWinnerCelebration === "blue" ? "bg-[radial-gradient(circle_at_50%_42%,rgba(147,197,253,.44),transparent_35%),linear-gradient(145deg,#2563eb,#0b2b72)]" : "bg-[radial-gradient(circle_at_50%_42%,rgba(254,202,202,.38),transparent_35%),linear-gradient(215deg,#ef4444,#741717)]"}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.13),transparent_30%)]" />

        {[0,1,2].map((burst) => <div key={`burst-${burst}`} className="absolute" style={{left:`${24 + burst * 26}%`,top:`${24 + (burst % 2) * 22}%`,width:12,height:12}}>
          <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" style={{animation:`sdBurstRing 1.35s ${.18 + burst * .24}s ease-out both`}} />
          {Array.from({length:12}).map((_, ray) => <span key={ray} className="absolute left-1/2 top-1/2 h-11 w-[2px] origin-bottom rounded-full bg-gradient-to-t from-white/90 to-white/0" style={{['--r' as any]:`${ray * 30}deg`,animation:`sdRay 1.25s ${.18 + burst * .24 + ray * .012}s ease-out both`}} />)}
        </div>)}

        {Array.from({length:30}).map((_, i) => <span key={`shard-${i}`} className="absolute top-[-8%] h-2.5 w-1 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,.45)]" style={{left:`${4 + (i * 13) % 92}%`,['--x' as any]:`${(i % 2 ? 1 : -1) * (18 + (i % 5) * 9)}px`,['--rot' as any]:`${180 + (i % 7) * 55}deg`,animation:`sdShard ${1.55 + (i % 5) * .12}s ${(i % 10) * .055}s cubic-bezier(.15,.6,.2,1) both`}} />)}

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
          <div className="absolute h-72 w-72 rounded-full bg-white/15 blur-3xl" style={{animation:'sdGlowPulse 2s ease-in-out infinite'}} />
          <div className="relative overflow-hidden rounded-[38px] border border-white/25 bg-white/[.10] px-8 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_34px_100px_rgba(0,0,0,.3)] backdrop-blur-3xl">
            <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/65">SUDDEN DEATH</p>
            <p className="mt-4 font-display text-6xl leading-none">{sdWinnerCelebration === "blue" ? blueLabel : redLabel}</p>
            <div className="mx-auto mt-5 h-px w-20 bg-white/45" />
            <p className="mt-5 font-display text-4xl">VINNER</p>
            <p className="mt-4 text-sm font-bold text-white/75">Närmast hålet · matchen avgjord</p>
          </div>
        </div>
      </div> : null}
    </> : null}

    {normalWinnerCelebration ? <div className={`fixed inset-0 z-[70] overflow-hidden ${normalWinnerCelebration === "blue" ? "bg-[#061d57]" : "bg-[#5f1018]"}`}>
      <style>{`@keyframes winTakeover{0%{opacity:0;transform:scale(1.04)}18%{opacity:1}100%{opacity:1;transform:scale(1)}}@keyframes winGlassIn{0%{opacity:0;transform:translateY(22px) scale(.92)}45%{opacity:1;transform:translateY(-4px) scale(1.03)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes winBurst{0%{opacity:0;transform:scale(.15)}22%{opacity:1}100%{opacity:0;transform:scale(3.2)}}@keyframes winShard{0%{opacity:0;transform:translate3d(0,-12vh,0) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate3d(var(--wx),112vh,0) rotate(var(--wr))}}`}</style>
      <div className={`absolute inset-0 ${normalWinnerCelebration === "blue" ? "bg-[radial-gradient(circle_at_50%_38%,rgba(147,197,253,.46),transparent_34%),linear-gradient(145deg,#2563eb,#071b4f)]" : "bg-[radial-gradient(circle_at_50%_38%,rgba(254,202,202,.42),transparent_34%),linear-gradient(215deg,#ef4444,#591019)]"}`} style={{animation:'winTakeover 620ms cubic-bezier(.2,.8,.2,1) both'}} />
      {[0,1,2].map((b) => <span key={b} className="absolute rounded-full border border-white/70" style={{left:`${24+b*26}%`,top:`${25+(b%2)*24}%`,width:54,height:54,animation:`winBurst 1.25s ${.15+b*.2}s ease-out both`}} />)}
      {Array.from({length:26}).map((_,i)=><span key={i} className="absolute top-[-8%] h-3 w-1 rounded-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,.45)]" style={{left:`${4+(i*17)%92}%`,['--wx' as any]:`${(i%2?1:-1)*(16+(i%5)*10)}px`,['--wr' as any]:`${180+(i%7)*60}deg`,animation:`winShard ${1.45+(i%5)*.13}s ${(i%9)*.06}s cubic-bezier(.15,.6,.2,1) both`}} />)}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 text-center text-white">
        <div className="relative overflow-hidden rounded-[40px] border border-white/25 bg-white/[.11] px-8 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,.38),0_36px_110px_rgba(0,0,0,.35)] backdrop-blur-3xl" style={{animation:'winGlassIn 820ms 180ms cubic-bezier(.2,.8,.2,1) both'}}>
          <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/65">MATCH AVGJORD</p>
          <p className="mt-4 font-display text-6xl leading-none">{normalWinnerCelebration === "blue" ? blueLabel : redLabel}</p>
          <div className="mx-auto mt-5 h-px w-20 bg-white/45" />
          <p className="mt-5 font-display text-4xl">VINNER</p>
        </div>
      </div>
    </div> : null}

    {step === "result" ? <><section className="mt-4 space-y-3">{(["blue","red"] as const).map(side => <div key={side}><p className="text-sm font-bold">{side === "blue" ? blueLabel : redLabel}</p>{isPutting ? <PuttingMatchReview holes={holes.filter(h => h.winner).map(h => ({ distance: holeDistance(h), yourValue: side === "blue" ? h.blueStrokes : h.redStrokes, completed: true }))} /> : <ActivityReview activity="match" input={isShortGameScoring ? shortGameReviewInput(side === "blue" ? blueLabel : redLabel, holes.filter(h => h.winner).map(h => ({distance: holeDistance(h), points: (side === "blue" ? h.bluePoints : h.redPoints) ?? 0})), isBunker) : {title: side === "blue" ? blueLabel : redLabel, outcomes: rawActivityOutcomes(holes.filter(h => h.winner).map(h => isApproach ? (side === "blue" ? h.blueApproach : h.redApproach) : isSpeed ? {ballSpeed:side === "blue" ? h.blueSpeed : h.redSpeed} : {result: h.winner === side ? "Vunnet hål" : h.winner === "tie" ? "Delat hål" : "Förlorat hål"}))}} />}</div>)}</section>{entryFlow === "friend" && friendOpponent && headToHead.played > 0 ? <div className="mt-5 rounded-[20px] border border-slate-200/90 bg-white/72 px-4 py-3 text-center shadow-sm backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Inbördes</p><p className="mt-1 font-display text-xl text-slate-950">{headToHead.wins}–{headToHead.losses}{headToHead.ties ? ` · ${headToHead.ties} lika` : ""}</p><p className="mt-0.5 text-[10px] text-slate-500">{selfName} mot {friendOpponent.name} · {headToHead.played} matcher</p></div> : null}<section className="mt-6 overflow-hidden rounded-[28px] border border-slate-300/85 bg-white/90 shadow-[0_22px_52px_-30px_rgba(15,23,42,.5)] backdrop-blur-2xl"><div className="px-4 pt-4 text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selectedCategory?.title} · Matchresultat</p></div><div className="mt-3 grid min-h-[104px] grid-cols-[1fr_88px_1fr] items-stretch"><div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pr-5 text-center ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{blueLabel}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "blue" ? "text-white" : "text-blue-700"}`}>{scoringMode === "match" ? score.blue : isShortGameScoring ? score.bluePoints : score.blueStrokes}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "blue" ? "text-blue-100" : "text-slate-500"}`}>{scoringMode === "match" ? (isSpeed ? "vunna omg." : "vunna hål") : isShortGameScoring ? "poäng" : "slag"}</p></div><div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><Trophy className="mb-1 h-4 w-4 text-amber-500" /><p className="font-display text-[26px] leading-none text-slate-950">{resultScoreText}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Slutresultat</p></div><div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col items-center justify-center px-3 pl-5 text-center ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{redLabel}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "red" ? "text-white" : "text-red-700"}`}>{scoringMode === "match" ? score.red : isShortGameScoring ? score.redPoints : score.redStrokes}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "red" ? "text-red-100" : "text-slate-500"}`}>{scoringMode === "match" ? (isSpeed ? "vunna omg." : "vunna hål") : isShortGameScoring ? "poäng" : "slag"}</p></div></div><div className="border-t border-slate-200 px-4 py-3 text-center"><p className="text-xs font-bold text-slate-800">{finalText}</p>{isSpeed && matchMaxSpeed > 0 ? <div className="mx-auto mt-3 rounded-2xl bg-slate-950 px-4 py-3 text-white"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60">Högsta speed i matchen</p><p className="mt-1 font-display text-3xl">{matchMaxSpeed.toFixed(1)} mph</p><p className="mt-1 text-[9px] text-white/65">{blueLabel}: {blueMaxSpeed.toFixed(1)} · {redLabel}: {redMaxSpeed.toFixed(1)}</p></div> : null}{scoringMode === "match" ? <p className="mt-1 text-[10px] font-semibold text-slate-500">{blueLabel} vann {score.blue} {isSpeed ? "omgångar" : "hål"} · {redLabel} vann {score.red} {isSpeed ? "omgångar" : "hål"}{tiedHoles ? ` · ${tiedHoles} delade` : ""}</p> : null}</div></section><section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p><h2 className="font-display text-2xl">Hela tävlingen</h2></div><p className="text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</p></div><div className={`overflow-hidden rounded-[24px] border ${glass}`}><div className="overflow-x-auto"><div className="min-w-max"><div className="grid" style={{ gridTemplateColumns: `minmax(92px,1.35fr) repeat(${matchLength},${isApproach ? 58 : 48}px)` }}><div className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">Hål</div>{holes.map((_, i) => <div key={`rh-${i}`} className="border-b border-r border-slate-200 bg-slate-100 py-2 text-center text-[10px] font-bold text-slate-700">{i + 1}</div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-blue-700 truncate">{blueLabel}</div>{holes.map((h, i) => { const value = isShortGameScoring ? h.bluePoints : isApproach ? h.blueApproach?.proximity : isPutting ? h.blueStrokes : isSpeed ? h.blueSpeed : undefined; return <div key={`rb-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 py-2 text-xs font-bold text-blue-700"><span className={`inline-flex min-w-[34px] items-center justify-center rounded-md px-1.5 py-1 ${h.winner === "blue" ? "bg-blue-600 text-white" : ""}`}>{typeof value === "number" ? isShortGameScoring ? `${value}p` : isApproach ? `${value.toFixed(1)}m` : isSpeed ? `${value.toFixed(1)}` : value : h.winner === "blue" ? "✓" : h.winner === "tie" ? "AS" : "–"}</span></div>; })}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-red-700 truncate">{redLabel}</div>{holes.map((h, i) => { const value = isShortGameScoring ? h.redPoints : isApproach ? h.redApproach?.proximity : isPutting ? h.redStrokes : isSpeed ? h.redSpeed : undefined; return <div key={`rr-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 py-2 text-xs font-bold text-red-700"><span className={`inline-flex min-w-[34px] items-center justify-center rounded-md px-1.5 py-1 ${h.winner === "red" ? "bg-red-600 text-white" : ""}`}>{typeof value === "number" ? isShortGameScoring ? `${value}p` : isApproach ? `${value.toFixed(1)}m` : isSpeed ? `${value.toFixed(1)}` : value : h.winner === "red" ? "✓" : h.winner === "tie" ? "AS" : "–"}</span></div>; })}<div className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">Vinnare</div>{holes.map((h, i) => <div key={`rw-${i}`} className={`border-r border-slate-200 bg-slate-50 py-2 text-center text-[9px] font-bold ${h.winner === "blue" ? "text-blue-700" : h.winner === "red" ? "text-red-700" : "text-slate-600"}`}>{h.winner === "blue" ? "B" : h.winner === "red" ? "R" : "AS"}</div>)}</div></div></div></div></section><section className="mt-5 space-y-3"><button onClick={rematch} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch</button><button onClick={newCompetition} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl text-slate-900 ${glass}`}><Trophy className="h-5 w-5" /> Match i annan kategori</button><button onClick={reset} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl text-slate-900 ${glass}`}><Home className="h-5 w-5" /> Hem</button></section></> : null}

    {abortConfirmOpen ? <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl"><p className="font-display text-3xl leading-none text-slate-950">Avbryt spelet?</p><p className="mt-3 text-sm leading-relaxed text-slate-600">Är du säker på att du vill avbryta spelet? Det går inte att komma tillbaka till den här matchen.</p><div className="mt-5 space-y-2.5"><button type="button" onClick={() => setAbortConfirmOpen(false)} className="w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white">Fortsätt spela</button><button type="button" onClick={abortMatch} className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-700">Avbryt spel</button></div></div></div> : null}

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}><SheetContent side="bottom" className="mx-auto max-h-[82vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8"><SheetHeader><SheetTitle>{entryFlow === "friend" ? "Välj kompis" : "Välj spelare"}</SheetTitle></SheetHeader><div className="mt-4 space-y-3"><div className={`rounded-2xl border p-3 ${glass}`}><div className="flex items-center gap-2"><input value={guestName} onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} placeholder="Lägg till gästspelare" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button onClick={addGuest} disabled={!guestName.trim() || selectedOthers.length >= neededOthers} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button></div></div>{guests.map((g) => <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-3"><PlayerAvatar player={g} tone="red" /><span className="flex-1 text-sm font-semibold">{g.name}</span><button onClick={() => removeGuest(g.id)}><X className="h-4 w-4 text-slate-500" /></button></div>)}{loadingSocial ? <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : friends.map((f) => { const active = selectedFriendIds.includes(f.other.id); const full = selectedOthers.length >= neededOthers && !active; return <button key={f.id} disabled={full} onClick={() => toggleFriend(f.other.id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-left disabled:opacity-35"><PlayerAvatar player={{ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }} tone="red" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.other.displayName}</span>{active ? <Check className="h-5 w-5 text-red-600" /> : null}</button>; })}{mode !== "singles" && selectedOthers.length < neededOthers ? <button onClick={() => setPickerOpen(false)} className="w-full rounded-2xl border border-slate-300 bg-white/70 py-3.5 text-sm font-bold text-slate-700">Stäng · {selectedOthers.length}/{neededOthers}</button> : null}</div></SheetContent></Sheet>
  </main>;
}
