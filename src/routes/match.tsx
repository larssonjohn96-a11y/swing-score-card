import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Flag, Plus, RotateCcw, Target, Trophy, User, Users, X } from "lucide-react";
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

type Step = "players" | "teams" | "category" | "type" | "length" | "play" | "result";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type HoleWinner = "blue" | "red" | "tie" | null;
type MatchMode = "singles" | "fourball" | "foursomes";
type MatchLength = 5 | 9 | 18;
type Player = { id: string; name: string; avatarUrl?: string | null; isSelf?: boolean; isGuest?: boolean };
type Challenge = { eyebrow: string; title: string; detail: string };
type Hole = { challenge: Challenge; winner: HoleWinner };

const CATEGORIES = [
  { id: "off-the-tee", title: "Off the Tee", subtitle: "Utslag", description: "Driver, fairway, längd och bollflykt." },
  { id: "approach", title: "Approach", subtitle: "Inspel", description: "Precision, längdkontroll och shot shaping." },
  { id: "around-the-green", title: "Around the Green", subtitle: "Närspel", description: "Chip, pitch, bunker, lob och up & down." },
  { id: "putting", title: "Putting", subtitle: "Puttning", description: "Kortputt, lag putting och blandade puttar." },
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
    { id: "mixed", title: "Mixed Short Game", description: "Chip, pitch, bunker och lob blandas över matchen." },
    { id: "closest", title: "Closest to Pin", description: "SG4 väljer slagtyp och avstånd. Närmast flaggan vinner." },
    { id: "up-down", title: "Up & Down", description: "Spela ut läget. Lägst antal slag vinner hålet." },
  ],
  putting: [
    { id: "lag", title: "Lag Putting", description: "SG4 väljer 8–20 m. Närmast hål vinner." },
    { id: "short", title: "Short Putting", description: "1–3 m. Flest sänkta av tre bollar vinner." },
    { id: "mix", title: "Putting Mix", description: "Kortputt och lagputt blandas över matchen." },
  ],
};

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(items: readonly T[]) { return items[Math.floor(Math.random() * items.length)]; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(""); }
function liveStatus(diff: number) { return diff === 0 ? "AS" : diff > 0 ? `${diff} UP` : `${Math.abs(diff)} DN`; }

