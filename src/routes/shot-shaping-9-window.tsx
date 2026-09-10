import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, User, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "./8-bollar";
import { saveSession } from "@/lib/training/core";
import { HIT_MISS, NINE_WINDOW_PROMPTS, analyzeNineWindow } from "@/lib/training/tests";
import { useAuth } from "@/hooks/use-auth";
import { listFriendships, type Friendship } from "@/lib/friends-cloud";
import { loadCardProfile } from "@/lib/rating-card";

export const Route = createFileRoute("/shot-shaping-9-window")({
  head: () => ({ meta: [{ title: "9 Window Drill – Shot Shaping | SG4" }, { name: "description", content: "Nio slag: låg, medel och hög bollflykt i draw, rak och fade. Träningstest utan HCP." }] }),
  component: NineWindowPage,
});

const CLUB_GROUPS = [
  { label: "Driver", detail: "Driver" },
  { label: "Woods", detail: "3W–7W · Hybrid" },
  { label: "Låga järn", detail: "3i–6i" },
  { label: "Höga järn", detail: "7i–PW" },
];

const WINDOW_LABELS = [
  "Låg draw", "Låg rak", "Låg fade",
  "Medel draw", "Medel rak", "Medel fade",
  "Hög draw", "Hög rak", "Hög fade",
];

type Phase = "intro" | "test" | "result";
type Mode = "solo" | "friend" | null;
type Turn = "self" | "friend";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function Avatar({ name, url, friend = false, active = false }: { name: string; url?: string | null; friend?: boolean; active?: boolean }) {
  const tone = friend
    ? "border-slate-400 bg-slate-500/[0.08] text-slate-700"
    : "border-blue-500 bg-blue-500/[0.10] text-blue-700";
  const ring = friend ? "ring-slate-400/25" : "ring-blue-500/20";
  return (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-bold ${tone} ${active ? `ring-4 ring-offset-2 ring-offset-background ${ring}` : ""}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials(name) || <User className="h-4 w-4" />}
    </span>
  );
}

