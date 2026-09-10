import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Flag, RotateCcw, Target, Trophy, User, Users } from "lucide-react";
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

type Step = "opponent" | "category" | "type" | "format" | "play" | "result";
type MatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type HoleWinner = "self" | "friend" | "tie" | null;
type Challenge = { title: string; detail: string; eyebrow?: string };
type MatchType = { id: string; title: string; description: string };

type Hole = {
  challenge: Challenge;
  winner: HoleWinner;
};

const CATEGORIES: Array<{ id: MatchCategory; title: string; subtitle: string; description: string }> = [
  { id: "off-the-tee", title: "Off the Tee", subtitle: "Utslag från tee", description: "Driver, fairway, längd och bollflykt." },
  { id: "approach", title: "Approach", subtitle: "Inspel mot green", description: "Precision, längdkontroll och shot shaping." },
  { id: "around-the-green", title: "Around the Green", subtitle: "Slag runt green", description: "Chip, pitch, bunker, lob och up & down." },
  { id: "putting", title: "Putting", subtitle: "Puttning på green", description: "Kortputt, lag putting och blandade puttar." },
];

const MATCH_TYPES: Record<MatchCategory, MatchType[]> = {
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

const FORMATS = [3, 5, 9] as const;
type MatchLength = (typeof FORMATS)[number];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateChallenge(category: MatchCategory, typeId: string): Challenge {
  if (category === "putting") {
    if (typeId === "lag") {
      const distance = rand(8, 20);
      return { eyebrow: "Lag Putting", title: `${distance} m`, detail: "En boll var · närmast hål vinner" };
    }
    if (typeId === "short") {
      const distance = rand(1, 3);
      return { eyebrow: "Short Putting", title: `${distance} m`, detail: "Tre bollar var · flest sänkta vinner" };
    }
    return Math.random() > 0.45
      ? { eyebrow: "Short Putting", title: `${rand(1, 3)} m`, detail: "Tre bollar var · flest sänkta vinner" }
      : { eyebrow: "Lag Putting", title: `${rand(8, 20)} m`, detail: "En boll var · närmast hål vinner" };
  }

  if (category === "around-the-green") {
    const shot = pick(["Chip", "Pitch", "Bunker", "Lob"] as const);
    const distance = shot === "Chip" ? rand(5, 12) : shot === "Bunker" ? rand(8, 16) : rand(12, 30);
    return typeId === "up-down"
      ? { eyebrow: shot, title: `${distance} m från flaggan`, detail: "Spela ut hålet · lägst antal slag vinner" }
      : { eyebrow: shot, title: `${distance} m från flaggan`, detail: "En boll var · närmast flaggan vinner" };
  }

  if (category === "approach") {
    const distance = rand(typeId === "control" ? 60 : 80, typeId === "shape" ? 170 : 180);
    if (typeId === "shape") {
      const shape = pick(["Draw", "Fade"] as const);
      return { eyebrow: shape, title: `${distance} m`, detail: "Rätt bollflykt + närmast flaggan vinner" };
    }
    if (typeId === "control") return { eyebrow: "Distance Control", title: `${distance} m`, detail: "Bäst längdkontroll mot målavståndet vinner" };
    return { eyebrow: "Closest to Pin", title: `${distance} m`, detail: "En boll var · närmast flaggan vinner" };
  }

  if (typeId === "distance") return { eyebrow: "Off the Tee", title: "Long Drive", detail: "Längsta godkända drive inom spelkorridoren vinner" };
  if (typeId === "shape") {
    const shape = pick(["Draw", "Fade"] as const);
    return { eyebrow: "Driver", title: shape, detail: "Rätt bollflykt och spelbar drive vinner" };
  }
  return { eyebrow: "Driver", title: "Fairway Challenge", detail: "30 m spelkorridor · träff slår miss" };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function matchScore(holes: Hole[]) {
  return holes.reduce((score, hole) => {
    if (hole.winner === "self") score.self += 1;
    if (hole.winner === "friend") score.friend += 1;
    if (hole.winner !== null) score.played += 1;
    return score;
  }, { self: 0, friend: 0, played: 0 });
}

function liveStatus(diff: number) {
  if (diff === 0) return "AS";
  return diff > 0 ? `${diff} UP` : `${Math.abs(diff)} DN`;
}

function MatchPlayPage() {
  useHideBottomNav(true);
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("opponent");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [selfName, setSelfName] = useState("Du");
  const [selfAvatar, setSelfAvatar] = useState<string | null>(() => loadCardProfile().photo ?? null);
  const [category, setCategory] = useState<MatchCategory | null>(null);
  const [matchType, setMatchType] = useState<string | null>(null);
  const [matchLength, setMatchLength] = useState<MatchLength>(5);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [finalText, setFinalText] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setFriends([]);
      setFriendsLoading(false);
      return;
    }

    let cancelled = false;
    setFriendsLoading(true);
    void listFriendships().then((result) => {
      if (cancelled) return;
      setFriends(result.accepted);
      setFriendsLoading(false);
    });
    void supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      if (data?.display_name) setSelfName(data.display_name);
      if (data?.avatar_url) setSelfAvatar(data.avatar_url);
    });

    return () => { cancelled = true; };
  }, [user, loading]);

  function chooseFriend(friend: Friendship) {
    setSelectedFriend(friend);
    setPickerOpen(false);
  }

  function chooseCategory(next: MatchCategory) {
    setCategory(next);
    setMatchType(null);
    setStep("type");
  }

  function startMatch() {
    if (!selectedFriend || !category || !matchType) return;
    setHoles(Array.from({ length: matchLength }, () => ({ challenge: generateChallenge(category, matchType), winner: null })));
    setHoleIndex(0);
    setFinalText("");
    setStep("play");
  }

  function recordWinner(winner: Exclude<HoleWinner, null>) {
    const next = holes.map((hole, i) => i === holeIndex ? { ...hole, winner } : hole);
    const score = matchScore(next);
    const diff = score.self - score.friend;
    const remaining = matchLength - score.played;
    const clinched = Math.abs(diff) > remaining;
    const allDone = score.played >= matchLength;

    setHoles(next);

    if (clinched || allDone) {
      if (diff === 0) {
        setFinalText("Matchen slutar delad · AS");
      } else if (clinched) {
        const winnerName = diff > 0 ? selfName : selectedFriend?.other.displayName ?? "Motståndaren";
        setFinalText(`${winnerName} vinner ${Math.abs(diff)} & ${remaining}`);
      } else {
        const winnerName = diff > 0 ? selfName : selectedFriend?.other.displayName ?? "Motståndaren";
        setFinalText(`${winnerName} vinner ${Math.abs(diff)} UP`);
      }
      setStep("result");
      return;
    }

    setHoleIndex(Math.min(holeIndex + 1, matchLength - 1));
  }

  function resetMatch() {
    setCategory(null);
    setMatchType(null);
    setMatchLength(5);
    setHoles([]);
    setHoleIndex(0);
    setFinalText("");
    setStep("opponent");
  }

  const score = useMemo(() => matchScore(holes), [holes]);
  const diff = score.self - score.friend;
  const selectedCategory = CATEGORIES.find((item) => item.id === category);
  const selectedType = category ? MATCH_TYPES[category].find((item) => item.id === matchType) : null;
  const current = holes[holeIndex];
  const loadingSocial = loading || friendsLoading;

  const glass = "border-slate-300/75 bg-white/68 shadow-[0_18px_44px_-32px_rgba(15,23,42,.42)] backdrop-blur-2xl";
  const blueGlass = "border-blue-300/55 bg-gradient-to-br from-blue-100/68 via-white/68 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(37,99,235,.46)] backdrop-blur-2xl";
  const redGlass = "border-red-300/55 bg-gradient-to-br from-red-100/62 via-white/68 to-slate-100/72 shadow-[0_18px_44px_-32px_rgba(239,68,68,.40)] backdrop-blur-2xl";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
      {step !== "play" && step !== "result" ? (
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step === "opponent") return;
              if (step === "category") setStep("opponent");
              if (step === "type") setStep("category");
              if (step === "format") setStep("type");
            }}
            disabled={step === "opponent"}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass} disabled:opacity-30`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match Play</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-700">
              {step === "opponent" ? "1 · Motståndare" : step === "category" ? "2 · Kategori" : step === "type" ? "3 · Matchtyp" : "4 · Format"}
            </p>
          </div>
          <Link to="/" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`} aria-label="Stäng">×</Link>
        </header>
      ) : null}

      {step === "opponent" ? (
        <>
          <section className="mt-5 rounded-[32px] border border-slate-300/80 bg-gradient-to-br from-blue-100/62 via-white/78 to-red-100/56 p-5 shadow-[0_24px_56px_-34px_rgba(15,23,42,.48)] backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Match Play</p>
                <h1 className="mt-1 font-display text-4xl leading-none">Välj motståndare</h1>
              </div>
              <Flag className="h-7 w-7 text-slate-700" />
            </div>
            <p className="mt-3 max-w-[30ch] text-xs leading-relaxed text-slate-600">Ryder Cup-format för träning. Vinn hål, gå UP och stäng matchen.</p>
          </section>

          <section className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className={`flex min-h-40 flex-col items-center justify-center rounded-3xl border p-4 text-center ${blueGlass}`}>
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-blue-500 bg-blue-500/10 font-display text-xl text-blue-600">
                {selfAvatar ? <img src={selfAvatar} alt="" className="h-full w-full object-cover" /> : initials(selfName) || <User className="h-7 w-7" />}
              </span>
              <p className="mt-3 max-w-full truncate text-sm font-bold">{selfName}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Blue</p>
            </div>

            <span className="rounded-xl bg-slate-900 px-2.5 py-2 font-display text-xl text-white">VS</span>

            <button type="button" disabled={loadingSocial || !user} onClick={() => setPickerOpen(true)} className={`flex min-h-40 flex-col items-center justify-center rounded-3xl border p-4 text-center transition-transform active:scale-[0.99] disabled:opacity-50 ${redGlass}`}>
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-red-500 bg-red-500/10 font-display text-xl text-red-600">
                {selectedFriend?.other.avatarUrl ? <img src={selectedFriend.other.avatarUrl} alt="" className="h-full w-full object-cover" /> : selectedFriend ? initials(selectedFriend.other.displayName) : <User className="h-7 w-7" />}
              </span>
              <p className="mt-3 max-w-full truncate text-sm font-bold">{selectedFriend?.other.displayName ?? (loadingSocial ? "Laddar…" : "Välj spelare")}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">Red</p>
            </button>
          </section>

          {!loadingSocial && !user ? <div className={`mt-5 rounded-3xl border p-4 text-center text-xs text-slate-600 ${glass}`}>Logga in för att välja en vän.</div> : null}
          {!loadingSocial && user && !friends.length ? <div className={`mt-5 rounded-3xl border p-4 text-center text-xs text-slate-600 ${glass}`}>Du har inga accepterade vänner ännu. <Link to="/vanner" className="font-bold text-blue-600">Lägg till vänner</Link></div> : null}

          <button type="button" disabled={!selectedFriend} onClick={() => setStep("category")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/50 bg-gradient-to-br from-blue-500/90 via-blue-500/82 to-blue-600/88 py-4 font-display text-xl text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,.7)] backdrop-blur-xl disabled:opacity-30">Nästa <ChevronRight className="h-5 w-5" /></button>
        </>
      ) : null}

      {step === "category" ? (
        <>
          <section className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Välj kategori</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Vad ska ni spela?</h1>
            <p className="mt-2 text-xs text-slate-600">Välj en av SG4:s fyra huvudkategorier.</p>
          </section>
          <div className="mt-5 space-y-3">
            {CATEGORIES.map((item, index) => (
              <button key={item.id} type="button" onClick={() => chooseCategory(item.id)} className={`group flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition-transform active:scale-[0.99] ${index % 2 === 0 ? blueGlass : redGlass}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${index % 2 === 0 ? "border-blue-300/70 bg-blue-500/10 text-blue-600" : "border-red-300/70 bg-red-500/10 text-red-600"}`}><Target className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl leading-none">{item.title}</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-700">{item.subtitle}</span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{item.description}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === "type" && category ? (
        <>
          <section className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{selectedCategory?.title}</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Välj matchtyp</h1>
            <p className="mt-2 text-xs text-slate-600">SG4 genererar samma utmaning till båda spelarna på varje hål.</p>
          </section>
          <div className="mt-5 space-y-3">
            {MATCH_TYPES[category].map((item, index) => (
              <button key={item.id} type="button" onClick={() => { setMatchType(item.id); setStep("format"); }} className={`group flex w-full items-center gap-4 rounded-3xl border p-5 text-left transition-transform active:scale-[0.99] ${index === 1 ? redGlass : blueGlass}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${index === 1 ? "border-red-300/70 bg-red-500/10 text-red-600" : "border-blue-300/70 bg-blue-500/10 text-blue-600"}`}><Flag className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-display text-2xl leading-none">{item.title}</span><span className="mt-1.5 block text-xs leading-relaxed text-slate-600">{item.description}</span></span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === "format" && selectedFriend && category && selectedType ? (
        <>
          <section className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Matchformat</p>
            <h1 className="mt-1 font-display text-4xl leading-none">Bäst av</h1>
            <p className="mt-2 text-xs text-slate-600">Matchen kan avgöras tidigare om någon leder med fler hål än det återstår.</p>
          </section>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {FORMATS.map((value) => {
              const active = matchLength === value;
              return <button key={value} type="button" onClick={() => setMatchLength(value)} className={`rounded-3xl border px-3 py-6 text-center transition-transform active:scale-[0.98] ${active ? "border-blue-400/70 bg-gradient-to-br from-blue-100/85 via-white/75 to-red-50/70 shadow-[0_18px_36px_-24px_rgba(37,99,235,.55)]" : glass}`}><span className="block font-display text-4xl leading-none">{value}</span><span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">hål</span></button>;
            })}
          </div>

          <section className={`mt-5 rounded-3xl border p-5 ${glass}`}>
            <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Motståndare</span><span className="text-sm font-bold">{selectedFriend.other.displayName}</span></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">Kategori</span><span className="text-sm font-bold">{selectedCategory?.title}</span></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">Match</span><span className="text-sm font-bold">{selectedType.title}</span></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">Format</span><span className="text-sm font-bold">Bäst av {matchLength}</span></div>
          </section>

          <button type="button" onClick={startMatch} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/50 bg-gradient-to-r from-blue-600/90 via-slate-900/90 to-red-600/90 py-4 font-display text-xl text-white shadow-[0_20px_42px_-24px_rgba(15,23,42,.75)] backdrop-blur-xl"><Flag className="h-5 w-5" /> Starta match</button>
        </>
      ) : null}

      {step === "play" && selectedFriend && current && category && selectedType ? (
        <>
          <header className="flex items-center justify-between">
            <button type="button" onClick={() => setStep("format")} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></button>
            <div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">SG4 Match Play</p><p className="font-display text-xl">{selectedType.title}</p></div>
            <span className="rounded-full border border-slate-300/80 bg-white/68 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 backdrop-blur-xl">Hål {holeIndex + 1}/{matchLength}</span>
          </header>

          <section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className={`rounded-3xl border p-4 text-center ${blueGlass}`}>
              <span className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-blue-500 bg-blue-500/10 font-display text-sm text-blue-600">{selfAvatar ? <img src={selfAvatar} alt="" className="h-full w-full object-cover" /> : initials(selfName)}</span>
              <p className="mt-2 truncate text-xs font-bold">{selfName}</p>
            </div>
            <div className="text-center"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Match</p><p className="mt-1 rounded-xl bg-slate-950 px-3 py-2 font-display text-2xl text-white">{liveStatus(diff)}</p></div>
            <div className={`rounded-3xl border p-4 text-center ${redGlass}`}>
              <span className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-red-500 bg-red-500/10 font-display text-sm text-red-600">{selectedFriend.other.avatarUrl ? <img src={selectedFriend.other.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(selectedFriend.other.displayName)}</span>
              <p className="mt-2 truncate text-xs font-bold">{selectedFriend.other.displayName}</p>
            </div>
          </section>

          <section className="mt-5 rounded-[32px] border border-blue-300/55 bg-gradient-to-br from-blue-100/78 via-white/78 to-red-50/58 p-6 text-center shadow-[0_24px_52px_-34px_rgba(37,99,235,.48)] backdrop-blur-2xl">
            <Target className="mx-auto h-6 w-6 text-blue-600" />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">{current.challenge.eyebrow ?? selectedCategory?.title}</p>
            <h1 className="mt-1 font-display text-5xl leading-none">{current.challenge.title}</h1>
            <p className="mx-auto mt-3 max-w-[28ch] text-xs leading-relaxed text-slate-600">{current.challenge.detail}</p>
          </section>

          <div className="mt-5 flex items-center justify-between"><h2 className="font-display text-2xl leading-none">Vem vann hålet?</h2><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{score.played} spelade</span></div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => recordWinner("self")} className={`rounded-3xl border p-5 text-center active:scale-[0.99] ${blueGlass}`}><span className="block font-display text-2xl text-blue-700">{selfName}</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Blue vinner</span></button>
            <button type="button" onClick={() => recordWinner("friend")} className={`rounded-3xl border p-5 text-center active:scale-[0.99] ${redGlass}`}><span className="block truncate font-display text-2xl text-red-700">{selectedFriend.other.displayName}</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">Red vinner</span></button>
          </div>
          <button type="button" onClick={() => recordWinner("tie")} className={`mt-3 w-full rounded-2xl border py-3.5 text-sm font-bold text-slate-700 active:scale-[0.99] ${glass}`}>Delat hål · AS</button>

          <div className="mt-5 flex gap-1.5">
            {holes.map((hole, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index === holeIndex ? "bg-slate-900" : hole.winner === "self" ? "bg-blue-500" : hole.winner === "friend" ? "bg-red-500" : hole.winner === "tie" ? "bg-slate-400" : "bg-slate-200"}`} />)}
          </div>
        </>
      ) : null}

      {step === "result" && selectedFriend ? (
        <>
          <section className="mt-10 rounded-[34px] border border-slate-300/80 bg-gradient-to-br from-blue-100/72 via-white/80 to-red-100/64 p-6 text-center shadow-[0_24px_56px_-32px_rgba(15,23,42,.5)] backdrop-blur-2xl">
            <Trophy className="mx-auto h-8 w-8 text-slate-800" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Match Result</p>
            <h1 className="mt-2 font-display text-4xl leading-none">{finalText}</h1>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div><p className="font-display text-5xl text-blue-600">{score.self}</p><p className="mt-1 truncate text-xs font-bold">{selfName}</p></div>
              <span className="font-display text-2xl text-slate-400">—</span>
              <div><p className="font-display text-5xl text-red-600">{score.friend}</p><p className="mt-1 truncate text-xs font-bold">{selectedFriend.other.displayName}</p></div>
            </div>
          </section>

          <section className="mt-5 overflow-hidden rounded-3xl border border-slate-300/75 bg-white/68 backdrop-blur-2xl">
            {holes.filter((hole) => hole.winner !== null).map((hole, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 last:border-0">
                <span className="w-8 text-[10px] font-bold uppercase text-slate-400">H{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{hole.challenge.title}</span><span className="text-[10px] text-slate-500">{hole.challenge.eyebrow}</span></span>
                <span className={`text-[10px] font-bold uppercase ${hole.winner === "self" ? "text-blue-600" : hole.winner === "friend" ? "text-red-600" : "text-slate-500"}`}>{hole.winner === "self" ? "Blue" : hole.winner === "friend" ? "Red" : "AS"}</span>
              </div>
            ))}
          </section>

          <button type="button" onClick={resetMatch} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 font-display text-xl text-white"><RotateCcw className="h-5 w-5" /> Ny match</button>
        </>
      ) : null}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[78vh] max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8">
          <SheetHeader><SheetTitle>Välj motståndare</SheetTitle></SheetHeader>
          {loadingSocial ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Laddar vänner …</div> : !user ? <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Logga in för att välja en vän.</div> : friends.length ? <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">{friends.map((friend) => {
            const active = selectedFriend?.id === friend.id;
            return <button key={friend.id} type="button" onClick={() => chooseFriend(friend)} className="flex w-full items-center gap-3 bg-card px-3.5 py-3.5 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-red-500/70 bg-red-500/10 text-xs font-bold text-red-500">{friend.other.avatarUrl ? <img src={friend.other.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(friend.other.displayName) || <User className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{friend.other.displayName}</span>
              {active ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"><Check className="h-4 w-4" /></span> : null}
            </button>;
          })}</div> : <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">Du har inga accepterade vänner ännu. <Link to="/vanner" onClick={() => setPickerOpen(false)} className="font-semibold text-primary">Lägg till vänner ›</Link></div>}
        </SheetContent>
      </Sheet>
    </main>
  );
}
