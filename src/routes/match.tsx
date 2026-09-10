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

type Step = "players" | "teams" | "category" | "type" | "format" | "play" | "result";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type HoleWinner = "blue" | "red" | "tie" | null;
type Challenge = { title: string; detail: string; eyebrow?: string };
type MatchMode = "singles" | "fourball" | "foursomes";
type MatchLength = 3 | 5 | 9;
type Hole = { challenge: Challenge; winner: HoleWinner };
type Player = { id: string; name: string; avatarUrl?: string | null; isSelf?: boolean; isGuest?: boolean };

const CATEGORIES = [
  { id: "off-the-tee", title: "Off the Tee", subtitle: "Utslag från tee", description: "Driver, fairway, längd och bollflykt." },
  { id: "approach", title: "Approach", subtitle: "Inspel mot green", description: "Precision, längdkontroll och shot shaping." },
  { id: "around-the-green", title: "Around the Green", subtitle: "Slag runt green", description: "Chip, pitch, bunker, lob och up & down." },
  { id: "putting", title: "Putting", subtitle: "Puttning på green", description: "Kortputt, lag putting och blandade puttar." },
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

const MATCH_MODES: Array<{ id: MatchMode; title: string; subtitle: string; description: string }> = [
  { id: "singles", title: "Singles", subtitle: "1 mot 1", description: "Klassisk individuell match play." },
  { id: "fourball", title: "Fourball", subtitle: "2 mot 2 · bästa boll", description: "Båda spelar. Lagets bästa resultat räknas." },
  { id: "foursomes", title: "Foursomes", subtitle: "2 mot 2 · vartannat slag", description: "Laget turas om slag för slag." },
];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(items: readonly T[]) { return items[Math.floor(Math.random() * items.length)]; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(""); }

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

function liveStatus(diff: number) { return diff === 0 ? "AS" : diff > 0 ? `${diff} UP` : `${Math.abs(diff)} DN`; }

function PlayerAvatar({ player, tone }: { player: Player; tone: "blue" | "red" }) {
  const cls = tone === "blue" ? "border-blue-500 bg-blue-500/10 text-blue-600" : "border-red-500 bg-red-500/10 text-red-600";
  return <span className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-[3px] font-display text-xs ${cls}`}>
    {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(player.name) || <User className="h-4 w-4" />}
  </span>;
}

function MatchPlayPage() {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("players");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mode, setMode] = useState<MatchMode>("singles");
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
  const selectedFriends: Player[] = friends
    .filter((f) => selectedFriendIds.includes(f.other.id))
    .map((f) => ({ id: f.other.id, name: f.other.displayName, avatarUrl: f.other.avatarUrl }));
  const selectedOthers = [...selectedFriends, ...guests];
  const selectedPlayers = [selfPlayer, ...selectedOthers];
  const neededOthers = mode === "singles" ? 1 : 3;
  const canContinuePlayers = selectedOthers.length === neededOthers;
  const blueMate = selectedPlayers.find((p) => p.id === blueMateId) ?? null;
  const blueTeam = mode === "singles" ? [selfPlayer] : [selfPlayer, ...(blueMate ? [blueMate] : [])];
  const redTeam = selectedPlayers.filter((p) => !blueTeam.some((b) => b.id === p.id));
  const teamsReady = mode === "singles" || (blueTeam.length === 2 && redTeam.length === 2);
  const selectedCategory = CATEGORIES.find((i) => i.id === category);
  const selectedType = category ? MATCH_TYPES[category].find((i) => i.id === matchType) : null;
  const score = useMemo(() => matchScore(holes), [holes]);
  const diff = score.blue - score.red;
  const current = holes[holeIndex];
  const loadingSocial = loading || friendsLoading;

  const glass = "border-slate-300/75 bg-white/68 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/55 bg-gradient-to-br from-blue-100/68 via-white/68 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(37,99,235,.46)] backdrop-blur-2xl";
  const redGlass = "border-red-300/55 bg-gradient-to-br from-red-100/62 via-white/68 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(239,68,68,.40)] backdrop-blur-2xl";

  function chooseMode(next: MatchMode) {
    setMode(next);
    setSelectedFriendIds([]);
    setGuests([]);
    setGuestName("");
    setBlueMateId(null);
  }

  function toggleFriend(id: string) {
    setSelectedFriendIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length + guests.length >= neededOthers) return ids;
      return [...ids, id];
    });
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name || selectedOthers.length >= neededOthers) return;
    setGuests((old) => [...old, { id: `guest-${Date.now()}-${old.length}`, name, isGuest: true }]);
    setGuestName("");
  }

  function removeGuest(id: string) {
    setGuests((old) => old.filter((g) => g.id !== id));
    if (blueMateId === id) setBlueMateId(null);
  }

  function startMatch() {
    if (!teamsReady || !category || !matchType) return;
    setHoles(Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType, mode), winner: null })));
    setHoleIndex(0);
    setFinalText("");
    setStep("play");
  }

  function recordWinner(w: Exclude<HoleWinner, null>) {
    const next = holes.map((h, i) => i === holeIndex ? { ...h, winner: w } : h);
    const s = matchScore(next);
    const d = s.blue - s.red;
    const rem = matchLength - s.played;
    setHoles(next);
    if (Math.abs(d) > rem || s.played >= matchLength) {
      if (d === 0) setFinalText("Matchen slutar delad · AS");
      else if (Math.abs(d) > rem) setFinalText(`${d > 0 ? "Blue" : "Red"} vinner ${Math.abs(d)} & ${rem}`);
      else setFinalText(`${d > 0 ? "Blue" : "Red"} vinner ${Math.abs(d)} UP`);
      setStep("result");
      return;
    }
    setHoleIndex(Math.min(holeIndex + 1, matchLength - 1));
  }

  function reset() {
    setMode("singles");
    setSelectedFriendIds([]);
    setGuests([]);
    setGuestName("");
    setBlueMateId(null);
    setCategory(null);
    setMatchType(null);
    setMatchLength(5);
    setHoles([]);
    setHoleIndex(0);
    setFinalText("");
    setStep("players");
  }

  function back() {
    if (step === "teams") setStep("players");
    else if (step === "category") setStep(mode === "singles" ? "players" : "teams");
    else if (step === "type") setStep("category");
    else if (step === "format") setStep("type");
  }

  return <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
    {step !== "play" && step !== "result" ? <header className="flex items-center justify-between">
      <button onClick={back} disabled={step === "players"} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass} disabled:opacity-30`}><ArrowLeft className="h-4 w-4" /></button>
      <div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match Play</p><p className="text-[11px] font-semibold text-slate-700">{step === "players" ? "1 · Spelare" : step === "teams" ? "2 · Lag" : step === "category" ? `${mode === "singles" ? 2 : 3} · Kategori` : step === "type" ? `${mode === "singles" ? 3 : 4} · Matchtyp` : `${mode === "singles" ? 4 : 5} · Format`}</p></div>
      <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}>×</Link>
    </header> : null}

    {step === "players" ? <>
      <section className="mt-5 rounded-[32px] border border-slate-300/80 bg-gradient-to-br from-blue-100/62 via-white/78 to-red-100/56 p-5 shadow-[0_24px_56px_-34px_rgba(15,23,42,.48)] backdrop-blur-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Match Play</p><h1 className="mt-1 font-display text-4xl leading-none">Välj format & spelare</h1><p className="mt-3 text-xs text-slate-600">Spela med SG4-vänner eller lägg till gäster utan profil.</p>
      </section>
      <div className="mt-5 grid grid-cols-3 gap-2">{MATCH_MODES.map((m) => <button key={m.id} onClick={() => chooseMode(m.id)} className={`rounded-3xl border p-3 text-center ${mode === m.id ? "border-slate-900 bg-slate-900 text-white" : glass}`}><span className="block font-display text-lg">{m.title}</span><span className={`mt-1 block text-[9px] font-bold uppercase ${mode === m.id ? "text-white/65" : "text-slate-500"}`}>{m.subtitle}</span></button>)}</div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button disabled={loadingSocial || !user || friends.length === 0 || selectedOthers.length >= neededOthers} onClick={() => setPickerOpen(true)} className={`rounded-3xl border p-4 text-left ${glass} disabled:opacity-40`}><Users className="h-5 w-5 text-blue-600" /><span className="mt-3 block font-display text-xl">Välj vän</span><span className="mt-1 block text-[10px] text-slate-500">SG4-profil</span></button>
        <button onClick={() => document.getElementById("guest-player-name")?.focus()} disabled={selectedOthers.length >= neededOthers} className={`rounded-3xl border p-4 text-left ${redGlass} disabled:opacity-40`}><User className="h-5 w-5 text-red-600" /><span className="mt-3 block font-display text-xl">Lägg till gäst</span><span className="mt-1 block text-[10px] text-slate-500">Ingen profil krävs</span></button>
      </div>

      <section className={`mt-3 rounded-3xl border p-4 ${glass}`}>
        <div className="flex items-center gap-2">
          <input id="guest-player-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addGuest(); }} disabled={selectedOthers.length >= neededOthers} placeholder="Namn på gästspelare" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-40" />
          <button onClick={addGuest} disabled={!guestName.trim() || selectedOthers.length >= neededOthers} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between"><h2 className="font-display text-2xl">Spelare</h2><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{selectedOthers.length}/{neededOthers} valda</span></div>
      <div className="mt-2 space-y-2">{selectedOthers.length ? selectedOthers.map((p) => <div key={p.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${p.isGuest ? redGlass : blueGlass}`}><PlayerAvatar player={p} tone={p.isGuest ? "red" : "blue"} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{p.name}</span><span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{p.isGuest ? "Gästspelare" : "SG4-vän"}</span></span>{p.isGuest ? <button onClick={() => removeGuest(p.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-slate-500"><X className="h-4 w-4" /></button> : null}</div>) : <div className={`rounded-3xl border p-4 text-center text-xs text-slate-500 ${glass}`}>Välj en vän eller skriv in en gästspelare.</div>}</div>

      {!loadingSocial && friends.length === 0 ? <div className={`mt-4 rounded-2xl border p-3 text-center text-[11px] text-slate-600 ${glass}`}>Inga SG4-vänner? Inga problem — lägg till gästspelare ovan.</div> : null}
      <button disabled={!canContinuePlayers} onClick={() => setStep(mode === "singles" ? "category" : "teams")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button>
    </> : null}

    {step === "teams" ? <>
      <section className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Bygg lagen</p><h1 className="mt-1 font-display text-4xl leading-none">Vem spelar med dig?</h1><p className="mt-2 text-xs text-slate-600">Du är i Blue. Välj en av de tre andra som lagkamrat.</p></section>
      <div className="mt-5 space-y-3">{selectedOthers.map((p) => { const sel = blueMateId === p.id; return <button key={p.id} onClick={() => setBlueMateId(p.id)} className={`flex w-full items-center gap-4 rounded-3xl border p-4 text-left ${sel ? blueGlass : glass}`}><PlayerAvatar player={p} tone={sel ? "blue" : "red"} /><span className="min-w-0 flex-1"><span className="block font-display text-xl">{p.name}</span><span className="text-[10px] font-bold uppercase text-slate-500">{p.isGuest ? "Gäst · " : ""}{sel ? "Blue Team" : "Välj som lagkamrat"}</span></span>{sel ? <Check className="h-5 w-5 text-blue-600" /> : null}</button>; })}</div>
      {teamsReady ? <section className="mt-5 grid grid-cols-2 gap-3"><div className={`rounded-3xl border p-4 ${blueGlass}`}><p className="text-[10px] font-bold uppercase text-blue-600">Blue Team</p>{blueTeam.map((p) => <div key={p.id} className="mt-3 flex items-center gap-2"><PlayerAvatar player={p} tone="blue" /><span className="truncate text-xs font-bold">{p.name}</span></div>)}</div><div className={`rounded-3xl border p-4 ${redGlass}`}><p className="text-[10px] font-bold uppercase text-red-600">Red Team</p>{redTeam.map((p) => <div key={p.id} className="mt-3 flex items-center gap-2"><PlayerAvatar player={p} tone="red" /><span className="truncate text-xs font-bold">{p.name}</span></div>)}</div></section> : null}
      <button disabled={!teamsReady} onClick={() => setStep("category")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white disabled:opacity-30">Lagen är klara <ChevronRight className="h-5 w-5" /></button>
    </> : null}

    {step === "category" ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Välj kategori</p><h1 className="mt-1 font-display text-4xl">Vad ska ni spela?</h1></section><div className="mt-5 space-y-3">{CATEGORIES.map((i, index) => <button key={i.id} onClick={() => { setCategory(i.id); setMatchType(null); setStep("type"); }} className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left ${index % 2 === 0 ? blueGlass : redGlass}`}><span className="min-w-0 flex-1"><span className="block font-display text-2xl">{i.title}</span><span className="text-[11px] font-semibold text-slate-700">{i.subtitle}</span><span className="mt-1 block text-xs text-slate-600">{i.description}</span></span><ChevronRight className="h-5 w-5 text-slate-500" /></button>)}</div></> : null}

    {step === "type" && category ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">{selectedCategory?.title}</p><h1 className="mt-1 font-display text-4xl">Välj matchtyp</h1></section><div className="mt-5 space-y-3">{MATCH_TYPES[category].map((i, index) => <button key={i.id} onClick={() => { setMatchType(i.id); setStep("format"); }} className={`flex w-full items-center gap-4 rounded-3xl border p-5 text-left ${index === 1 ? redGlass : blueGlass}`}><span className="min-w-0 flex-1"><span className="block font-display text-2xl">{i.title}</span><span className="mt-1 block text-xs text-slate-600">{i.description}</span></span><ChevronRight className="h-5 w-5 text-slate-500" /></button>)}</div></> : null}

    {step === "format" && selectedType ? <><section className="mt-5"><p className="text-[10px] font-bold uppercase text-slate-500">Matchformat</p><h1 className="mt-1 font-display text-4xl">Bäst av</h1></section><div className="mt-5 grid grid-cols-3 gap-3">{([3, 5, 9] as const).map((v) => <button key={v} onClick={() => setMatchLength(v)} className={`rounded-3xl border px-3 py-6 ${matchLength === v ? "border-slate-900 bg-slate-900 text-white" : glass}`}><span className="block font-display text-4xl">{v}</span><span className="text-[10px] font-bold uppercase">hål</span></button>)}</div><section className={`mt-5 rounded-3xl border p-5 ${glass}`}><div className="flex justify-between text-sm"><span className="text-slate-500">Spelform</span><b>{mode === "singles" ? "Singles" : mode === "fourball" ? "Fourball · bästa boll" : "Foursomes · vartannat slag"}</b></div><div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Kategori</span><b>{selectedCategory?.title}</b></div><div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Match</span><b>{selectedType.title}</b></div></section><button onClick={startMatch} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 py-4 font-display text-xl text-white"><Flag className="h-5 w-5" /> Starta match</button></> : null}

    {step === "play" && current ? <><header className="flex items-center justify-between"><button onClick={() => setStep("format")} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></button><div className="text-center"><p className="text-[9px] font-bold uppercase text-slate-500">{mode === "fourball" ? "Fourball" : mode === "foursomes" ? "Foursomes" : "Singles"}</p><p className="font-display text-xl">{selectedType?.title}</p></div><span className="rounded-full border border-slate-300/80 bg-white/68 px-3 py-2 text-[10px] font-bold">Hål {holeIndex + 1}/{matchLength}</span></header><section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className={`rounded-3xl border p-3 text-center ${blueGlass}`}><p className="text-[9px] font-bold uppercase text-blue-600">Blue</p><p className="mt-1 truncate text-xs font-bold">{blueTeam.map((p) => p.name).join(" + ")}</p></div><div className="text-center"><p className="text-[9px] font-bold uppercase text-slate-500">Match</p><p className="mt-1 rounded-xl bg-slate-950 px-3 py-2 font-display text-2xl text-white">{liveStatus(diff)}</p></div><div className={`rounded-3xl border p-3 text-center ${redGlass}`}><p className="text-[9px] font-bold uppercase text-red-600">Red</p><p className="mt-1 truncate text-xs font-bold">{redTeam.map((p) => p.name).join(" + ")}</p></div></section><section className="mt-5 rounded-[32px] border border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58 p-6 text-center shadow-[0_24px_52px_-34px_rgba(37,99,235,.48)] backdrop-blur-2xl"><Target className="mx-auto h-6 w-6 text-blue-600" /><p className="mt-3 text-[10px] font-bold uppercase text-blue-600">{current.challenge.eyebrow}</p><h1 className="mt-1 font-display text-5xl">{current.challenge.title}</h1><p className="mt-3 text-xs text-slate-600">{current.challenge.detail}</p></section><div className="mt-5 flex items-center justify-between"><h2 className="font-display text-2xl">Vem vann hålet?</h2><span className="text-[10px] font-bold uppercase text-slate-500">{score.played} spelade</span></div><div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => recordWinner("blue")} className={`rounded-3xl border p-5 font-display text-2xl text-blue-700 ${blueGlass}`}>Blue</button><button onClick={() => recordWinner("red")} className={`rounded-3xl border p-5 font-display text-2xl text-red-700 ${redGlass}`}>Red</button></div><button onClick={() => recordWinner("tie")} className={`mt-3 w-full rounded-2xl border py-3.5 text-sm font-bold ${glass}`}>Delat hål · AS</button></> : null}

    {step === "result" ? <><section className="mt-10 rounded-[34px] border border-slate-300/80 bg-gradient-to-br from-blue-100/72 via-white/80 to-red-100/64 p-6 text-center shadow-[0_24px_56px_-32px_rgba(15,23,42,.5)] backdrop-blur-2xl"><Trophy className="mx-auto h-8 w-8" /><p className="mt-4 text-[10px] font-bold uppercase text-slate-500">Match Result</p><h1 className="mt-2 font-display text-4xl">{finalText}</h1><div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center"><div><p className="font-display text-5xl text-blue-600">{score.blue}</p><p className="text-xs font-bold">Blue</p></div><span className="text-slate-400">—</span><div><p className="font-display text-5xl text-red-600">{score.red}</p><p className="text-xs font-bold">Red</p></div></div></section><button onClick={reset} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Ny match</button></> : null}

    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}><SheetContent side="bottom" className="mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8"><SheetHeader><SheetTitle>Välj SG4-vän</SheetTitle></SheetHeader>{loadingSocial ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : !user ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Du kan använda gästspelare utan att logga in.</div> : friends.length ? <><div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">{friends.map((f) => { const active = selectedFriendIds.includes(f.other.id); const full = selectedOthers.length >= neededOthers && !active; return <button key={f.id} disabled={full} onClick={() => toggleFriend(f.other.id)} className="flex w-full items-center gap-3 bg-card px-3.5 py-3.5 text-left disabled:opacity-35"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500/70 bg-blue-500/10 text-xs font-bold text-blue-600">{f.other.avatarUrl ? <img src={f.other.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(f.other.displayName)}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.other.displayName}</span>{active ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white"><Check className="h-4 w-4" /></span> : null}</button>; })}</div><button onClick={() => setPickerOpen(false)} className="mt-4 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-bold text-white">Klar · {selectedOthers.length}/{neededOthers}</button></> : <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Du har inga accepterade vänner ännu. Stäng och lägg till en gästspelare istället.</div>}</SheetContent></Sheet>
  </main>;
}