function WindowGrid({ shots, activeIndex }: { shots: number[]; activeIndex: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-3">
      {WINDOW_LABELS.map((label, index) => {
        const value = shots[index];
        const active = index === activeIndex && value === undefined;
        const tone = value === 1
          ? "border-emerald-500/70 bg-emerald-500/70 shadow-[0_12px_28px_-18px_rgba(16,185,129,.75)]"
          : value === 0
            ? "border-red-500/70 bg-red-500/70 shadow-[0_12px_28px_-18px_rgba(239,68,68,.75)]"
            : active
              ? "border-slate-600/70 bg-slate-600/70 shadow-[0_12px_28px_-18px_rgba(51,65,85,.65)]"
              : "border-slate-300/90 bg-slate-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]";
        const textTone = active ? "text-slate-800 font-bold" : value === 1 ? "text-emerald-700 font-bold" : value === 0 ? "text-red-700 font-bold" : "text-slate-500";
        return (
          <div key={label} className="min-w-0 text-center">
            <div className={`aspect-square w-full rounded-[22px] border backdrop-blur-xl transition-all ${tone}`} />
            <p className={`mt-1.5 truncate text-[10px] leading-none ${textTone}`}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

function NineWindowPage() {
  useHideBottomNav(true);
  const { user, displayName } = useAuth();
  const selfProfile = loadCardProfile();
  const selfName = displayName?.trim() || "Du";
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<Mode>(null);
  const [club, setClub] = useState<string>();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [shots, setShots] = useState<number[]>([]);
  const [friendShots, setFriendShots] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Turn>("self");
  const turnRef = useRef<Turn>("self");
  const withFriend = mode === "friend";
  const glass = "border-slate-200/95 bg-white/76 shadow-[0_16px_40px_-28px_rgba(15,23,42,.38)] backdrop-blur-2xl";
  const introGlass = "border-slate-300/90 bg-white/86 shadow-[0_20px_48px_-30px_rgba(15,23,42,.46)] backdrop-blur-2xl";

  useEffect(() => {
    if (!user) return;
    void listFriendships().then((result) => setFriends(result.accepted));
  }, [user]);

  function chooseMode(next: Exclude<Mode, null>) {
    setMode(next);
    setSelectedFriend(null);
    setClub(undefined);
  }

  function start() {
    if (!mode || !club || (withFriend && !selectedFriend)) return;
    setShots([]);
    setFriendShots([]);
    const starter: Turn = withFriend && Math.random() < 0.5 ? "friend" : "self";
    turnRef.current = starter;
    setCurrentPlayer(starter);
    setPhase("test");
  }

  function register(value: number) {
    if (withFriend && selectedFriend) {
      if (turnRef.current === "self") {
        const next = [...shots, value];
        setShots(next);
        if (next.length >= 9 && friendShots.length >= 9) {
          saveSession("shot-shaping-9-window", next, undefined, club);
          setPhase("result");
          return;
        }
        turnRef.current = "friend";
        setCurrentPlayer("friend");
        return;
      }
      const next = [...friendShots, value];
      setFriendShots(next);
      if (next.length >= 9 && shots.length >= 9) {
        saveSession("shot-shaping-9-window", shots, undefined, club);
        setPhase("result");
        return;
      }
      turnRef.current = "self";
      setCurrentPlayer("self");
      return;
    }

    const next = [...shots, value];
    setShots(next);
    if (next.length >= 9) {
      saveSession("shot-shaping-9-window", next, undefined, club);
      setPhase("result");
    }
  }

  function undo() {
    if (withFriend && selectedFriend) {
      const last: Turn = turnRef.current === "self" ? "friend" : "self";
      if (last === "self" && shots.length) setShots((s) => s.slice(0, -1));
      if (last === "friend" && friendShots.length) setFriendShots((s) => s.slice(0, -1));
      turnRef.current = last;
      setCurrentPlayer(last);
      return;
    }
    setShots((s) => s.slice(0, -1));
  }

  if (phase === "intro") {
    const friendReady = !withFriend || Boolean(selectedFriend);
    return (
      <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 pt-4 text-foreground">
        <div className="flex items-center justify-between">
          <Link to="/shot-shaping" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></Link>
          <Link to="/shot-shaping-9-window-historik" className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground ${glass}`}><BarChart3 className="h-3.5 w-3.5" /> Analys</Link>
        </div>

        <section className={`mt-5 rounded-[28px] border p-5 ${introGlass}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Shot Shaping · Höjd + shape</p>
          <h1 className="mt-2 font-display text-4xl leading-none">9 Window Drill</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">Nio bollfönster: låg, medel och hög i draw, rak och fade.</p>
        </section>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Steg 1 · Välj spelläge</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => chooseMode("solo")} className={`rounded-3xl border p-4 text-left backdrop-blur-xl ${mode === "solo" ? "border-blue-400/70 bg-blue-500/[0.10]" : "border-slate-300/80 bg-white/72"}`}><User className="h-4 w-4 text-blue-600" /><span className="mt-2 block font-display text-xl">Solo</span></button>
            <button onClick={() => chooseMode("friend")} className={`rounded-3xl border p-4 text-left backdrop-blur-xl ${mode === "friend" ? "border-slate-500/70 bg-slate-500/[0.08]" : "border-slate-300/80 bg-white/72"}`}><Users className="h-4 w-4 text-slate-600" /><span className="mt-2 block font-display text-xl">Med kompis</span></button>
          </div>
        </div>

        {withFriend ? <section className={`mt-3 rounded-3xl border p-4 ${glass}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Steg 2 · Välj kompis</p>
          <div className="mt-3 grid grid-cols-2 gap-2">{friends.map((friend) => {
            const selected = selectedFriend?.id === friend.id;
            return <button key={friend.id} onClick={() => { setSelectedFriend(friend); setClub(undefined); }} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left ${selected ? "border-slate-500 bg-slate-500/12" : "border-slate-300/80 bg-white/65"}`}><Avatar name={friend.other.displayName} url={friend.other.avatarUrl} friend /><span className="truncate text-sm font-semibold">{friend.other.displayName}</span></button>;
          })}</div>
          {!selectedFriend ? <p className="mt-3 text-xs font-semibold text-slate-600">Välj en kompis för att fortsätta.</p> : null}
        </section> : null}

        {mode && friendReady ? <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{withFriend ? "Steg 3 · Välj klubbgrupp" : "Steg 2 · Välj klubbgrupp"}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">{CLUB_GROUPS.map((group) => <button key={group.label} onClick={() => setClub(group.label)} className={`rounded-3xl border p-4 text-left backdrop-blur-xl ${club === group.label ? "border-blue-500/65 bg-blue-500/[0.12]" : "border-slate-300/90 bg-white/72"}`}><span className="block font-display text-xl">{group.label}</span><span className="mt-1 block text-[11px] font-semibold text-muted-foreground">{group.detail}</span></button>)}</div>
        </div> : null}

        <button onClick={start} disabled={!mode || !club || (withFriend && !selectedFriend)} className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground disabled:opacity-35">Starta test <ArrowRight className="h-5 w-5" /></button>
      </main>
    );
  }

  if (phase === "test") {
    const activeShots = withFriend ? (currentPlayer === "self" ? shots : friendShots) : shots;
    const activeIndex = Math.min(activeShots.length, 8);
    const prompt = NINE_WINDOW_PROMPTS[activeIndex];
    const friendName = selectedFriend?.other.displayName ?? "Kompis";
    const activeName = currentPlayer === "self" ? selfName : friendName;
    const activeAvatar = currentPlayer === "self" ? selfProfile.photo : selectedFriend?.other.avatarUrl;
    const activeHits = activeShots.filter((shot) => shot === 1).length;

    return (
      <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-6 text-foreground">
        <div className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
          <div><span className="text-sm font-semibold">Fönster {activeIndex + 1} av 9</span><span className="ml-2 rounded-full border border-slate-300/85 bg-white/70 px-2 py-1 text-[10px] font-semibold text-slate-600">{club}</span></div>
          <Link to="/shot-shaping" className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground ${glass}`}><X className="h-3.5 w-3.5" /> Avbryt</Link>
        </div>

        {withFriend ? <section className={`mt-3 rounded-[28px] border p-3.5 ${currentPlayer === "self" ? "border-blue-300/75 bg-white/80" : "border-slate-300/90 bg-white/80"} shadow-[0_18px_40px_-28px_rgba(15,23,42,.35)] backdrop-blur-2xl`}>
          <p className={`text-center text-[9px] font-bold uppercase tracking-[0.2em] ${currentPlayer === "self" ? "text-blue-600" : "text-slate-600"}`}>Nu spelar</p>
          <div className="mt-2 flex items-center justify-center gap-3"><Avatar name={activeName} url={activeAvatar} friend={currentPlayer === "friend"} active /><div><p className={`font-display text-3xl leading-none ${currentPlayer === "self" ? "text-blue-700" : "text-slate-700"}`}>{activeName}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{activeHits} träffar</p></div></div>
        </section> : null}

        <section className={`mt-3 rounded-[30px] border p-4 ${introGlass}`}>
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-slate-500">Aktuellt fönster</p><p className="mt-1 font-display text-2xl">{prompt.primary}</p></div>
            <span className="text-xs font-semibold text-muted-foreground">{activeShots.length}/9</span>
          </div>
          <WindowGrid shots={activeShots} activeIndex={activeIndex} />
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">{HIT_MISS.map((option) => {
          const hit = option.value === 1;
          const tone = hit ? "border-emerald-500/35 bg-emerald-500/[0.09] text-emerald-700 active:bg-emerald-500/35" : "border-red-500/35 bg-red-500/[0.08] text-red-600 active:bg-red-500/35";
          return <button key={option.label} onClick={() => register(option.value)} className={`flex h-[110px] flex-col items-center justify-center rounded-3xl border px-3 text-center shadow-[0_14px_28px_-24px_rgba(15,23,42,.4)] backdrop-blur-xl active:scale-[0.97] ${tone}`}><span className="font-display text-2xl">{option.label}</span><span className="mt-2 max-w-[15ch] text-[10px] font-semibold leading-snug opacity-75">{option.hint}</span></button>;
        })}</div>

        {(shots.length || friendShots.length) ? <button onClick={undo} className="mt-3 self-center text-xs font-semibold text-muted-foreground">↶ Ändra föregående slag</button> : null}
      </main>
    );
  }

  const analysis = analyzeNineWindow(shots);
  const friendAnalysis = withFriend ? analyzeNineWindow(friendShots) : null;
  const friendName = selectedFriend?.other.displayName ?? "Kompis";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
      <header className="flex items-center justify-between"><Link to="/shot-shaping" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></Link><Link to="/shot-shaping-9-window-historik" className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold text-muted-foreground ${glass}`}><BarChart3 className="h-3.5 w-3.5" /> Analys</Link></header>
      <section className={`mt-5 rounded-[30px] border p-5 ${introGlass}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-500">9 Window Drill · Resultat</p>
        {withFriend && friendAnalysis ? <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-3xl border border-blue-200/80 bg-white/75 p-4 text-center"><p className="truncate text-sm font-bold text-blue-700">{selfName}</p><p className="mt-2 font-display text-4xl text-blue-600">{analysis.headline.value}</p></div><div className="rounded-3xl border border-slate-300/85 bg-white/75 p-4 text-center"><p className="truncate text-sm font-bold text-slate-700">{friendName}</p><p className="mt-2 font-display text-4xl text-slate-700">{friendAnalysis.headline.value}</p></div></div> : <div className="mt-3 text-center"><p className="font-display text-6xl text-blue-600">{analysis.headline.value}</p><p className="mt-2 text-xs text-muted-foreground">Träffade fönster</p></div>}
      </section>
      <div className="mt-5 grid gap-3"><button onClick={() => { setShots([]); setFriendShots([]); setPhase("intro"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><RotateCcw className="h-4 w-4" /> Kör igen</button><Link to="/shot-shaping-9-window-historik" className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold ${glass}`}><BarChart3 className="h-4 w-4" /> Se Shot Shaping-analys</Link></div>
    </main>
  );
}
