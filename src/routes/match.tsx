import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Flag, Minus, Plus, RotateCcw, Target, Trophy, User, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export const Route = createFileRoute("/match")({
  head: () => ({ meta: [{ title: "Match Play | SG4" }] }),
  component: MatchPlayPage,
});

type Step = "players" | "teams" | "scoring" | "category" | "type" | "setup" | "approach-setup" | "length" | "play" | "result";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type HoleWinner = "blue" | "red" | "tie" | null;
type MatchMode = "singles" | "fourball" | "foursomes";
type ScoringMode = "match" | "stroke";
type MatchLength = 5 | 9 | 18;
type Player = { id: string; name: string; avatarUrl?: string | null; isSelf?: boolean; isGuest?: boolean };
type Challenge = { eyebrow: string; title: string; detail: string };
type ApproachResult = { longitudinalDirection: "short" | "long"; longitudinal: number; lateralDirection: "left" | "right"; lateral: number; proximity: number };
type Hole = { challenge: Challenge; winner: HoleWinner; blueStrokes?: number; redStrokes?: number; bluePoints?: number; redPoints?: number; blueApproach?: ApproachResult; redApproach?: ApproachResult };
type ShortGameLie = "fairway" | "rough" | "bunker";
type ApproachRangeId = "50-100" | "100-150" | "150-200" | "custom";

const CATEGORIES = [
  { id: "off-the-tee", title: "Utslag", subtitle: "Off the Tee", description: "Driver, fairway, längd och bollflykt." },
  { id: "approach", title: "Inspel", subtitle: "Approach", description: "Closest to Pin med varierade avstånd och exakt proximity." },
  { id: "around-the-green", title: "Närspel", subtitle: "Around the Green", description: "Närmast flaggan från fairway, rough och bunker." },
  { id: "putting", title: "Puttning", subtitle: "Putting", description: "Håla ut och låt SG4 räkna resultatet automatiskt." },
] as const;

const MATCH_TYPES: Record<MatchCategory, Array<{ id: string; title: string; description: string }>> = {
  "off-the-tee": [
    { id: "fairway", title: "30 m Fairway Challenge", description: "Längsta slaget inom den 30 m breda fairwaykorridoren vinner hålet." },
  ],
  approach: [
    { id: "closest", title: "Closest to Pin", description: "Samma målavstånd för båda. Närmast flaggan vinner hålet." },
  ],
  "around-the-green": [
    { id: "closest", title: "Closest to the Pin", description: "Ett slag mot flaggan. Poäng efter avståndszon – högst poäng vinner hålet." },
  ],
  putting: [
    { id: "pga-tour", title: "Hela puttspelet", description: "Baserat på PGA Tour-avstånd · mix av korta, mellanlånga och långa puttar · 5, 9 eller 18 hål" },
    { id: "short", title: "Korta puttar", description: "1–5 meter" },
    { id: "mix", title: "Mixade avstånd", description: "1–10 meter" },
    { id: "lag", title: "Långa puttar", description: "8–22 meter" },
  ],
};

const SHORT_GAME_LIES: Array<{ id: ShortGameLie; title: string }> = [
  { id: "fairway", title: "Fairway" },
  { id: "rough", title: "Rough" },
  { id: "bunker", title: "Bunker" },
];
const POINT_ZONES = [
  { points: 4, label: "Sänkt" }, { points: 3, label: "Inom 1 m" }, { points: 2, label: "Inom 2 m" }, { points: 1, label: "Inom 3 m" }, { points: 0, label: "Över 3 m" },
] as const;

const PGA_PUTTING_DISTANCES = [1.5, 12, 0.6, 4, 1.2, 16, 8, 3, 6, 9, 0.9, 7, 2.1, 3.5, 10, 1.8, 5, 2.4] as const;
function shuffleValues<T>(items: readonly T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
function generatePgaPuttingDistances(length: 5 | 9 | 18) {
  const short = shuffleValues(PGA_PUTTING_DISTANCES.filter((d) => d <= 2.4));
  const medium = shuffleValues(PGA_PUTTING_DISTANCES.filter((d) => d > 2.4 && d <= 6));
  const long = shuffleValues(PGA_PUTTING_DISTANCES.filter((d) => d > 6));
  if (length === 5) return shuffleValues([...short.slice(0, 2), ...medium.slice(0, 1), ...long.slice(0, 2)]);
  if (length === 9) return shuffleValues([...short.slice(0, 3), ...medium.slice(0, 3), ...long.slice(0, 3)]);
  const queues = [short, medium, long];
  const result: number[] = [];
  while (result.length < 18) {
    for (const groupIndex of shuffleValues([0, 1, 2])) {
      const value = queues[groupIndex].shift();
      if (value !== undefined) result.push(value);
    }
  }
  return result;
}

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(items: readonly T[]) { return items[Math.floor(Math.random() * items.length)]; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(""); }
function liveStatus(diff: number) { return diff === 0 ? "AS" : diff > 0 ? `${diff} UP` : `${Math.abs(diff)} DN`; }
function lieLabel(lie: ShortGameLie) { return lie === "fairway" ? "fairway" : lie === "rough" ? "rough" : "bunker"; }
function bunkerLimit(length: MatchLength) { return length === 5 ? 1 : length === 9 ? 2 : 4; }
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
  const grassLies = selected.filter((lie): lie is Exclude<ShortGameLie, "bunker"> => lie !== "bunker");
  if (selected.length === 1 && selected[0] === "bunker") return Array.from({ length }, () => "bunker" as ShortGameLie);
  const fallbackGrass: Exclude<ShortGameLie, "bunker">[] = grassLies.length ? grassLies : ["fairway"];
  const sequence: ShortGameLie[] = Array.from({ length }, () => pick(fallbackGrass));
  if (!selected.includes("bunker")) return sequence;

  const offset = Math.random() < 0.5 ? 0 : 1;
  const available = Array.from({ length }, (_, i) => i).filter((i) => i % 2 === offset);
  for (let i = available.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [available[i], available[j]] = [available[j], available[i]];
  }
  available.slice(0, bunkerLimit(length)).forEach((index) => { sequence[index] = "bunker"; });
  return sequence;
}

