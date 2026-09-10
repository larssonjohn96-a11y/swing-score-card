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

export const Route = createFileRoute("/match")({
  head: () => ({ meta: [{ title: "Match Play | SG4" }] }),
  component: MatchPlayPage,
});

type Step = "players" | "teams" | "category" | "type" | "setup" | "length" | "play" | "result";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type HoleWinner = "blue" | "red" | "tie" | null;
type MatchMode = "singles" | "fourball" | "foursomes";
type ScoringMode = "match" | "stroke";
type MatchLength = 5 | 9 | 18;
type Player = { id: string; name: string; avatarUrl?: string | null; isSelf?: boolean; isGuest?: boolean };
type Challenge = { eyebrow: string; title: string; detail: string };
type Hole = { challenge: Challenge; winner: HoleWinner; blueStrokes?: number; redStrokes?: number; bluePoints?: number; redPoints?: number };
type ShortGameLie = "fairway" | "rough" | "bunker";

const CATEGORIES = [
  { id: "off-the-tee", title: "Off the Tee", subtitle: "Utslag", description: "Driver, fairway, längd och bollflykt." },
  { id: "approach", title: "Approach", subtitle: "Inspel", description: "Precision, längdkontroll och shot shaping." },
  { id: "around-the-green", title: "Around the Green", subtitle: "Närspel", description: "Closest to Pin med valbara lies och avstånd." },
  { id: "putting", title: "Puttning", subtitle: "Puttning", description: "Håla ut och låt SG4 räkna resultatet automatiskt." },
] as const;

const MATCH_TYPES: Record<MatchCategory, Array<{ id: string; title: string; description: string }>> = {
  "off-the-tee": [
    { id: "fairway", title: "Fairway Match", description: "Träffa spelkorridoren. Bäst kontroll vinner hålet." },
    { id: "distance", title: "Long Drive", description: "Längsta godkända drive vinner hålet." },
    { id: "shape", title: "Shot Shape", description: "SG4 väljer draw eller fade inför varje hål." },
  ],
  approach: [
    { id: "closest", title: "Closest to Pin", description: "SG4 väljer avstånd. Närmast flaggan vinner." },
    { id: "control", title: "Distance Control", description: "Bäst längdkontroll mot ett genererat målavstånd vinner." },
    { id: "shape", title: "Shot Shaping", description: "Avstånd plus draw eller fade genereras inför varje hål." },
  ],
  "around-the-green": [
    { id: "closest", title: "Closest to the Pin", description: "Ett slag mot flaggan. Poäng efter avståndszon – högst poäng vinner hålet." },
  ],
  putting: [
    { id: "short", title: "Korta puttar", description: "1–5 meter" },
    { id: "mix", title: "Mixade avstånd", description: "1–10 meter" },
    { id: "lag", title: "Långa puttar", description: "8–22 meter" },
  ],
};

const SHORT_GAME_LIES: Array<{ id: ShortGameLie; title: string; detail: string }> = [
  { id: "fairway", title: "Fairway / tight lie", detail: "SG4 väljer 10–30 m." },
  { id: "rough", title: "Rough", detail: "SG4 väljer 10–30 m." },
  { id: "bunker", title: "Bunker", detail: "Ingen bestämd längd – använd flaggan som finns." },
];
const POINT_ZONES = [
  { points: 4, label: "Sänkt" }, { points: 3, label: "≤1 m" }, { points: 2, label: "≤2 m" }, { points: 1, label: "≤3 m" }, { points: 0, label: ">3 m" },
] as const;

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(items: readonly T[]) { return items[Math.floor(Math.random() * items.length)]; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(""); }
function liveStatus(diff: number) { return diff === 0 ? "AS" : diff > 0 ? `${diff} UP` : `${Math.abs(diff)} DN`; }
function lieLabel(lie: ShortGameLie) { return lie === "fairway" ? "Fairway / tight lie" : lie === "rough" ? "Rough" : "Bunker"; }