function generateChallenge(category: MatchCategory, typeId: string, mode: MatchMode): Challenge {
  const suffix = mode === "fourball" ? " · bästa boll för laget" : mode === "foursomes" ? " · laget spelar vartannat slag" : "";
  if (category === "putting") {
    if (typeId === "lag") return { eyebrow: "Lag Putting", title: `${rand(8, 20)} m`, detail: `Närmast hål vinner${suffix}` };
    if (typeId === "short") return { eyebrow: "Short Putting", title: `${rand(1, 3)} m`, detail: `Tre bollar · flest sänkta vinner${suffix}` };
    return Math.random() > .45
      ? { eyebrow: "Short Putting", title: `${rand(1, 3)} m`, detail: `Tre bollar · flest sänkta vinner${suffix}` }
      : { eyebrow: "Lag Putting", title: `${rand(8, 20)} m`, detail: `Närmast hål vinner${suffix}` };
  }
  if (category === "around-the-green") {
    const shot = pick(["Chip", "Pitch", "Bunker", "Lob"] as const);
    const d = shot === "Chip" ? rand(5, 12) : shot === "Bunker" ? rand(8, 16) : rand(12, 30);
    return typeId === "up-down"
      ? { eyebrow: shot, title: `${d} m från flaggan`, detail: `Spela ut hålet · lägst antal slag vinner${suffix}` }
      : { eyebrow: shot, title: `${d} m från flaggan`, detail: `Närmast flaggan vinner${suffix}` };
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
    return s;
  }, { blue: 0, red: 0, played: 0 });
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
  const [matchLength, setMatchLength] = useState<MatchLength>(5);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [finalText, setFinalText] = useState("");

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
  const current = holes[holeIndex];
  const loadingSocial = loading || friendsLoading;
  const blueLabel = blueTeam.map((p) => p.name).join(" + ") || "Blue";
  const redLabel = redTeam.map((p) => p.name).join(" + ") || "Red";
  const holesRemaining = Math.max(0, matchLength - score.played);

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
    setHoles(Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType, mode), winner: null })));
    setHoleIndex(0); setFinalText(""); setStep("play");
  }
  function recordWinner(w: Exclude<HoleWinner, null>) {
    const next = holes.map((h, i) => i === holeIndex ? { ...h, winner: w } : h);
    const s = matchScore(next); const d = s.blue - s.red; const rem = matchLength - s.played;
    setHoles(next);
    if (Math.abs(d) > rem || s.played >= matchLength) {
      if (d === 0) setFinalText("Matchen slutar delad · AS");
      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} & ${rem}`);
      else setFinalText(`${d > 0 ? blueLabel : redLabel} vinner ${Math.abs(d)} UP`);
      setStep("result"); return;
    }
    setHoleIndex(Math.min(holeIndex + 1, matchLength - 1));
  }
  function reset() { setMode(null); setSelectedFriendIds([]); setGuests([]); setGuestName(""); setBlueMateId(null); setCategory(null); setMatchType(null); setMatchLength(5); setHoles([]); setHoleIndex(0); setFinalText(""); setStep("players"); }
  function back() { if (step === "teams") setStep("players"); else if (step === "category") setStep(mode === "singles" ? "players" : "teams"); else if (step === "type") setStep("category"); else if (step === "length") setStep("type"); }

  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    {step !== "play" && step !== "result" ? <header className="flex items-center justify-between"><button onClick={back} disabled={step === "players"} aria-label="Föregående steg" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none ${glass} disabled:opacity-30`}>‹</button><div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match Play</p><p className="text-[11px] font-semibold text-slate-700">{step === "players" ? "1 · Format & spelare" : step === "teams" ? "2 · Lag" : step === "category" ? "Kategori" : step === "type" ? "Matchtyp" : "Matchlängd"}</p></div><Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link></header> : null}

    {step === "players" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Match Play</p><h1 className="mt-1 font-display text-4xl leading-none">Välj format</h1></section><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => chooseMode("singles")} className={`col-span-2 rounded-[30px] border p-5 text-center ${mode === "singles" ? "border-blue-300/70 bg-gradient-to-br from-blue-100/78 via-white/76 to-red-50/54 text-slate-950 shadow-[0_18px_44px_-32px_rgba(37,99,235,.4)] ring-2 ring-blue-500/35 backdrop-blur-2xl" : glass}`}><span className="block font-display text-3xl">Singles</span><span className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] ${mode === "singles" ? "text-slate-600" : "text-slate-500"}`}>1 mot 1 · klassisk match play</span></button><button onClick={() => chooseMode("fourball")} className={`rounded-3xl border p-4 text-center ${mode === "fourball" ? "border-blue-300/70 bg-blue-50/80 text-slate-950 ring-2 ring-blue-500/30 backdrop-blur-2xl" : glass}`}><span className="block font-display text-xl">Fourball</span><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">2 mot 2 · bästa boll</span></button><button onClick={() => chooseMode("foursomes")} className={`rounded-3xl border p-4 text-center ${mode === "foursomes" ? "border-red-300/70 bg-red-50/80 text-slate-950 ring-2 ring-red-500/30 backdrop-blur-2xl" : glass}`}><span className="block font-display text-xl">Foursomes</span><span className="mt-1 block text-[9px] font-bold uppercase text-slate-500">2 mot 2 · vartannat slag</span></button></div>{mode ? <><div className="mt-6 flex items-center justify-between"><h2 className="font-display text-2xl">Spelare</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{mode === "singles" ? "1 mot 1" : "4 spelare"}</span></div>{mode === "singles" ? <section className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${blueGlass}`}><PlayerAvatar player={selfPlayer} tone="blue" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Du · Blue</p></div><span className="rounded-xl bg-slate-950 px-2.5 py-2 font-display text-xl text-white">VS</span>{selectedOthers[0] ? <button onClick={() => setPickerOpen(true)} className={`relative flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><PlayerAvatar player={selectedOthers[0]} tone="red" large /><p className="mt-3 max-w-full truncate text-sm font-bold">{selectedOthers[0].name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-600">Red · tryck för att ändra</p>{selectedOthers[0].isGuest ? <span onClick={(e) => { e.stopPropagation(); removeGuest(selectedOthers[0].id); }} className="absolute right-3 top-3 rounded-full bg-white/75 p-1.5 text-slate-500"><X className="h-3.5 w-3.5" /></span> : null}</button> : <button onClick={() => setPickerOpen(true)} className={`flex min-h-44 flex-col items-center justify-center rounded-[28px] border p-4 text-center ${redGlass}`}><span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-red-400 text-red-500"><Plus className="h-6 w-6" /></span><p className="mt-3 font-display text-xl">Välj spelare</p><p className="mt-1 text-[10px] text-slate-500">Vän eller gäst</p></button>}</section> : <><button onClick={() => setPickerOpen(true)} className={`mt-3 flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${selectedOthers.length ? redGlass : glass}`}><Users className="h-5 w-5 text-red-600" /><span className="min-w-0 flex-1"><span className="block font-display text-xl">Välj tre spelare</span><span className="text-[10px] text-slate-500">{selectedOthers.length}/3 valda</span></span><ChevronRight className="h-5 w-5 text-slate-500" /></button>{selectedOthers.length ? <div className="mt-3 flex flex-wrap gap-2">{selectedOthers.map((p) => <span key={p.id} className="rounded-full border border-slate-300/70 bg-white/70 px-3 py-2 text-xs font-semibold">{p.name}</span>)}</div> : null}</>}<button disabled={!canContinuePlayers} onClick={() => setStep(mode === "singles" ? "category" : "teams")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}</> : null}

    {step === "teams" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Bygg lagen</p><h1 className="mt-1 font-display text-4xl">Vem spelar med dig?</h1></section><div className="mt-5 space-y-3">{selectedOthers.map((p) => { const sel = blueMateId === p.id; return <button key={p.id} onClick={() => setBlueMateId(p.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${sel ? blueGlass : glass}`}><PlayerAvatar player={p} tone={sel ? "blue" : "red"} /><span className="min-w-0 flex-1"><span className="block font-display text-xl">{p.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{sel ? "Blue Team" : "Välj som lagkamrat"}</span></span>{sel ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>; })}</div><button disabled={!teamsReady} onClick={() => setStep("category")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "category" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Välj kategori</p><h1 className="mt-1 font-display text-4xl">Vad ska ni spela?</h1></section><div className="mt-5 grid grid-cols-2 gap-3">{CATEGORIES.map((i) => { const active = category === i.id; return <button key={i.id} onClick={() => { setCategory(i.id); setMatchType(null); }} className={`relative min-h-36 rounded-[26px] border p-4 text-left ${active ? selectedGlass : glass}`}><span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{i.subtitle}</span><span className="mt-2 block font-display text-2xl leading-none">{i.title}</span><span className="mt-2 block text-[11px] leading-relaxed text-slate-600">{i.description}</span>{active ? <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-sm"><Check className="h-4 w-4" /></span> : null}</button>; })}</div><button disabled={!category} onClick={() => setStep("type")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "type" && category ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{selectedCategory?.title}</p><h1 className="mt-1 font-display text-4xl">Välj matchtyp</h1></section><div className="mt-5 space-y-3">{MATCH_TYPES[category].map((i) => { const active = matchType === i.id; return <button key={i.id} onClick={() => setMatchType(i.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left ${active ? "border-slate-900 bg-slate-900 text-white" : glass}`}><span className="min-w-0 flex-1"><span className="block font-display text-2xl">{i.title}</span><span className={`mt-1 block text-xs ${active ? "text-white/60" : "text-slate-600"}`}>{i.description}</span></span>{active ? <Check className="h-5 w-5" /> : null}</button>; })}</div><button disabled={!matchType} onClick={() => setStep("length")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button></> : null}

    {step === "length" && selectedType ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Matchformat</p><h1 className="mt-1 font-display text-4xl">Bäst av</h1></section><div className="mt-5 grid grid-cols-3 gap-3">{([5, 9, 18] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`rounded-3xl border px-3 py-6 ${matchLength === v ? "border-slate-900 bg-slate-900 text-white" : glass}`}><span className="block font-display text-4xl">{v}</span><span className="text-[10px] font-bold uppercase">hål</span></button>)}</div><button onClick={startMatch} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button></> : null}

    {step === "play" && current ? <><header className="flex items-center justify-between"><button onClick={() => setStep("length")} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></button><div className="text-center"><p className="text-[9px] font-bold uppercase text-slate-500">{mode}</p><p className="font-display text-xl">{selectedType?.title}</p></div><span className="rounded-full border border-slate-300/80 bg-white/68 px-3 py-2 text-[10px] font-bold">Hål {holeIndex + 1}/{matchLength}</span></header>
      <section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2"><div className={`rounded-3xl border p-3 text-center ${diff > 0 ? "ring-2 ring-blue-500/70" : ""} ${blueGlass}`}><p className="text-[9px] font-bold uppercase text-blue-600">Blue</p><p className="mt-1 truncate text-xs font-bold">{blueLabel}</p><p className="mt-2 font-display text-3xl text-blue-700">{diff > 0 ? `${diff} UP` : diff < 0 ? `${Math.abs(diff)} DN` : "AS"}</p></div><div className="flex flex-col items-center justify-center text-center"><p className="text-[9px] font-bold uppercase text-slate-500">Match</p><p className="mt-1 rounded-xl bg-slate-950 px-3 py-2 font-display text-2xl text-white">{liveStatus(diff)}</p><p className="mt-2 text-[9px] font-bold uppercase text-slate-500">{holesRemaining} kvar</p></div><div className={`rounded-3xl border p-3 text-center ${diff < 0 ? "ring-2 ring-red-500/70" : ""} ${redGlass}`}><p className="text-[9px] font-bold uppercase text-red-600">Red</p><p className="mt-1 truncate text-xs font-bold">{redLabel}</p><p className="mt-2 font-display text-3xl text-red-700">{diff < 0 ? `${Math.abs(diff)} UP` : diff > 0 ? `${diff} DN` : "AS"}</p></div></section>
      <section className="mt-5 rounded-[32px] border border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58 p-6 text-center shadow-[0_24px_52px_-34px_rgba(37,99,235,.48)] backdrop-blur-2xl"><Target className="mx-auto h-6 w-6 text-blue-600" /><p className="mt-3 text-[10px] font-bold uppercase text-blue-600">{current.challenge.eyebrow}</p><h1 className="mt-1 font-display text-5xl">{current.challenge.title}</h1><p className="mt-3 text-xs text-slate-600">{current.challenge.detail}</p></section>
      <div className="mt-5 flex items-center justify-between"><h2 className="font-display text-2xl">Vem vann hålet?</h2><span className="text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</span></div><div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => recordWinner("blue")} className={`rounded-3xl border p-5 font-display text-xl text-blue-700 ${blueGlass}`}>{blueLabel}</button><button onClick={() => recordWinner("red")} className={`rounded-3xl border p-5 font-display text-xl text-red-700 ${redGlass}`}>{redLabel}</button></div><button onClick={() => recordWinner("tie")} className={`mt-3 w-full rounded-2xl border py-3.5 text-sm font-bold ${glass}`}>Delat hål · AS</button>
      <section className={`mt-5 rounded-[26px] border p-4 ${glass}`}><div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Matchkort</p><h3 className="mt-1 font-display text-xl">Hål för hål</h3></div><p className="text-right text-[10px] font-semibold text-slate-500">{score.played} spelade · {holesRemaining} kvar</p></div><div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{holes.map((hole, index) => { const active = index === holeIndex; const cls = hole.winner === "blue" ? "border-blue-500 bg-blue-500 text-white" : hole.winner === "red" ? "border-red-500 bg-red-500 text-white" : hole.winner === "tie" ? "border-slate-400 bg-slate-200 text-slate-700" : active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white/70 text-slate-500"; return <div key={index} className={`flex h-9 min-w-9 items-center justify-center rounded-xl border text-[10px] font-bold ${cls}`}>{index + 1}</div>; })}</div><div className="mt-3 flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-500" />Blue</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />Red</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-slate-300" />Delat</span></div></section></> : null}

    {step === "result" ? <><section className="mt-10 rounded-[34px] border border-slate-300/80 bg-gradient-to-br from-blue-100/72 via-white/80 to-red-100/64 p-6 text-center shadow-[0_24px_56px_-32px_rgba(15,23,42,.5)] backdrop-blur-2xl"><Trophy className="mx-auto h-8 w-8" /><p className="mt-4 text-[10px] font-bold uppercase text-slate-500">Match Result</p><h1 className="mt-2 font-display text-4xl">{finalText}</h1></section><button onClick={reset} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Ny match</button></> : null}

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}><SheetContent side="bottom" className="mx-auto max-h-[82vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8"><SheetHeader><SheetTitle>Välj spelare</SheetTitle></SheetHeader><div className="mt-4 space-y-3"><div className={`rounded-2xl border p-3 ${glass}`}><div className="flex items-center gap-2"><input value={guestName} onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} placeholder="Lägg till gästspelare" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button onClick={addGuest} disabled={!guestName.trim() || selectedOthers.length >= neededOthers} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button></div></div>{guests.map((g) => <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-3"><PlayerAvatar player={g} tone="red" /><span className="flex-1 text-sm font-semibold">{g.name}</span><button onClick={() => removeGuest(g.id)}><X className="h-4 w-4 text-slate-500" /></button></div>)}{loadingSocial ? <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : friends.map((f) => { const active = selectedFriendIds.includes(f.other.id); const full = selectedOthers.length >= neededOthers && !active; return <button key={f.id} disabled={full} onClick={() => toggleFriend(f.other.id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 text-left disabled:opacity-35"><PlayerAvatar player={{ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }} tone="red" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.other.displayName}</span>{active ? <Check className="h-5 w-5 text-red-600" /> : null}</button>; })}{mode !== "singles" && selectedOthers.length < neededOthers ? <button onClick={() => setPickerOpen(false)} className="w-full rounded-2xl border border-slate-300 bg-white/70 py-3.5 text-sm font-bold text-slate-700">Stäng · {selectedOthers.length}/{neededOthers}</button> : null}</div></SheetContent></Sheet>
  </main>;
}