function generateChallenge(category: MatchCategory, typeId: string, mode: MatchMode, shortGameLies: ShortGameLie[] = ["fairway", "rough", "bunker"], approachDistance?: number): Challenge {
  const suffix = mode === "fourball" ? " · registrera lagets bästa resultat" : mode === "foursomes" ? " · laget spelar vartannat slag" : "";
  if (category === "putting") {
    const distance = typeId === "pga-tour" ? (approachDistance ?? 1.5) : typeId === "short" ? rand(1, 5) : typeId === "lag" ? rand(8, 22) : rand(1, 10);
    return { eyebrow: typeId === "pga-tour" ? "PGA Tour Putting" : "Puttning", title: `${distance} m`, detail: `${typeId === "pga-tour" ? "PGA Tour-avstånd · " : ""}Håla ut · lägst antal slag vinner${suffix}` };
  }
  if (category === "around-the-green") {
    const lie = pick(shortGameLies.length ? shortGameLies : (["fairway"] as ShortGameLie[]));
    if (lie === "bunker") return { eyebrow: "Bunker", title: "Bunker", detail: `Slå så nära flaggan som möjligt.${suffix}` };
    return { eyebrow: "Closest to the Pin", title: `${rand(10, 30)} m från ${lieLabel(lie)}`, detail: `Slå så nära flaggan som möjligt.${suffix}` };
  }
  if (category === "approach") {
    const d = approachDistance ?? rand(100, 150);
    return { eyebrow: "Closest to Pin", title: `${d} m`, detail: `Samma mål för båda · närmast flaggan vinner${suffix}` };
  }
  if (typeId === "distance") return { eyebrow: "Off the Tee", title: "Long Drive", detail: `Längsta godkända drive vinner${suffix}` };
  if (typeId === "shape") return { eyebrow: "Driver", title: pick(["Draw", "Fade"] as const), detail: `Rätt bollflykt och spelbar drive vinner${suffix}` };
  return { eyebrow: "Off the Tee", title: "30 m Fairway Challenge", detail: `Längsta slaget inom fairwaykorridoren vinner hålet${suffix}` };
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

function MatchPlayPage() {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("players");
  const [mode, setMode] = useState<MatchMode | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const [blueStrokes, setBlueStrokes] = useState(1);
  const [redStrokes, setRedStrokes] = useState(1);
  const [bluePoints, setBluePoints] = useState<number | null>(null);
  const [redPoints, setRedPoints] = useState<number | null>(null);
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
        setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null);
        setApproachTurn("blue");
        setStep(session.status === "completed" || Boolean(state.finalText) ? "result" : "play");
      } catch {
        // If a stale session link cannot be loaded, keep the normal match flow available.
      }
    };

    void applySession();
    const unsubscribe = subscribeMatchMultiplayerSession(sessionId, () => { void applySession(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

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
  const strokeLeader = category === "around-the-green"
    ? pointDiff > 0 ? "blue" : pointDiff < 0 ? "red" : null
    : strokeDiff > 0 ? "blue" : strokeDiff < 0 ? "red" : null;
  const liveLeader = scoringMode === "match" ? matchLeader : strokeLeader;
  const topScoreText = scoringMode === "match"
    ? diff === 0 ? "AS" : `${Math.abs(diff)} UP`
    : category === "around-the-green" ? `${score.bluePoints}–${score.redPoints}` : `${score.blueStrokes}–${score.redStrokes}`;
  const topScoreMeta = scoringMode === "match"
    ? `Hål ${Math.min(holeIndex + 1, matchLength)} av ${matchLength}`
    : category === "around-the-green" ? "Poäng" : "Slag";
  const resultLeader = scoringMode === "match"
    ? matchLeader
    : category === "around-the-green"
      ? pointDiff > 0 ? "blue" : pointDiff < 0 ? "red" : null
      : strokeDiff > 0 ? "blue" : strokeDiff < 0 ? "red" : null;
  const resultScoreText = scoringMode === "match"
    ? diff === 0 ? "AS" : `${Math.abs(diff)}&${holesRemaining}`
    : category === "around-the-green"
      ? `${score.bluePoints}–${score.redPoints}`
      : `${score.blueStrokes}–${score.redStrokes}`;
  const tiedHoles = Math.max(0, score.played - score.blue - score.red);
  const isPutting = category === "putting";
  const isPgaPutting = isPutting && matchType === "pga-tour";
  const isShortGame = category === "around-the-green";
  const isApproach = category === "approach";
  const isScoredHole = isPutting || isShortGame;
  const unitLabel = isPutting || isShortGame || isApproach ? "Hål" : "Omgång";
  const setupValid = shortGameLies.length > 0;
  const approachSetupValid = approachRanges.length > 0 && (!approachRanges.includes("custom") || (approachCustomMin >= 30 && approachCustomMax <= 250 && approachCustomMin < approachCustomMax));
  const approachTargetDistance = Number.parseInt(current?.challenge.title ?? "0", 10) || 0;
  const approachLongitudinalPreview = Math.abs(approachLong - approachTargetDistance);
  const approachProximityPreview = Math.sqrt(approachLongitudinalPreview * approachLongitudinalPreview + approachLateral * approachLateral);

  const glass = "border-slate-300/75 bg-white/68 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/60 bg-gradient-to-br from-blue-100/58 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const redGlass = "border-red-300/60 bg-gradient-to-br from-red-100/54 via-white/74 to-slate-100/76 shadow-[0_10px_24px_-20px_rgba(15,23,42,.22)] backdrop-blur-2xl";
  const selectedGlass = "border-blue-300/70 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/55 text-slate-950 shadow-[0_18px_44px_-32px_rgba(37,99,235,.38)] ring-2 ring-blue-500/30 backdrop-blur-2xl";

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
      blueTeam: blueTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
      redTeam: redTeam.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl })),
    };
  }

  useEffect(() => {
    if (!matchSessionId || !user || matchSessionHostId !== user.id || (step !== "play" && step !== "result")) return;
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
  }, [matchSessionId, matchSessionHostId, user?.id, step, holes, holeIndex, finalText, mode, category, matchType, scoringMode, matchLength, blueLabel, redLabel, score.played]);

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
    if (!mode || !teamsReady || !category || !matchType || (isShortGame && !setupValid)) return;
    const nextHoles = isPgaPutting
      ? generatePgaPuttingDistances(matchLength).map((distance) => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies, distance), winner: null as HoleWinner }))
      : isShortGame
      ? generateShortGameLieSequence(matchLength, shortGameLies).map((lie) => ({ challenge: generateChallenge(category, matchType, mode, [lie]), winner: null as HoleWinner }))
      : isApproach
        ? generateApproachDistances(matchLength, approachRanges, approachCustomMin, approachCustomMax).map((distance) => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies, distance), winner: null as HoleWinner }))
        : Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies), winner: null as HoleWinner }));
    setHoles(nextHoles);
    setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setApproachTurn("blue"); resetApproachInput(isApproach ? (Number.parseInt(nextHoles[0]?.challenge.title ?? "0", 10) || 0) : 0); setFinalText(""); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("play");
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
      if (d === 0) setFinalText("Matchen slutar delad · AS");
      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);
      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);
      setStep("result"); return;
    }
    if (scoringMode === "stroke" && s.played >= matchLength) {
      if (isShortGame) {
        const delta = s.bluePoints - s.redPoints;
        if (delta === 0) setFinalText(`Delat · ${s.bluePoints} poäng`);
        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} poäng`);
      } else {
        const delta = s.redStrokes - s.blueStrokes;
        if (delta === 0) setFinalText(`Delat · ${s.blueStrokes} slag`);
        else setFinalText(`${delta > 0 ? blueLabel : redLabel} vinner med ${Math.abs(delta)} slag`);
      }
      setStep("result"); return;
    }
    setHoleIndex(Math.min(holeIndex + 1, matchLength - 1));
    setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null);
  }
  function recordWinner(w: Exclude<HoleWinner, null>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    setTransitionMessage(`${unitLabel} ${registered + 1} registrerad`);
    const next = holes.map((h, i) => i === registered ? { ...h, winner: w } : h);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, 380);
  }
  function finishScoredEdit(next: Hole[], registered: number) {
    setHoles(next);
    const target = returnHoleIndex ?? next.findIndex((h) => h.winner === null);
    const nextIndex = target >= 0 ? target : registered;
    setHoleIndex(nextIndex);
    const targetHole = next[nextIndex];
    setBlueStrokes(targetHole?.blueStrokes ?? 1); setRedStrokes(targetHole?.redStrokes ?? 1);
    setBluePoints(typeof targetHole?.bluePoints === "number" ? targetHole.bluePoints : null); setRedPoints(typeof targetHole?.redPoints === "number" ? targetHole.redPoints : null);
    setEditingHoleIndex(null); setReturnHoleIndex(null); setIsSubmitting(false);
    setTransitionMessage(`${unitLabel} ${registered + 1} uppdaterad`);
    window.setTimeout(() => setTransitionMessage(null), 520);
  }
  function recordPutting() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = blueStrokes < redStrokes ? "blue" : redStrokes < blueStrokes ? "red" : "tie";
    const next = holes.map((h, i) => i === registered ? { ...h, winner, blueStrokes, redStrokes } : h);
    if (editingHoleIndex !== null) { finishScoredEdit(next, registered); return; }
    setTransitionMessage(`${unitLabel} ${registered + 1} registrerad`);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, 380);
  }
  function recordShortGame() {
    if (isSubmitting || bluePoints === null || redPoints === null) return;
    setIsSubmitting(true);
    const registered = holeIndex;
    const winner: Exclude<HoleWinner, null> = bluePoints > redPoints ? "blue" : redPoints > bluePoints ? "red" : "tie";
    const next = holes.map((h, i) => i === registered ? { ...h, winner, bluePoints, redPoints } : h);
    if (editingHoleIndex !== null) { finishScoredEdit(next, registered); return; }
    setTransitionMessage(`${unitLabel} ${registered + 1} registrerad`);
    window.setTimeout(() => { advance(next); setTransitionMessage(null); setIsSubmitting(false); }, 380);
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
    window.setTimeout(() => { advance(next); setApproachTurn("blue"); resetApproachInput(nextTargetDistance); setTransitionMessage(null); setIsSubmitting(false); }, 380);
  }
  function editScoredHole(index: number) {
    if (isSubmitting || !isScoredHole) return;
    const hole = holes[index];
    if (isPutting && (typeof hole?.blueStrokes !== "number" || typeof hole?.redStrokes !== "number")) return;
    if (isShortGame && (typeof hole?.bluePoints !== "number" || typeof hole?.redPoints !== "number")) return;
    setReturnHoleIndex(holeIndex); setEditingHoleIndex(index); setHoleIndex(index);
    setBlueStrokes(hole.blueStrokes ?? 1); setRedStrokes(hole.redStrokes ?? 1);
    setBluePoints(typeof hole.bluePoints === "number" ? hole.bluePoints : null); setRedPoints(typeof hole.redPoints === "number" ? hole.redPoints : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function rematch() {
    startMatch();
  }
  function newCompetition() {
    setCategory(null); setMatchType(null); setHoles([]); setHoleIndex(0); setFinalText("");
    setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null);
    setShortGameLies([]); setApproachRanges([]); setApproachTurn("blue"); resetApproachInput();
    setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setMatchSessionId(null); setMatchSessionHostId(null); setSessionBlueTeam(null); setSessionRedTeam(null); window.history.replaceState(window.history.state, "", "/match"); setStep("category");
  }
  function reset() {
    setMode(null); setSelectedFriendIds([]); setGuests([]); setGuestName(""); setBlueMateId(null); setCategory(null); setMatchType(null);
    setScoringMode("match"); setMatchLength(5); setHoles([]); setHoleIndex(0); setFinalText(""); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setShortGameLies([]); setApproachRanges([]); setApproachCustomMin(30); setApproachCustomMax(200); setApproachTurn("blue"); resetApproachInput(); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setMatchSessionId(null); setMatchSessionHostId(null); setSessionBlueTeam(null); setSessionRedTeam(null); window.history.replaceState(window.history.state, "", "/match"); setStep("players");
  }
  function back() {
    if (step === "teams") setStep("players");
    else if (step === "scoring") setStep("type");
    else if (step === "category") setStep(mode === "singles" ? "players" : "teams");
    else if (step === "type") setStep("category");
    else if (step === "setup") setStep("category");
    else if (step === "approach-setup") setStep("category");
    else if (step === "length") setStep(isShortGame ? "setup" : isApproach ? "approach-setup" : category === "off-the-tee" ? "category" : "scoring");
  }

  const stepLabel = step === "players" ? "1 · Spelform & spelare" : step === "teams" ? "2 · Lag" : step === "scoring" ? "Spelsätt" : step === "category" ? "Kategori" : step === "type" ? "Spel" : step === "setup" ? "Närspel · Setup" : step === "approach-setup" ? "Inspel · Avstånd" : "Matchlängd";

  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    {step !== "play" && step !== "result" ? <header className="flex items-center justify-between">{step === "players" ? <Link to="/" aria-label="Tillbaka" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass}`}>‹</Link> : <button onClick={back} aria-label="Föregående steg" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass}`}>‹</button>}<div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match</p><p className="text-[11px] font-semibold text-slate-700">{stepLabel}</p></div>{step === "players" ? <span aria-hidden="true" className="h-10 w-10" /> : <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link>}</header> : null}

    {step === "players" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Tävling</p><h1 className="mt-1 font-display text-4xl leading-none">Välj spelform</h1></section><div className="mt-5 flex items-center justify-between"><h2 className="font-display text-2xl">Format</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Välj lagtyp</span></div><div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => chooseMode("singles")} className={`col-span-2 rounded-[30px] border p-5 text-center ${mode === "singles" ? selectedGlass : glass}`}><span className="block font-display text-3xl">Singles</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">1 mot 1</span></button><button onClick={() => chooseMode("fourball")} className={`rounded-3xl border p-4 text-center ${mode === "fourball" ? "border-blue-300/70 bg-blue-50/80 text-slate-950 ring-2 ring-blue-500/30 backdrop-blur-2xl" : glass}`}><span className="block font-display text-xl">Fourball</span><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">2 mot 2 · bästa boll</span></button><button onClick={() => chooseMode("foursomes")} className={`rounded-3xl border p-4 text-center ${mode === "foursomes" ? "border-red-300/70 bg-red-50/80 text-slate-950 ring-2 ring-red-500/30 backdrop-blur-2xl" : glass}`}><span className="block font-display text-xl">Foursomes</span><span className="mt-1 text-[9px] font-bold uppercase text-slate-500">2 mot 2 · vartannat slag</span></button></div>{mode ? <><div className="mt-6 flex items-center justify-between"><h2 className="font-display text-2xl">Spelare</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{mode === "singles" ? "1 mot 1" : "4 spelare"}</span></div>{mode === "singles" ? <section className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${blueGlass}`}><PlayerAvatar player={selfPlayer} tone="blue" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Du · Blue</p></div><span className="rounded-xl bg-slate-950 px-2.5 py-2 font-display text-xl text-white">VS</span>{selectedOthers[0] ? <button onClick={() => setPickerOpen(true)} className={`relative flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><PlayerAvatar player={selectedOthers[0]} tone="red" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selectedOthers[0].name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">Red · tryck för att ändra</p>{selectedOthers[0].isGuest ? <span onClick={(e) => { e.stopPropagation(); removeGuest(selectedOthers[0].id); }} className="absolute right-3 top-3 rounded-full bg-white/75 p-1.5 text-slate-500"><X className="h-3.5 w-3.5" /></span> : null}</button> : <button onClick={() => setPickerOpen(true)} className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-red-400 text-red-500"><Plus className="h-6 w-6" /></span><p className="mt-3 font-display text-xl">Välj spelare</p><p className="mt-1 text-[10px] text-slate-500">Vän eller gäst</p></button>}</section> : <button onClick={() => setPickerOpen(true)} className={`mt-3 flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${selectedOthers.length ? redGlass : glass}`}><Users className="h-5 w-5 text-red-600" /><span className="min-w-0 flex-1"><span className="block font-display text-xl">Välj tre spelare</span><span className="text-[10px] text-slate-500">{selectedOthers.length}/3 valda</span></span><ChevronRight className="h-5 w-5 text-slate-500" /></button>}<button disabled={!canContinuePlayers} onClick={() => setStep(mode === "singles" ? "category" : "teams")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}</> : null}

    {step === "teams" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Bygg lagen</p><h1 className="mt-1 font-display text-4xl">Vem spelar med dig?</h1></section><div className="mt-5 space-y-3">{selectedOthers.map((p) => { const sel = blueMateId === p.id; return <button key={p.id} onClick={() => setBlueMateId(p.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${sel ? blueGlass : glass}`}><PlayerAvatar player={p} tone={sel ? "blue" : "red"} /><span className="min-w-0 flex-1"><span className="block font-display text-xl">{p.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{sel ? "Blue Team" : "Välj som lagkamrat"}</span></span>{sel ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>; })}</div><button disabled={!teamsReady} onClick={() => setStep("category")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}


    {step === "scoring" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Spelsätt</p><h1 className="mt-1 font-display text-4xl leading-none">Hur räknas resultatet?</h1></section><div className="mt-5 grid grid-cols-1 gap-3"><button onClick={() => setScoringMode("match")} className={`rounded-[28px] border p-5 text-left ${scoringMode === "match" ? blueGlass + " ring-2 ring-blue-500/30" : glass}`}><span className="block font-display text-2xl">Match Play</span><span className="mt-2 block text-xs text-slate-600">Ni spelar hål mot hål. Ställningen visas som AS, 1 UP eller 2 UP.</span></button><button onClick={() => setScoringMode("stroke")} className={`rounded-[28px] border p-5 text-left ${scoringMode === "stroke" ? redGlass + " ring-2 ring-red-500/30" : glass}`}><span className="block font-display text-2xl">Slagspel</span><span className="mt-2 block text-xs text-slate-600">Alla resultat räknas ihop. Bäst totalt vinner.</span></button></div><button onClick={() => setStep("length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "category" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Kategori</p><h1 className="mt-1 font-display text-4xl">Vad ska ni spela?</h1></section><div className="mt-5 grid grid-cols-2 gap-3">{CATEGORIES.map((i) => { const active = category === i.id; return <button key={i.id} onClick={() => { setCategory(i.id); if (i.id === "around-the-green") { setMatchType("closest"); setShortGameLies([]); } else if (i.id === "off-the-tee") { setMatchType("fairway"); setScoringMode("match"); } else if (i.id === "approach") { setMatchType("closest"); setScoringMode("match"); setApproachRanges([]); } else setMatchType(null); }} className={`relative min-h-36 rounded-[26px] border p-4 text-left ${active ? selectedGlass : glass}`}><span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{i.subtitle}</span><span className="mt-2 block font-display text-2xl leading-none">{i.title}</span><span className="mt-2 block text-[11px] leading-relaxed text-slate-600">{i.description}</span>{active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-sm"><Check className="h-4 w-4" /></span> : null}</button>; })}</div><button disabled={!category} onClick={() => { if (category === "around-the-green" || category === "off-the-tee" || category === "approach") setScoringMode("match"); setStep(category === "around-the-green" ? "setup" : category === "approach" ? "approach-setup" : category === "off-the-tee" ? "length" : "type"); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "type" && category && !isShortGame && !isApproach ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{selectedCategory?.title}</p><h1 className="mt-1 font-display text-4xl">Välj spel</h1>{isPutting ? <p className="mt-2 text-sm text-slate-600">Håla ut från varje avstånd. SG4 räknar resultatet automatiskt.</p> : null}</section><div className="mt-5 space-y-3">{MATCH_TYPES[category].map((i) => { const active = matchType === i.id; return <button key={i.id} onClick={() => { setMatchType(i.id); if (i.id === "pga-tour") setMatchLength(5); }} className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left ${active ? selectedGlass : glass}`}><span className="min-w-0 flex-1"><span className="block font-display text-2xl">{i.title}</span><span className="mt-1 block text-xs text-slate-600">{i.description}</span></span>{active ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>; })}</div><button disabled={!matchType} onClick={() => setStep("scoring")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "setup" && isShortGame ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Närspel</p><h1 className="mt-1 font-display text-4xl">Setup</h1><p className="mt-2 text-sm text-slate-600">Välj vilka lies som ska ingå.</p></section><div className="mt-5 rounded-3xl border border-slate-300/80 bg-slate-100/80 p-5 text-center shadow-[0_16px_36px_-30px_rgba(15,23,42,.35)]"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Spelform</p><p className="mt-1 font-display text-2xl text-slate-900">Closest to the Pin</p><p className="mt-1 text-xs text-slate-600">Ett slag per spelare · närmast flaggan vinner hålet.</p></div><div className="mt-6 flex items-center justify-between"><h2 className="font-display text-2xl">Välj lies</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Välj minst en</span></div><div className="mt-3 grid grid-cols-3 gap-2">{SHORT_GAME_LIES.map((item) => { const active = shortGameLies.includes(item.id); return <button key={item.id} onClick={() => toggleShortGameLie(item.id)} className={`flex min-h-20 items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center ${active ? selectedGlass : glass}`}><span className="text-sm font-bold">{item.title}</span>{active ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}</button>; })}</div>{!setupValid ? <p className="mt-2 text-center text-[10px] font-bold text-amber-700">Välj minst ett lie.</p> : null}<button disabled={!setupValid} onClick={() => setStep("length")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "approach-setup" && isApproach ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Inspel · Closest to Pin</p><h1 className="mt-1 font-display text-4xl">Välj avstånd</h1><p className="mt-2 text-sm text-slate-600">Välj ett eller flera fasta intervall, eller skapa ett eget.</p></section>{!approachRanges.includes("custom") ? <><div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Fasta intervall</p><div className="mt-2 grid grid-cols-3 gap-2">{([[["50-100","50–100"],["100-150","100–150"],["150-200","150–200"]]] as const)[0].map(([id,label]) => { const active = approachRanges.includes(id); return <button key={id} onClick={() => toggleApproachRange(id)} className={`rounded-2xl border px-2 py-4 text-center ${active ? selectedGlass : glass}`}><span className="block font-display text-xl leading-none">{label}</span><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">meter</span>{active ? <Check className="mx-auto mt-2 h-4 w-4 text-blue-600" /> : null}</button>; })}</div></div><div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-slate-300/80" /><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">eller</span><span className="h-px flex-1 bg-slate-300/80" /></div></> : null}<button onClick={() => toggleApproachRange("custom")} className={`w-full rounded-2xl border px-4 py-4 text-left ${approachRanges.includes("custom") ? selectedGlass : glass}`}><span className="flex items-center justify-between"><span><span className="block font-display text-xl">Eget intervall</span><span className="mt-1 block text-[10px] font-semibold text-slate-500">30–250 meter</span></span>{approachRanges.includes("custom") ? <Check className="h-5 w-5 text-blue-600" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}</span></button>{approachRanges.includes("custom") ? <div className={`mt-3 rounded-3xl border p-5 ${glass}`}><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Eget intervall</p><p className="mt-1 text-xs text-slate-500">Dra lägsta och högsta avståndet.</p></div><p className="font-display text-2xl text-slate-900">{approachCustomMin}–{approachCustomMax} m</p></div><div className="relative mt-7 h-8"><div className="absolute left-0 right-0 top-3 h-2 rounded-full bg-slate-200" /><div className="absolute top-3 h-2 rounded-full bg-slate-900" style={{ left: `${((approachCustomMin - 30) / 220) * 100}%`, right: `${100 - ((approachCustomMax - 30) / 220) * 100}%` }} /><input aria-label="Lägsta avstånd" type="range" min={30} max={249} step={1} value={approachCustomMin} onChange={(e) => setApproachCustomMin(Math.min(Number(e.target.value), approachCustomMax - 1))} className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-950 [&::-webkit-slider-thumb]:shadow-md" /><input aria-label="Högsta avstånd" type="range" min={31} max={250} step={1} value={approachCustomMax} onChange={(e) => setApproachCustomMax(Math.max(Number(e.target.value), approachCustomMin + 1))} className="pointer-events-none absolute inset-x-0 top-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-950 [&::-webkit-slider-thumb]:shadow-md" /></div><div className="mt-1 flex justify-between text-[10px] font-bold text-slate-500"><span>30 m</span><span>250 m</span></div></div> : null}<button disabled={!approachSetupValid} onClick={() => setStep("length")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "length" && selectedType ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{isPgaPutting ? "PGA Tour Putting" : scoringMode === "match" ? "Match Play" : "Slagspel"}</p><h1 className="mt-1 font-display text-4xl">{isPgaPutting ? "Matchlängd" : scoringMode === "stroke" ? "Antal hål" : "Bäst av"}</h1>{isPgaPutting ? <p className="mt-2 text-sm text-slate-600">Välj 5, 9 eller 18 hål. Alla längder får en mix av korta, mellanlånga och långa PGA Tour-avstånd.</p> : null}</section><div className="mt-5 grid grid-cols-3 gap-3">{([5, 9, 18] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`rounded-3xl border px-3 py-6 ${matchLength === v ? selectedGlass : glass}`}><span className="block whitespace-nowrap font-display text-3xl leading-none">{v} <span className="text-xl">hål</span></span><span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{isPgaPutting ? (v === 5 ? "Snabb" : v === 9 ? "Halv match" : "Full match") : v === 5 ? "Snabb" : v === 9 ? "Halv match" : "Full match"}</span></button>)}</div><button onClick={startMatch} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta</button></> : null}

    {step === "play" && current ? <><header className="relative flex h-9 items-center justify-center"><Link to="/" aria-label="Till startsidan" className={`absolute left-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border text-xl leading-none ${glass}`}>‹</Link><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{scoringMode === "match" ? "Match Play" : "Slagspel"} · {selectedCategory?.title}</p>{editingHoleIndex !== null ? <div className="absolute right-0 top-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">Redigerar</div> : null}</header>
      <style>{`@keyframes sg4PressureRoll{from{clip-path:inset(0 100% 0 0);opacity:.4}to{clip-path:inset(0 0 0 0);opacity:1}}@keyframes sg4PressurePulse{0%,100%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 0 rgba(250,204,21,0)}12%{box-shadow:0 12px 28px -18px rgba(245,158,11,.72),0 0 0 3px rgba(250,204,21,.55)}22%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 1px rgba(250,204,21,.15)}32%{box-shadow:0 12px 28px -18px rgba(245,158,11,.68),0 0 0 2px rgba(250,204,21,.38)}44%{box-shadow:0 12px 28px -20px rgba(245,158,11,.55),0 0 0 0 rgba(250,204,21,0)}}`}</style>
      <section className="mt-1">
        <div className="overflow-hidden rounded-[20px] border border-slate-300/80 bg-white/85 shadow-[0_14px_34px_-28px_rgba(15,23,42,.55)] backdrop-blur-2xl"><div className="grid min-h-[62px] grid-cols-[1fr_82px_1fr] items-stretch"><div style={liveLeader === "blue" ? { clipPath: "polygon(0 0,88% 0,100% 50%,88% 100%,0 100%)" } : undefined} className={`flex min-w-0 items-center px-3 pr-5 ${liveLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[10px] font-extrabold uppercase leading-tight ${liveLeader === "blue" ? "text-white" : "text-slate-700"}`}>{blueLabel}</p>{liveLeader === "blue" ? <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-blue-100">leder</p> : null}</div></div><div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{topScoreMeta}</p><p className={`mt-0.5 font-display text-[22px] leading-none ${liveLeader === "red" ? "text-red-600" : liveLeader === "blue" ? "text-blue-600" : "text-slate-950"}`}>{topScoreText}</p></div><div style={liveLeader === "red" ? { clipPath: "polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)" } : undefined} className={`flex min-w-0 items-center justify-end px-3 pl-5 text-right ${liveLeader === "red" ? "bg-red-600 text-white" : "bg-slate-50 text-slate-700"}`}><div className="min-w-0"><p className={`truncate text-[10px] font-extrabold uppercase leading-tight ${liveLeader === "red" ? "text-white" : "text-slate-700"}`}>{redLabel}</p>{liveLeader === "red" ? <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.16em] text-red-100">leder</p> : null}</div></div></div><div className="flex items-center justify-center gap-[3px] border-t border-slate-200/80 px-2 py-2">{holes.map((h, i) => <span key={`live-${i}`} className={`flex items-center justify-center rounded-full font-bold ${matchLength === 18 ? "h-3.5 w-3.5 text-[7px]" : "h-5 w-5 text-[8px]"} ${h.winner === "blue" ? "bg-blue-600 text-white" : h.winner === "red" ? "bg-red-600 text-white" : h.winner === "tie" ? "bg-slate-300 text-slate-700" : i === holeIndex ? "border border-slate-500 bg-white text-slate-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>)}</div></div>
        {pressureNotice && scoringMode === "match" ? <div className="mt-2 overflow-hidden"><div className="rounded-[16px] border border-amber-300/90 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-300 px-3 py-2 text-slate-950 shadow-[0_12px_28px_-20px_rgba(245,158,11,.65)]" style={{ animation: "sg4PressureRoll 460ms cubic-bezier(.22,.8,.3,1) both, sg4PressurePulse 1.7s ease-in-out 460ms infinite" }}><div className="flex items-center gap-2"><div className="shrink-0"><span className="inline-flex items-center rounded-full bg-slate-950/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950">Pressläge · Nu gäller det</span></div><p className="min-w-0 flex-1 text-[10px] font-bold leading-tight text-slate-900">{pressureNotice}</p></div></div></div> : null}
      </section>
      <section className={`mt-5 rounded-[32px] border p-6 text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.28)] backdrop-blur-2xl ${isPutting || isShortGame || isApproach ? "border-slate-300/90 bg-slate-100/90" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}>{!isPutting && !isShortGame && !isApproach ? <Target className="mx-auto h-6 w-6 text-blue-600" /> : null}<h1 className={`${isPutting || isShortGame ? "mt-0" : "mt-2"} pb-1 font-display leading-[1.05] ${isShortGame ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}</h1>{!isShortGame && !isPgaPutting ? <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{current.challenge.eyebrow}</p> : null}<p className="mt-3 text-xs text-slate-600">{current.challenge.detail}</p></section>

      {isPutting ? <section className="mt-5"><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Antal puttar</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">Välj 1–4 puttar för varje spelare.</p></div><div className="mt-3 space-y-3">{([[blueLabel, blueStrokes, setBlueStrokes, "blue"], [redLabel, redStrokes, setRedStrokes, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[24px] border p-3 ${tone === "blue" ? blueGlass : redGlass}`}><div className="flex items-center justify-between"><p className={`max-w-[70%] truncate text-xs font-bold ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><p className={`font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{value} {value === 1 ? "putt" : "puttar"}</p></div><div className="mt-3 grid grid-cols-4 gap-2">{([1, 2, 3, 4] as const).map((strokes) => <button key={strokes} type="button" disabled={isSubmitting} onClick={() => setter(strokes)} className={`rounded-xl border px-1 py-3 text-center transition-colors ${value === strokes ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-red-600 bg-red-600 text-white" : "border-slate-300 bg-slate-100 text-slate-700 shadow-sm"}`}><span className="block font-display text-2xl leading-none">{strokes}</span><span className="mt-1 block text-[8px] font-bold uppercase">{strokes === 1 ? "putt" : "puttar"}</span></button>)}</div></div>)}</div><button disabled={isSubmitting} onClick={recordPutting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-45">{isSubmitting ? (editingHoleIndex !== null ? "Sparar ändring…" : "Registrerar…") : editingHoleIndex !== null ? `Spara ${unitLabel.toLowerCase()} ${holeIndex + 1}` : `Registrera ${unitLabel.toLowerCase()} ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : isShortGame ? <section className="mt-5"><div className="text-center"><h2 className="font-display text-2xl">Registrera poäng</h2><p className="mt-1 text-[10px] font-semibold text-slate-600">Välj var bollen stannade.</p></div><div className="mt-3 space-y-3">{([[blueLabel, bluePoints, setBluePoints, "blue"], [redLabel, redPoints, setRedPoints, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[24px] border p-3 ${tone === "blue" ? blueGlass : redGlass}`}><div className="flex items-center justify-between"><p className={`max-w-[70%] truncate text-xs font-bold ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><div className="text-right"><p className={`font-display text-2xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{value === null ? "–" : `${value} p`}</p></div></div><div className="mt-3 grid grid-cols-5 gap-1.5">{POINT_ZONES.map((zone) => <button key={zone.points} disabled={isSubmitting} onClick={() => setter(zone.points)} className={`min-w-0 rounded-xl border px-1 py-2.5 text-center ${value === zone.points ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-red-600 bg-red-600 text-white" : "border-slate-300 bg-slate-100 text-slate-700 shadow-sm"}`}><span className="block font-display text-xl leading-none">{zone.points}p</span><span className="mt-1 block text-[8px] font-bold leading-tight">{zone.label}</span></button>)}</div></div>)}</div><p className="mt-3 text-center text-[10px] font-bold text-slate-600">Närmast flaggan vinner hålet</p><button disabled={isSubmitting || bluePoints === null || redPoints === null} onClick={recordShortGame} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">{isSubmitting ? (editingHoleIndex !== null ? "Sparar ändring…" : "Registrerar…") : editingHoleIndex !== null ? `Spara poäng för hål ${holeIndex + 1}` : `Registrera poäng för hål ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : isApproach ? <section className="mt-4"><div className={`rounded-[24px] border px-4 py-3 ${approachTurn === "blue" ? "border-blue-300 bg-blue-50/90" : "border-red-300 bg-red-50/90"}`}><div className="flex items-center gap-3"><PlayerAvatar player={approachTurn === "blue" ? blueTeam[0] : redTeam[0]} tone={approachTurn} /><div className="min-w-0 flex-1"><p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${approachTurn === "blue" ? "text-blue-600" : "text-red-600"}`}>Nu spelar</p><p className="truncate font-display text-2xl leading-none text-slate-950">{approachTurn === "blue" ? blueLabel : redLabel}</p></div><div className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${approachTurn === "blue" ? "bg-blue-600 text-white" : "bg-red-600 text-white"}`}>Din tur</div></div>{approachTurn === "red" && current.blueApproach ? <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] font-semibold text-slate-600">{blueLabel}: {current.blueApproach.proximity.toFixed(1)} m från flaggan</p> : null}</div><div className={`mt-3 rounded-[26px] border p-4 ${glass}`}><div><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Carry</p><p className="text-[10px] font-semibold text-slate-400">Mål {approachTargetDistance} m</p></div><div className="mt-2 flex items-center justify-center rounded-2xl bg-slate-100 py-3"><p className="font-display text-4xl leading-none text-slate-950">{approachLong}<span className="ml-1 text-lg text-slate-500">m</span></p></div><div className="mt-3 grid grid-cols-4 gap-2"><button onClick={() => setApproachLong(Math.max(0, approachLong - 5))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">−5</button><button onClick={() => setApproachLong(Math.max(0, approachLong - 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">−1</button><button onClick={() => setApproachLong(Math.min(300, approachLong + 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">+1</button><button onClick={() => setApproachLong(Math.min(300, approachLong + 5))} className="rounded-xl border border-slate-300 bg-white/90 py-3 text-sm font-bold text-slate-700">+5</button></div><p className="mt-2 text-center text-[9px] font-semibold text-slate-500">{approachLong === approachTargetDistance ? "Exakt längd" : approachLong < approachTargetDistance ? `${approachTargetDistance - approachLong} m kort` : `${approachLong - approachTargetDistance} m lång`}</p></div><div className="my-4 h-px bg-slate-200" /><div><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Sidmiss</p><p className="font-display text-2xl text-slate-900">{approachLateral} m</p></div><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => setApproachLateralDirection("left")} className={`rounded-xl border py-2.5 text-sm font-bold ${approachLateralDirection === "left" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white/80 text-slate-700"}`}>Vänster</button><button onClick={() => setApproachLateralDirection("right")} className={`rounded-xl border py-2.5 text-sm font-bold ${approachLateralDirection === "right" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white/80 text-slate-700"}`}>Höger</button></div><div className="mt-3 grid grid-cols-[1fr_1fr_1.25fr_1fr_1fr] gap-2"><button onClick={() => setApproachLateral(Math.max(0, approachLateral - 5))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">−5</button><button onClick={() => setApproachLateral(Math.max(0, approachLateral - 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">−1</button><div className="flex items-center justify-center rounded-xl bg-slate-100 px-2 font-display text-3xl text-slate-950">{approachLateral}</div><button onClick={() => setApproachLateral(Math.min(100, approachLateral + 1))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">+1</button><button onClick={() => setApproachLateral(Math.min(100, approachLateral + 5))} className="rounded-xl border border-slate-300 bg-white/90 py-3 font-bold text-slate-700">+5</button></div></div><div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5"><span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Avstånd från flaggan</span><span className="font-display text-2xl text-slate-950">{approachProximityPreview.toFixed(1)} m</span></div></div><button disabled={isSubmitting} onClick={recordApproach} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Spara slag <ChevronRight className="h-5 w-5" /></button></section> : <section className="mt-5"><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Vem vann?</h2><p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</p></div><div className="mt-3 grid grid-cols-2 gap-3"><button disabled={isSubmitting} onClick={() => recordWinner("blue")} className={`rounded-3xl border p-5 font-display text-xl text-blue-700 disabled:opacity-40 ${blueGlass}`}>{blueLabel}</button><button disabled={isSubmitting} onClick={() => recordWinner("red")} className={`rounded-3xl border p-5 font-display text-xl text-red-700 disabled:opacity-40 ${redGlass}`}>{redLabel}</button></div><button disabled={isSubmitting} onClick={() => recordWinner("tie")} className={`mt-3 w-full rounded-2xl border py-3.5 text-sm font-bold disabled:opacity-40 ${glass}`}>Delat · AS</button></section>}

      {isScoredHole && lastScoredHoleIndex >= 0 ? <button type="button" disabled={isSubmitting} onClick={() => editScoredHole(lastScoredHoleIndex)} className="mt-2 w-full py-2 text-center text-[10px] font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 disabled:opacity-40">Redigera senaste {unitLabel.toLowerCase()}</button> : null}</> : null}

    {step === "result" ? <><section className="mt-6 overflow-hidden rounded-[28px] border border-slate-300/85 bg-white/90 shadow-[0_22px_52px_-30px_rgba(15,23,42,.5)] backdrop-blur-2xl"><div className="px-4 pt-4 text-center"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{selectedCategory?.title} · Matchresultat</p></div><div className="mt-3 grid min-h-[104px] grid-cols-[1fr_88px_1fr] items-stretch"><div style={resultLeader === "blue" ? { clipPath: "polygon(0 0,86% 0,100% 50%,86% 100%,0 100%)" } : undefined} className={`flex min-w-0 flex-col justify-center px-4 pr-6 ${resultLeader === "blue" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{blueLabel}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "blue" ? "text-white" : "text-blue-700"}`}>{scoringMode === "match" ? score.blue : isShortGame ? score.bluePoints : score.blueStrokes}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "blue" ? "text-blue-100" : "text-slate-500"}`}>{scoringMode === "match" ? "vunna hål" : isShortGame ? "poäng" : "slag"}</p></div><div className="relative z-10 flex flex-col items-center justify-center bg-white px-1 text-center"><Trophy className="mb-1 h-4 w-4 text-amber-500" /><p className="font-display text-[26px] leading-none text-slate-950">{resultScoreText}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Slutresultat</p></div><div style={resultLeader === "red" ? { clipPath: "polygon(14% 0,100% 0,100% 100%,14% 100%,0 50%)" } : undefined} className={`flex min-w-0 flex-col justify-center px-4 pl-6 text-right ${resultLeader === "red" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}><p className="truncate text-[11px] font-black uppercase">{redLabel}</p><p className={`mt-2 font-display text-3xl ${resultLeader === "red" ? "text-white" : "text-red-700"}`}>{scoringMode === "match" ? score.red : isShortGame ? score.redPoints : score.redStrokes}</p><p className={`text-[8px] font-bold uppercase tracking-[0.13em] ${resultLeader === "red" ? "text-red-100" : "text-slate-500"}`}>{scoringMode === "match" ? "vunna hål" : isShortGame ? "poäng" : "slag"}</p></div></div><div className="border-t border-slate-200 px-4 py-3 text-center"><p className="text-xs font-bold text-slate-800">{finalText}</p>{scoringMode === "match" ? <p className="mt-1 text-[10px] font-semibold text-slate-500">{blueLabel} vann {score.blue} hål · {redLabel} vann {score.red} hål{tiedHoles ? ` · ${tiedHoles} delade` : ""}</p> : null}</div></section><section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scorecard</p><h2 className="font-display text-2xl">Hela tävlingen</h2></div><p className="text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</p></div><div className={`overflow-hidden rounded-[24px] border ${glass}`}><div className="overflow-x-auto"><div className="min-w-max"><div className="grid" style={{ gridTemplateColumns: `minmax(92px,1.35fr) repeat(${matchLength},${isApproach ? 58 : 48}px)` }}><div className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">Hål</div>{holes.map((_, i) => <div key={`rh-${i}`} className="border-b border-r border-slate-200 bg-slate-100 py-2 text-center text-[10px] font-bold text-slate-700">{i + 1}</div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-blue-700 truncate">{blueLabel}</div>{holes.map((h, i) => { const value = isShortGame ? h.bluePoints : isApproach ? h.blueApproach?.proximity : isPutting ? h.blueStrokes : undefined; return <div key={`rb-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 py-2 text-xs font-bold text-blue-700"><span className={`inline-flex min-w-[34px] items-center justify-center rounded-md px-1.5 py-1 ${h.winner === "blue" ? "bg-blue-600 text-white" : ""}`}>{typeof value === "number" ? isShortGame ? `${value}p` : isApproach ? `${value.toFixed(1)}m` : value : h.winner === "blue" ? "✓" : h.winner === "tie" ? "AS" : "–"}</span></div>; })}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-red-700 truncate">{redLabel}</div>{holes.map((h, i) => { const value = isShortGame ? h.redPoints : isApproach ? h.redApproach?.proximity : isPutting ? h.redStrokes : undefined; return <div key={`rr-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 py-2 text-xs font-bold text-red-700"><span className={`inline-flex min-w-[34px] items-center justify-center rounded-md px-1.5 py-1 ${h.winner === "red" ? "bg-red-600 text-white" : ""}`}>{typeof value === "number" ? isShortGame ? `${value}p` : isApproach ? `${value.toFixed(1)}m` : value : h.winner === "red" ? "✓" : h.winner === "tie" ? "AS" : "–"}</span></div>; })}<div className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">Vinnare</div>{holes.map((h, i) => <div key={`rw-${i}`} className={`border-r border-slate-200 bg-slate-50 py-2 text-center text-[9px] font-bold ${h.winner === "blue" ? "text-blue-700" : h.winner === "red" ? "text-red-700" : "text-slate-600"}`}>{h.winner === "blue" ? "B" : h.winner === "red" ? "R" : "AS"}</div>)}</div></div></div></div></section><section className="mt-5 space-y-3"><button onClick={rematch} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Rematch</button><button onClick={newCompetition} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 font-display text-xl text-slate-900 ${glass}`}><Trophy className="h-5 w-5" /> Ny tävling</button><Link to="/" className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/70 py-4 text-sm font-bold text-slate-700 backdrop-blur-xl">Hem</Link></section></> : null}

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}><SheetContent side="bottom" className="mx-auto max-h-[82vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8"><SheetHeader><SheetTitle>Välj spelare</SheetTitle></SheetHeader><div className="mt-4 space-y-3"><div className={`rounded-2xl border p-3 ${glass}`}><div className="flex items-center gap-2"><input value={guestName} onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} placeholder="Lägg till gästspelare" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button onClick={addGuest} disabled={!guestName.trim() || selectedOthers.length >= neededOthers} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button></div></div>{guests.map((g) => <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-3"><PlayerAvatar player={g} tone="red" /><span className="flex-1 text-sm font-semibold">{g.name}</span><button onClick={() => removeGuest(g.id)}><X className="h-4 w-4 text-slate-500" /></button></div>)}{loadingSocial ? <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : friends.map((f) => { const active = selectedFriendIds.includes(f.other.id); const full = selectedOthers.length >= neededOthers && !active; return <button key={f.id} disabled={full} onClick={() => toggleFriend(f.other.id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-left disabled:opacity-35"><PlayerAvatar player={{ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }} tone="red" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.other.displayName}</span>{active ? <Check className="h-5 w-5 text-red-600" /> : null}</button>; })}{mode !== "singles" && selectedOthers.length < neededOthers ? <button onClick={() => setPickerOpen(false)} className="w-full rounded-2xl border border-slate-300 bg-white/70 py-3.5 text-sm font-bold text-slate-700">Stäng · {selectedOthers.length}/{neededOthers}</button> : null}</div></SheetContent></Sheet>
  </main>;
}