function generateChallenge(category: MatchCategory, typeId: string, mode: MatchMode, shortGameLies: ShortGameLie[] = ["fairway", "rough", "bunker"]): Challenge {
  const suffix = mode === "fourball" ? " · registrera lagets bästa resultat" : mode === "foursomes" ? " · laget spelar vartannat slag" : "";
  if (category === "putting") {
    const distance = typeId === "short" ? rand(1, 5) : typeId === "lag" ? rand(8, 22) : rand(1, 10);
    return { eyebrow: "Puttning", title: `${distance} m`, detail: `Håla ut · lägst antal slag vinner${suffix}` };
  }
  if (category === "around-the-green") {
    const lie = pick(shortGameLies.length ? shortGameLies : (["fairway"] as ShortGameLie[]));
    if (lie === "bunker") return { eyebrow: "Bunker", title: "Bunker", detail: `Använd en tillgänglig bunker mot valfri flagga · scorea avståndet till flaggan${suffix}` };
    return { eyebrow: "Closest to the Pin", title: `${rand(10, 30)} m · ${lieLabel(lie)}`, detail: `Ett slag · valfri teknik · scorea avståndet till flaggan${suffix}` };
  }
  if (category === "approach") {
    const d = rand(typeId === "control" ? 60 : 80, typeId === "shape" ? 170 : 180);
    if (typeId === "shape") return { eyebrow: pick(["Draw", "Fade"] as const), title: `${d} m`, detail: `Rätt bollflykt + närmast flaggan vinner${suffix}` };
    if (typeId === "control") return { eyebrow: "Distance Control", title: `${d} m`, detail: `Bäst längdkontroll vinner${suffix}` };
    return { eyebrow: "Closest to Pin", title: `${d} m`, detail: `Närmast flaggan vinner${suffix}` };
  }
  if (typeId === "distance") return { eyebrow: "Off the Tee", title: "Long Drive", detail: `Längsta godkända drive vinner${suffix}` };
  if (typeId === "shape") return { eyebrow: "Driver", title: pick(["Draw", "Fade"] as const), detail: `Rätt bollflykt och spelbar drive vinner${suffix}` };
  return { eyebrow: "Driver", title: "Fairway Challenge", detail: `30 m spelkorridor · träff slår miss${suffix}` };
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
  const [shortGameLies, setShortGameLies] = useState<ShortGameLie[]>(["fairway", "rough", "bunker"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState<string | null>(null);
  const [editingHoleIndex, setEditingHoleIndex] = useState<number | null>(null);
  const [returnHoleIndex, setReturnHoleIndex] = useState<number | null>(null);

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

  const selfPlayer: Player = { id: user?.id ?? "self", name: selfName, avatarUrl: selfAvatar, isSelf: true };
  const selectedFriends: Player[] = friends.filter((f) => selectedFriendIds.includes(f.other.id)).map((f) => ({ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }));
  const selectedOthers = [...selectedFriends, ...guests];
  const selectedPlayers = [selfPlayer, ...selectedOthers];
  const neededOthers = mode === "singles" ? 1 : 3;
  const canContinuePlayers = mode !== null && selectedOthers.length === neededOthers;
  const blueMate = selectedPlayers.find((p) => p.id === blueMateId) ?? null;
  const blueTeam = mode === "singles" ? [selfPlayer] : [selfPlayer, ...(blueMate ? [blueMate] : [])];
  const redTeam = selectedPlayers.filter((p) => !blueTeam.some((b) => b.id === p.id));
  const teamsReady = mode === "singles" || (mode !== null && blueTeam.length === 2 && redTeam.length === 2);
  const selectedCategory = CATEGORIES.find((i) => i.id === category);
  const selectedType = category ? MATCH_TYPES[category].find((i) => i.id === matchType) : null;
  const score = useMemo(() => matchScore(holes), [holes]);
  const diff = score.blue - score.red;
  const strokeDiff = score.redStrokes - score.blueStrokes;
  const pointDiff = score.bluePoints - score.redPoints;
  const current = holes[holeIndex];
  const loadingSocial = loading || friendsLoading;
  const blueLabel = blueTeam.map((p) => p.name).join(" + ") || "Blue";
  const redLabel = redTeam.map((p) => p.name).join(" + ") || "Red";
  const holesRemaining = Math.max(0, matchLength - score.played);
  const isPutting = category === "putting";
  const isShortGame = category === "around-the-green";
  const isScoredHole = isPutting || isShortGame;
  const unitLabel = isScoredHole ? "Hål" : "Omgång";
  const setupValid = shortGameLies.length > 0;

  const glass = "border-slate-300/75 bg-white/68 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/55 bg-gradient-to-br from-blue-100/68 via-white/68 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(37,99,235,.46)] backdrop-blur-2xl";
  const redGlass = "border-red-300/55 bg-gradient-to-br from-red-100/62 via-white/68 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(239,68,68,.40)] backdrop-blur-2xl";
  const selectedGlass = "border-blue-300/70 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/55 text-slate-950 shadow-[0_18px_44px_-32px_rgba(37,99,235,.38)] ring-2 ring-blue-500/30 backdrop-blur-2xl";

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
    setHoles(Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType, mode, shortGameLies), winner: null })));
    setHoleIndex(0); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setFinalText(""); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("play");
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
    setTransitionMessage(`${unitLabel} ${registered + 1} uppdaterad`);
    window.setTimeout(() => {
      const target = returnHoleIndex ?? next.findIndex((h) => h.winner === null);
      const nextIndex = target >= 0 ? target : registered;
      setHoleIndex(nextIndex);
      const targetHole = next[nextIndex];
      setBlueStrokes(targetHole?.blueStrokes ?? 1); setRedStrokes(targetHole?.redStrokes ?? 1);
      setBluePoints(typeof targetHole?.bluePoints === "number" ? targetHole.bluePoints : null); setRedPoints(typeof targetHole?.redPoints === "number" ? targetHole.redPoints : null);
      setEditingHoleIndex(null); setReturnHoleIndex(null); setTransitionMessage(null); setIsSubmitting(false);
    }, 380);
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
  function reset() {
    setMode(null); setSelectedFriendIds([]); setGuests([]); setGuestName(""); setBlueMateId(null); setCategory(null); setMatchType(null);
    setScoringMode("match"); setMatchLength(5); setHoles([]); setHoleIndex(0); setFinalText(""); setBlueStrokes(1); setRedStrokes(1); setBluePoints(null); setRedPoints(null); setIsSubmitting(false); setTransitionMessage(null); setEditingHoleIndex(null); setReturnHoleIndex(null); setStep("players");
  }
  function back() {
    if (step === "teams") setStep("players");
    else if (step === "category") setStep(mode === "singles" ? "players" : "teams");
    else if (step === "type") setStep("category");
    else if (step === "setup") setStep("type");
    else if (step === "length") setStep(isShortGame ? "setup" : "type");
  }

  const stepLabel = step === "players" ? "1 · Spelform & spelare" : step === "teams" ? "2 · Lag" : step === "category" ? "Kategori" : step === "type" ? "Spel" : step === "setup" ? "Short Game setup" : "Matchlängd";

  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    {step !== "play" && step !== "result" ? <header className="flex items-center justify-between"><button onClick={back} disabled={step === "players"} aria-label="Föregående steg" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass} disabled:opacity-30`}>‹</button><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match</p><p className="text-[11px] font-semibold text-slate-700">{stepLabel}</p></div><Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link></header> : null}

    {step === "players" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Tävling</p><h1 className="mt-1 font-display text-4xl leading-none">Välj spelform</h1></section><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setScoringMode("match")} className={`rounded-[28px] border p-5 text-left ${scoringMode === "match" ? blueGlass + " ring-2 ring-blue-500/30" : glass}`}><span className="block font-display text-2xl">Match Play</span><span className="mt-2 block text-xs text-slate-600">Vinn hål och följ AS, 1 UP, 2 UP.</span></button><button onClick={() => setScoringMode("stroke")} className={`rounded-[28px] border p-5 text-left ${scoringMode === "stroke" ? redGlass + " ring-2 ring-red-500/30" : glass}`}><span className="block font-display text-2xl">Stroke Play</span><span className="mt-2 block text-xs text-slate-600">Alla resultat räknas. Bäst totalscore vinner.</span></button></div><div className="mt-7 flex items-center justify-between"><h2 className="font-display text-2xl">Format</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Välj lagtyp</span></div><div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => chooseMode("singles")} className={`col-span-2 rounded-[30px] border p-5 text-center ${mode === "singles" ? selectedGlass : glass}`}><span className="block font-display text-3xl">Singles</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">1 mot 1</span></button><button onClick={() => chooseMode("fourball")} className={`rounded-3xl border p-4 text-center ${mode === "fourball" ? "border-blue-300/70 bg-blue-50/80 text-slate-950 ring-2 ring-blue-500/30 backdrop-blur-2xl" : glass}`}><span className="block font-display text-xl">Fourball</span><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">2 mot 2 · bästa boll</span></button><button onClick={() => chooseMode("foursomes")} className={`rounded-3xl border p-4 text-center ${mode === "foursomes" ? "border-red-300/70 bg-red-50/80 text-slate-950 ring-2 ring-red-500/30 backdrop-blur-2xl" : glass}`}><span className="block font-display text-xl">Foursomes</span><span className="mt-1 text-[9px] font-bold uppercase text-slate-500">2 mot 2 · vartannat slag</span></button></div>{mode ? <><div className="mt-6 flex items-center justify-between"><h2 className="font-display text-2xl">Spelare</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{mode === "singles" ? "1 mot 1" : "4 spelare"}</span></div>{mode === "singles" ? <section className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${blueGlass}`}><PlayerAvatar player={selfPlayer} tone="blue" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Du · Blue</p></div><span className="rounded-xl bg-slate-950 px-2.5 py-2 font-display text-xl text-white">VS</span>{selectedOthers[0] ? <button onClick={() => setPickerOpen(true)} className={`relative flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><PlayerAvatar player={selectedOthers[0]} tone="red" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selectedOthers[0].name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">Red · tryck för att ändra</p>{selectedOthers[0].isGuest ? <span onClick={(e) => { e.stopPropagation(); removeGuest(selectedOthers[0].id); }} className="absolute right-3 top-3 rounded-full bg-white/75 p-1.5 text-slate-500"><X className="h-3.5 w-3.5" /></span> : null}</button> : <button onClick={() => setPickerOpen(true)} className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-red-400 text-red-500"><Plus className="h-6 w-6" /></span><p className="mt-3 font-display text-xl">Välj spelare</p><p className="mt-1 text-[10px] text-slate-500">Vän eller gäst</p></button>}</section> : <button onClick={() => setPickerOpen(true)} className={`mt-3 flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${selectedOthers.length ? redGlass : glass}`}><Users className="h-5 w-5 text-red-600" /><span className="min-w-0 flex-1"><span className="block font-display text-xl">Välj tre spelare</span><span className="text-[10px] text-slate-500">{selectedOthers.length}/3 valda</span></span><ChevronRight className="h-5 w-5 text-slate-500" /></button>}<button disabled={!canContinuePlayers} onClick={() => setStep(mode === "singles" ? "category" : "teams")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}</> : null}

    {step === "teams" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Bygg lagen</p><h1 className="mt-1 font-display text-4xl">Vem spelar med dig?</h1></section><div className="mt-5 space-y-3">{selectedOthers.map((p) => { const sel = blueMateId === p.id; return <button key={p.id} onClick={() => setBlueMateId(p.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${sel ? blueGlass : glass}`}><PlayerAvatar player={p} tone={sel ? "blue" : "red"} /><span className="min-w-0 flex-1"><span className="block font-display text-xl">{p.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{sel ? "Blue Team" : "Välj som lagkamrat"}</span></span>{sel ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>; })}</div><button disabled={!teamsReady} onClick={() => setStep("category")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "category" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{scoringMode === "match" ? "Match Play" : "Stroke Play"}</p><h1 className="mt-1 font-display text-4xl">Vad ska ni spela?</h1></section><div className="mt-5 grid grid-cols-2 gap-3">{CATEGORIES.map((i) => { const active = category === i.id; return <button key={i.id} onClick={() => { setCategory(i.id); setMatchType(null); }} className={`relative min-h-36 rounded-[26px] border p-4 text-left ${active ? selectedGlass : glass}`}><span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{i.subtitle}</span><span className="mt-2 block font-display text-2xl leading-none">{i.title}</span><span className="mt-2 block text-[11px] leading-relaxed text-slate-600">{i.description}</span>{active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-sm"><Check className="h-4 w-4" /></span> : null}</button>; })}</div><button disabled={!category} onClick={() => setStep("type")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "type" && category ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{selectedCategory?.title}</p><h1 className="mt-1 font-display text-4xl">Välj spel</h1>{isPutting ? <p className="mt-2 text-sm text-slate-600">Håla ut från varje avstånd. SG4 räknar resultatet automatiskt.</p> : isShortGame ? <p className="mt-2 text-sm text-slate-600">Ett slag per spelare. Samma poängzoner som 8-bollsövningen.</p> : null}</section><div className="mt-5 space-y-3">{MATCH_TYPES[category].map((i) => { const active = matchType === i.id; return <button key={i.id} onClick={() => setMatchType(i.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left ${active ? selectedGlass : glass}`}><span className="min-w-0 flex-1"><span className="block font-display text-2xl">{i.title}</span><span className="mt-1 block text-xs text-slate-600">{i.description}</span></span>{active ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>; })}</div>{isShortGame ? <div className={`mt-4 rounded-2xl border p-4 ${glass}`}><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scoring</p><p className="mt-2 text-xs leading-relaxed text-slate-600"><b>4</b> sänkt · <b>3</b> ≤1 m · <b>2</b> ≤2 m · <b>1</b> ≤3 m · <b>0</b> &gt;3 m</p></div> : null}<button disabled={!matchType} onClick={() => setStep(isShortGame ? "setup" : "length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "setup" && isShortGame ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Closest to the Pin</p><h1 className="mt-1 font-display text-4xl">Vilka lägen finns?</h1><p className="mt-2 text-sm text-slate-600">Välj de lies/scenarier som finns på träningsområdet. Tekniken är alltid valfri.</p></section><div className="mt-5 grid gap-2">{SHORT_GAME_LIES.map((item) => { const active = shortGameLies.includes(item.id); return <button key={item.id} onClick={() => toggleShortGameLie(item.id)} className={`flex items-center justify-between rounded-2xl border p-4 text-left ${active ? selectedGlass : glass}`}><span><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-[10px] text-slate-500">{item.detail}</span></span>{active ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}</button>; })}</div><p className="mt-4 text-center text-[10px] font-semibold text-slate-500">Fairway och rough: 10–30 m · Bunker: valfri flagga.</p><button disabled={!setupValid} onClick={() => setStep("length")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "length" && selectedType ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{scoringMode === "match" ? "Match Play" : "Stroke Play"}</p><h1 className="mt-1 font-display text-4xl">{scoringMode === "stroke" ? "Antal hål" : "Bäst av"}</h1></section><div className="mt-5 grid grid-cols-3 gap-3">{([5, 9, 18] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`rounded-3xl border px-3 py-6 ${matchLength === v ? selectedGlass : glass}`}><span className="block font-display text-4xl">{v}</span><span className="text-[10px] font-bold uppercase">hål</span></button>)}</div><button onClick={startMatch} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta</button></> : null}

    {step === "play" && current ? <><header className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{scoringMode === "match" ? "Match Play" : "Stroke Play"} · {selectedCategory?.title}</p><div className="mt-2 inline-flex items-baseline gap-2 rounded-full border border-slate-300/80 bg-white/70 px-5 py-2.5 shadow-sm backdrop-blur-xl"><span className="font-display text-2xl">{unitLabel} {holeIndex + 1}</span><span className="text-xs font-semibold text-slate-500">av {matchLength}</span></div>{editingHoleIndex !== null ? <div className="mx-auto mt-3 w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">Redigerar {unitLabel.toLowerCase()} {holeIndex + 1}</div> : null}</header>
      <section className={`mt-5 rounded-[32px] border p-6 text-center shadow-[0_18px_44px_-32px_rgba(15,23,42,.32)] backdrop-blur-2xl ${isPutting ? "border-slate-300/80 bg-slate-100/80" : "border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58"}`}>{!isPutting ? <><Target className="mx-auto h-6 w-6 text-blue-600" /><p className="mt-3 text-[10px] font-bold uppercase text-blue-600">Gör detta</p></> : null}<h1 className={`${isPutting ? "mt-0" : "mt-2"} font-display ${isShortGame ? "text-4xl" : "text-5xl"}`}>{current.challenge.title}</h1><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{current.challenge.eyebrow}</p><p className="mt-3 text-xs text-slate-600">{current.challenge.detail}</p></section>

      {isPutting ? <section className="mt-5"><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Antal slag</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">Håla ut först</p></div><div className="mt-3 grid grid-cols-2 gap-3">{([[blueLabel, blueStrokes, setBlueStrokes, "blue"], [redLabel, redStrokes, setRedStrokes, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[28px] border p-4 text-center ${tone === "blue" ? blueGlass : redGlass}`}><p className={`truncate text-xs font-bold ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><div className="mt-4 flex items-center justify-between gap-2"><button disabled={isSubmitting} onClick={() => setter(Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/75 shadow-sm disabled:opacity-40"><Minus className="h-4 w-4" /></button><div><p className={`font-display text-5xl leading-none ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{value}</p><p className="mt-1 text-[9px] font-bold uppercase text-slate-500">slag</p></div><button disabled={isSubmitting} onClick={() => setter(Math.min(9, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/75 shadow-sm disabled:opacity-40"><Plus className="h-4 w-4" /></button></div></div>)}</div><button disabled={isSubmitting} onClick={recordPutting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-45">{isSubmitting ? "Registrerar…" : editingHoleIndex !== null ? `Spara ${unitLabel.toLowerCase()} ${holeIndex + 1}` : `Registrera ${unitLabel.toLowerCase()} ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : isShortGame ? <section className="mt-5"><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Avstånd till flaggan</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">4 sänkt · 3 ≤1 m · 2 ≤2 m · 1 ≤3 m · 0 &gt;3 m</p></div><div className="mt-3 space-y-3">{([[blueLabel, bluePoints, setBluePoints, "blue"], [redLabel, redPoints, setRedPoints, "red"]] as const).map(([label, value, setter, tone]) => <div key={tone} className={`rounded-[24px] border p-3 ${tone === "blue" ? blueGlass : redGlass}`}><div className="flex items-center justify-between"><p className={`max-w-[70%] truncate text-xs font-bold ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{label}</p><p className={`font-display text-2xl ${tone === "blue" ? "text-blue-700" : "text-red-700"}`}>{value === null ? "–" : value}</p></div><div className="mt-3 grid grid-cols-5 gap-1.5">{POINT_ZONES.map((zone) => <button key={zone.points} disabled={isSubmitting} onClick={() => setter(zone.points)} className={`min-w-0 rounded-xl border px-1 py-2 text-center ${value === zone.points ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-red-600 bg-red-600 text-white" : "border-white/80 bg-white/70 text-slate-700"}`}><span className="block font-display text-xl leading-none">{zone.points}</span><span className="mt-1 block truncate text-[8px] font-bold">{zone.label}</span></button>)}</div></div>)}</div><button disabled={isSubmitting || bluePoints === null || redPoints === null} onClick={recordShortGame} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">{isSubmitting ? "Registrerar…" : editingHoleIndex !== null ? `Spara ${unitLabel.toLowerCase()} ${holeIndex + 1}` : `Registrera ${unitLabel.toLowerCase()} ${holeIndex + 1}`} <ChevronRight className="h-5 w-5" /></button></section> : <section className="mt-5"><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">2 · Registrering</p><h2 className="mt-1 font-display text-2xl">Vem vann?</h2><p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</p></div><div className="mt-3 grid grid-cols-2 gap-3"><button disabled={isSubmitting} onClick={() => recordWinner("blue")} className={`rounded-3xl border p-5 font-display text-xl text-blue-700 disabled:opacity-40 ${blueGlass}`}>{blueLabel}</button><button disabled={isSubmitting} onClick={() => recordWinner("red")} className={`rounded-3xl border p-5 font-display text-xl text-red-700 disabled:opacity-40 ${redGlass}`}>{redLabel}</button></div><button disabled={isSubmitting} onClick={() => recordWinner("tie")} className={`mt-3 w-full rounded-2xl border py-3.5 text-sm font-bold disabled:opacity-40 ${glass}`}>Delat · AS</button></section>}

      <section className="mt-6"><div className="mb-3 text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">3 · Matchöversikt</p><h2 className="mt-1 font-display text-2xl">Ställning</h2><p className="mt-1 text-[10px] font-semibold text-slate-500">{score.played} spelade · {holesRemaining} kvar</p></div>{isPutting && scoringMode === "stroke" ? <div className="grid grid-cols-2 gap-3"><div className={`rounded-3xl border p-4 text-center ${blueGlass}`}><p className="truncate text-xs font-bold text-blue-700">{blueLabel}</p><p className="mt-1 font-display text-4xl text-blue-700">{score.blueStrokes}</p><p className="text-[9px] font-bold uppercase text-blue-600">slag totalt</p></div><div className={`rounded-3xl border p-4 text-center ${redGlass}`}><p className="truncate text-xs font-bold text-red-700">{redLabel}</p><p className="mt-1 font-display text-4xl text-red-700">{score.redStrokes}</p><p className="text-[9px] font-bold uppercase text-red-600">slag totalt</p></div></div> : isShortGame && scoringMode === "stroke" ? <div className="grid grid-cols-2 gap-3"><div className={`rounded-3xl border p-4 text-center ${blueGlass}`}><p className="truncate text-xs font-bold text-blue-700">{blueLabel}</p><p className="mt-1 font-display text-4xl text-blue-700">{score.bluePoints}</p><p className="text-[9px] font-bold uppercase text-blue-600">poäng totalt</p></div><div className={`rounded-3xl border p-4 text-center ${redGlass}`}><p className="truncate text-xs font-bold text-red-700">{redLabel}</p><p className="mt-1 font-display text-4xl text-red-700">{score.redPoints}</p><p className="text-[9px] font-bold uppercase text-red-600">poäng totalt</p></div></div> : <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2"><div className={`rounded-3xl border p-3 text-center ${diff > 0 ? "ring-2 ring-blue-500/70" : ""} ${blueGlass}`}><p className="truncate text-xs font-bold text-blue-700">{blueLabel}</p><p className="mt-2 font-display text-3xl text-blue-700">{diff > 0 ? `${diff} UP` : diff < 0 ? `${Math.abs(diff)} DN` : "AS"}</p></div><div className="flex flex-col items-center justify-center text-center"><p className={`rounded-xl px-3 py-2 font-display text-2xl ${diff > 0 ? "bg-blue-600 text-white" : diff < 0 ? "bg-red-600 text-white" : "bg-slate-900 text-white"}`}>{liveStatus(diff)}</p><p className="mt-2 text-[9px] font-bold uppercase text-slate-500">{holesRemaining} kvar</p></div><div className={`rounded-3xl border p-3 text-center ${diff < 0 ? "ring-2 ring-red-500/70" : ""} ${redGlass}`}><p className="truncate text-xs font-bold text-red-700">{redLabel}</p><p className="mt-2 font-display text-3xl text-red-700">{diff < 0 ? `${Math.abs(diff)} UP` : diff > 0 ? `${diff} DN` : "AS"}</p></div></div>}
      <div className={`mt-4 overflow-hidden rounded-[24px] border ${glass}`}><div className="overflow-x-auto"><div className="min-w-max"><div className="grid" style={{ gridTemplateColumns: `minmax(94px,1.35fr) repeat(${matchLength},44px)` }}><div className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600">{unitLabel}</div>{holes.map((_, i) => <div key={`h-${i}`} className="border-b border-r border-slate-200 bg-slate-100 py-2 text-center text-[10px] font-bold text-slate-700">{i + 1}</div>)}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-blue-700 truncate">{blueLabel}</div>{holes.map((h, i) => { const blueValue = isShortGame ? h.bluePoints : h.blueStrokes; const redValue = isShortGame ? h.redPoints : h.redStrokes; const blueWon = typeof blueValue === "number" && typeof redValue === "number" && (isShortGame ? blueValue > redValue : blueValue < redValue); return <button type="button" onClick={() => editScoredHole(i)} disabled={!isScoredHole || typeof blueValue !== "number" || isSubmitting} key={`b-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 py-2 text-center text-xs font-bold text-blue-700 disabled:cursor-default"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${blueWon ? "bg-blue-600 text-white ring-2 ring-blue-200" : ""}`}>{typeof blueValue === "number" ? blueValue : "–"}</span></button>; })}<div className="border-b border-r border-slate-200 px-3 py-2 text-[10px] font-bold text-red-700 truncate">{redLabel}</div>{holes.map((h, i) => { const blueValue = isShortGame ? h.bluePoints : h.blueStrokes; const redValue = isShortGame ? h.redPoints : h.redStrokes; const redWon = typeof blueValue === "number" && typeof redValue === "number" && (isShortGame ? redValue > blueValue : redValue < blueValue); return <button type="button" onClick={() => editScoredHole(i)} disabled={!isScoredHole || typeof redValue !== "number" || isSubmitting} key={`r-${i}`} className="flex items-center justify-center border-b border-r border-slate-200 py-2 text-center text-xs font-bold text-red-700 disabled:cursor-default"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${redWon ? "bg-red-600 text-white ring-2 ring-red-200" : ""}`}>{typeof redValue === "number" ? redValue : "–"}</span></button>; })}<div className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600">Ställning</div>{holes.map((h, i) => <div key={`s-${i}`} className={`border-r border-slate-200 bg-slate-50 py-2 text-center text-[9px] font-bold ${h.winner === null ? "text-slate-400" : scoringMode === "match" ? (() => { let d = 0; for (let x = 0; x <= i; x++) { if (holes[x]?.winner === "blue") d++; if (holes[x]?.winner === "red") d--; } return d > 0 ? "text-blue-700" : d < 0 ? "text-red-700" : "text-slate-700"; })() : "text-slate-700"}`}>{h.winner === null ? (i === holeIndex ? "•" : "–") : scoringMode === "match" ? (() => { let d = 0; for (let x = 0; x <= i; x++) { if (holes[x]?.winner === "blue") d++; if (holes[x]?.winner === "red") d--; } return liveStatus(d); })() : isShortGame ? (() => { let b = 0; let r = 0; for (let x = 0; x <= i; x++) { b += holes[x]?.bluePoints ?? 0; r += holes[x]?.redPoints ?? 0; } const delta = b - r; return delta === 0 ? "AS" : delta > 0 ? `+${delta}` : `${delta}`; })() : (() => { let b = 0; let r = 0; for (let x = 0; x <= i; x++) { b += holes[x]?.blueStrokes ?? 0; r += holes[x]?.redStrokes ?? 0; } const delta = r - b; return delta === 0 ? "AS" : delta > 0 ? `${delta} före` : `${Math.abs(delta)} efter`; })()}</div>)}</div></div></div></div></section>
      {isPutting && scoringMode === "stroke" && score.played > 0 ? <p className="mt-3 text-center text-[10px] font-semibold text-slate-500">{strokeDiff === 0 ? "Delat totalt" : `${strokeDiff > 0 ? blueLabel : redLabel} leder med ${Math.abs(strokeDiff)} slag`}</p> : isShortGame && scoringMode === "stroke" && score.played > 0 ? <p className="mt-3 text-center text-[10px] font-semibold text-slate-500">{pointDiff === 0 ? "Delat totalt" : `${pointDiff > 0 ? blueLabel : redLabel} leder med ${Math.abs(pointDiff)} poäng`}</p> : null}</> : null}

    {step === "result" ? <><section className="mt-10 rounded-[34px] border border-slate-300/80 bg-gradient-to-br from-blue-100/72 via-white/80 to-red-100/64 p-6 text-center shadow-[0_24px_56px_-32px_rgba(15,23,42,.5)] backdrop-blur-2xl"><Trophy className="mx-auto h-8 w-8" /><p className="mt-4 text-[10px] font-bold uppercase text-slate-500">{scoringMode === "stroke" ? "Stroke Play Result" : "Match Result"}</p><h1 className="mt-2 font-display text-4xl">{finalText}</h1>{isPutting ? <div className="mt-5 grid grid-cols-2 gap-3"><div className={`rounded-2xl border p-3 ${blueGlass}`}><p className="truncate text-xs font-bold text-blue-700">{blueLabel}</p><p className="mt-1 font-display text-3xl text-blue-700">{score.blueStrokes}</p><p className="text-[9px] uppercase text-blue-600">slag</p></div><div className={`rounded-2xl border p-3 ${redGlass}`}><p className="truncate text-xs font-bold text-red-700">{redLabel}</p><p className="mt-1 font-display text-3xl text-red-700">{score.redStrokes}</p><p className="text-[9px] uppercase text-red-600">slag</p></div></div> : isShortGame ? <div className="mt-5 grid grid-cols-2 gap-3"><div className={`rounded-2xl border p-3 ${blueGlass}`}><p className="truncate text-xs font-bold text-blue-700">{blueLabel}</p><p className="mt-1 font-display text-3xl text-blue-700">{score.bluePoints}</p><p className="text-[9px] uppercase text-blue-600">poäng</p></div><div className={`rounded-2xl border p-3 ${redGlass}`}><p className="truncate text-xs font-bold text-red-700">{redLabel}</p><p className="mt-1 font-display text-3xl text-red-700">{score.redPoints}</p><p className="text-[9px] uppercase text-red-600">poäng</p></div></div> : null}</section><button onClick={reset} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Ny match</button></> : null}

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}><SheetContent side="bottom" className="mx-auto max-h-[82vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8"><SheetHeader><SheetTitle>Välj spelare</SheetTitle></SheetHeader><div className="mt-4 space-y-3"><div className={`rounded-2xl border p-3 ${glass}`}><div className="flex items-center gap-2"><input value={guestName} onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} placeholder="Lägg till gästspelare" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button onClick={addGuest} disabled={!guestName.trim() || selectedOthers.length >= neededOthers} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button></div></div>{guests.map((g) => <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-3"><PlayerAvatar player={g} tone="red" /><span className="flex-1 text-sm font-semibold">{g.name}</span><button onClick={() => removeGuest(g.id)}><X className="h-4 w-4 text-slate-500" /></button></div>)}{loadingSocial ? <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : friends.map((f) => { const active = selectedFriendIds.includes(f.other.id); const full = selectedOthers.length >= neededOthers && !active; return <button key={f.id} disabled={full} onClick={() => toggleFriend(f.other.id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-left disabled:opacity-35"><PlayerAvatar player={{ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }} tone="red" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.other.displayName}</span>{active ? <Check className="h-5 w-5 text-red-600" /> : null}</button>; })}{mode !== "singles" && selectedOthers.length < neededOthers ? <button onClick={() => setPickerOpen(false)} className="w-full rounded-2xl border border-slate-300 bg-white/70 py-3.5 text-sm font-bold text-slate-700">Stäng · {selectedOthers.length}/{neededOthers}</button> : null}</div></SheetContent></Sheet>
  </main>;
}
