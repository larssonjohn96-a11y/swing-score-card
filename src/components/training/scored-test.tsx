import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BarChart3, RotateCcw, User, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";
import { LIGHT_SURFACE } from "@/routes/8-bollar";
import { saveSession, type Analysis, type Prompt, type ScoreOption } from "@/lib/training/core";
import type { TrainingBackRoute, TrainingHistoryRoute, TrainingTestRoute } from "@/lib/training/routes";
import { useAuth } from "@/hooks/use-auth";
import { listFriendships, type Friendship } from "@/lib/friends-cloud";
import { loadCardProfile } from "@/lib/rating-card";

export type TestVariant = { id: string; label: string; description?: string };
export type ClubGroup = { label: string; clubs: string[] };
export type ScoredTestProps = {
  testId: string;
  eyebrow: string;
  title: string;
  intro: string;
  backTo: TrainingBackRoute;
  historyTo: TrainingHistoryRoute;
  selfTo: TrainingTestRoute;
  options: ScoreOption[];
  optionCols?: 2 | 3;
  prompts?: Prompt[];
  promptsFor?: (variantId: string) => Prompt[];
  variants?: TestVariant[];
  variantLabel?: string;
  introCards?: { title: string; rows: { label: string; value: string }[]; note?: string }[];
  runningLabel?: string;
  clubGroups?: ClubGroup[];
  liquidGlass?: boolean;
  hitMissColors?: boolean;
  multiplayer?: boolean;
  analyze: (shots: number[], prompts: Prompt[], variant?: string) => Analysis;
};

type Phase = "intro" | "test" | "result";
type TrainingCategory = "off-the-tee" | "approach" | "around-the-green" | "putting";
type PlayerTurn = "self" | "friend";
type PlayMode = "solo" | "friend" | null;

function categoryForTest(route: TrainingTestRoute): { id: TrainingCategory; label: string } {
  if (route === "/driver-konsekvens") return { id: "off-the-tee", label: "Off the Tee" };
  if (route === "/green-reading" || route === "/pga-tour-18-puttar") return { id: "putting", label: "Putting" };
  if (route === "/upp-och-in") return { id: "around-the-green", label: "Around the Green" };
  return { id: "approach", label: "Approach" };
}

function clubGroupDetail(group: ClubGroup) {
  if (group.label === "Driver") return "Driver";
  if (group.label === "Woods") return "3W–7W · Hybrid";
  if (group.label === "Låga järn") return "3i–6i";
  if (group.label === "Höga järn") return "7i–PW";
  return group.clubs.join(" · ");
}

function shotTone(value: number | undefined, active = false) {
  if (value === undefined) return active ? "bg-blue-500/30" : "bg-slate-200/85";
  return value > 0 ? "bg-emerald-500" : "bg-red-500";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function PlayerAvatar({ name, url, side, active = false, size = "md" }: { name: string; url?: string | null; side: "self" | "friend"; active?: boolean; size?: "sm" | "md" }) {
  const tone = side === "self"
    ? "border-blue-500 bg-blue-500/10 text-blue-600 shadow-[0_12px_30px_-18px_rgba(37,99,235,.7)]"
    : "border-slate-400 bg-slate-500/[0.07] text-slate-600 shadow-[0_12px_30px_-18px_rgba(71,85,105,.4)]";
  const ring = side === "self" ? "ring-blue-500/20" : "ring-slate-400/25";
  const sizeClass = size === "md" ? "h-14 w-14 text-base" : "h-9 w-9 text-xs";
  return <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-bold ${tone} ${active ? `ring-4 ring-offset-2 ring-offset-background ${ring}` : ""}`}>{url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials(name) || <User className="h-4 w-4" />}</span>;
}

export function ScoredTest(props: ScoredTestProps) {
  useHideBottomNav(true);
  const { user, displayName } = useAuth();
  const selfProfile = loadCardProfile();
  const selfName = displayName?.trim() || "Du";
  const [phase, setPhase] = useState<Phase>("intro");
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [club, setClub] = useState<string | undefined>();
  const [shots, setShots] = useState<number[]>([]);
  const [friendShots, setFriendShots] = useState<number[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friendship | null>(null);
  const [mode, setMode] = useState<PlayMode>(props.multiplayer ? null : "solo");
  const [currentPlayer, setCurrentPlayer] = useState<PlayerTurn>("self");
  const turnRef = useRef<PlayerTurn>("self");

  const withFriend = mode === "friend";
  const prompts: Prompt[] = props.promptsFor && variant ? props.promptsFor(variant) : (props.prompts ?? []);
  const total = prompts.length;
  const glass = props.liquidGlass
    ? "border-slate-200/95 bg-white/74 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.38)] backdrop-blur-2xl"
    : "border-border bg-card";
  const introGlass = props.liquidGlass
    ? "border-slate-300/85 bg-white/84 shadow-[0_20px_46px_-30px_rgba(15,23,42,0.46)] backdrop-blur-2xl"
    : "border-border bg-card";

  useEffect(() => {
    if (!props.multiplayer || !user) { setFriends([]); return; }
    void listFriendships().then((result) => setFriends(result.accepted));
  }, [props.multiplayer, user]);

  function selectMode(nextMode: Exclude<PlayMode, null>) {
    setMode(nextMode);
    setSelectedFriend(null);
    setClub(undefined);
  }

  function start() {
    if (props.multiplayer && !mode) return;
    if (props.variants && !variant) return;
    if (props.clubGroups && !club) return;
    if (withFriend && !selectedFriend) return;
    setShots([]);
    setFriendShots([]);
    const starter: PlayerTurn = withFriend && Math.random() < 0.5 ? "friend" : "self";
    turnRef.current = starter;
    setCurrentPlayer(starter);
    setPhase("test");
  }

  function register(value: number) {
    if (withFriend && selectedFriend) {
      const turn = turnRef.current;
      if (turn === "self") {
        const nextSelf = [...shots, value];
        setShots(nextSelf);
        if (nextSelf.length >= total && friendShots.length >= total) {
          saveSession(props.testId, nextSelf, variant, club);
          setPhase("result");
          return;
        }
        turnRef.current = "friend";
        setCurrentPlayer("friend");
        return;
      }
      const nextFriend = [...friendShots, value];
      setFriendShots(nextFriend);
      if (nextFriend.length >= total && shots.length >= total) {
        saveSession(props.testId, shots, variant, club);
        setPhase("result");
        return;
      }
      turnRef.current = "self";
      setCurrentPlayer("self");
      return;
    }

    const next = [...shots, value];
    setShots(next);
    if (next.length >= total) {
      saveSession(props.testId, next, variant, club);
      setPhase("result");
    }
  }

  function undo() {
    if (withFriend && selectedFriend) {
      const lastPlayer: PlayerTurn = turnRef.current === "self" ? "friend" : "self";
      if (lastPlayer === "self" && shots.length) setShots((s) => s.slice(0, -1));
      if (lastPlayer === "friend" && friendShots.length) setFriendShots((s) => s.slice(0, -1));
      turnRef.current = lastPlayer;
      setCurrentPlayer(lastPlayer);
      return;
    }
    setShots((s) => s.slice(0, -1));
  }

  if (phase === "intro") {
    const modeReady = !props.multiplayer || mode !== null;
    const friendReady = !withFriend || Boolean(selectedFriend);
    const setupReady = modeReady && friendReady;
    const variantReady = !props.variants || Boolean(variant);
    return (
      <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-5 pt-4 text-foreground">
        <div className="flex shrink-0 items-center justify-between">
          <Link to={props.backTo} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></Link>
          <Link to={props.historyTo} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground ${glass}`}><BarChart3 className="h-3.5 w-3.5" /> Progress</Link>
        </div>

        <section className={`mt-5 rounded-[28px] border p-5 ${introGlass}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{props.eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl leading-none">{props.title}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{props.intro}</p>
        </section>

        {props.multiplayer ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Steg 1 · Välj spelläge</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => selectMode("solo")} className={`rounded-3xl border p-4 text-left backdrop-blur-xl transition-all ${mode === "solo" ? "border-blue-400/70 bg-blue-500/[0.10] shadow-[0_14px_34px_-26px_rgba(37,99,235,.6)]" : "border-slate-300/80 bg-white/70"}`}><User className="h-4 w-4 text-blue-600" /><span className="mt-2 block font-display text-xl">Solo</span></button>
              <button type="button" onClick={() => selectMode("friend")} className={`rounded-3xl border p-4 text-left backdrop-blur-xl transition-all ${mode === "friend" ? "border-slate-500/70 bg-slate-500/[0.08] shadow-[0_14px_34px_-26px_rgba(71,85,105,.45)]" : "border-slate-300/80 bg-white/70"}`}><Users className="h-4 w-4 text-slate-600" /><span className="mt-2 block font-display text-xl">Med kompis</span></button>
            </div>

            {withFriend ? (
              <div className="mt-3 rounded-3xl border border-slate-300/90 bg-white/78 p-4 shadow-[0_16px_38px_-28px_rgba(71,85,105,.38)] backdrop-blur-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-600">Steg 2 · Välj kompis</p>
                <p className="mt-1 font-display text-2xl">{selectedFriend ? selectedFriend.other.displayName : "Välj vem du spelar med"}</p>
                {friends.length ? <div className="mt-3 grid grid-cols-2 gap-2">{friends.map((friend) => {
                  const selected = selectedFriend?.id === friend.id;
                  return <button key={friend.id} type="button" onClick={() => { setSelectedFriend(friend); setClub(undefined); }} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left transition-all ${selected ? "border-slate-500 bg-slate-500/12 text-slate-800" : "border-slate-300/80 bg-white/62"}`}><PlayerAvatar name={friend.other.displayName} url={friend.other.avatarUrl} side="friend" size="sm" /><span className="min-w-0 truncate text-sm font-semibold">{friend.other.displayName}</span></button>;
                })}</div> : <p className="mt-3 text-xs text-muted-foreground">Inga accepterade vänner ännu. Lägg till en vän under Vänner först.</p>}
                {!selectedFriend ? <p className="mt-3 text-xs font-semibold text-slate-600">Välj en kompis för att fortsätta.</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {props.variants && setupReady ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{props.variantLabel ?? "Välj variant"}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{props.variants.map((v) => <button key={v.id} type="button" onClick={() => { setVariant(v.id); setClub(undefined); }} className={`rounded-3xl border p-3 text-left backdrop-blur-xl transition-all ${variant === v.id ? "border-blue-400/70 bg-blue-500/[0.10] shadow-sm" : "border-slate-300/80 bg-white/70"}`}><span className="block font-display text-2xl leading-none">{v.label}</span>{v.description ? <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{v.description}</span> : null}</button>)}</div>
          </div>
        ) : null}

        {props.clubGroups && setupReady && variantReady ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{props.multiplayer ? (withFriend ? (props.variants ? "Steg 4 · Välj klubbgrupp" : "Steg 3 · Välj klubbgrupp") : (props.variants ? "Steg 3 · Välj klubbgrupp" : "Steg 2 · Välj klubbgrupp")) : "Välj klubbgrupp"}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">{props.clubGroups.map((group) => {
              const selected = club === group.label;
              return <button key={group.label} type="button" onClick={() => setClub(group.label)} className={`rounded-3xl border p-4 text-left backdrop-blur-xl transition-all active:scale-[0.98] ${selected ? "border-blue-500/65 bg-blue-500/[0.12] shadow-[0_14px_34px_-24px_rgba(37,99,235,.6)]" : "border-slate-300/90 bg-white/72 shadow-[0_12px_28px_-25px_rgba(15,23,42,.28)]"}`}><span className={`block font-display text-xl leading-none ${selected ? "text-blue-700" : "text-foreground"}`}>{group.label}</span><span className="mt-1.5 block text-[11px] font-semibold text-muted-foreground">{clubGroupDetail(group)}</span></button>;
            })}</div>
          </div>
        ) : null}

        <button onClick={start} disabled={Boolean((props.multiplayer && !mode) || (props.variants && !variant) || (props.clubGroups && !club) || (withFriend && !selectedFriend))} className="mt-auto flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-xl text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-35">Starta test <ArrowRight className="h-5 w-5" /></button>
      </main>
    );
  }

  if (phase === "test") {
    const activeShots = withFriend ? (currentPlayer === "self" ? shots : friendShots) : shots;
    const activeProgressIndex = activeShots.length;
    const prompt = prompts[Math.min(activeProgressIndex, Math.max(0, total - 1))];
    const running = shots.reduce((a, b) => a + b, 0);
    const friendRunning = friendShots.reduce((a, b) => a + b, 0);
    const friendName = selectedFriend?.other.displayName ?? "Kompis";
    const activeName = currentPlayer === "self" ? selfName : friendName;
    const activeSide = currentPlayer === "self" ? "self" : "friend";
    const activeAvatar = currentPlayer === "self" ? selfProfile.photo : selectedFriend?.other.avatarUrl;

    return (
      <main style={LIGHT_SURFACE} className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background px-5 pb-6 text-foreground">
        <div className="flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
          <div><span className="text-sm font-semibold">Slag {Math.min(activeProgressIndex + 1, total)} av {total}</span>{club ? <span className="ml-2 rounded-full border border-slate-300/85 bg-white/70 px-2 py-1 text-[10px] font-semibold text-slate-600 backdrop-blur-xl">{club}</span> : null}</div>
          <Link to={props.backTo} className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground ${glass}`}><X className="h-3.5 w-3.5" /> Avbryt</Link>
        </div>

        {withFriend ? (
          <section className={`mt-3 rounded-[28px] border p-4 ${currentPlayer === "self" ? "border-blue-300/70 bg-white/78 shadow-[0_18px_40px_-28px_rgba(37,99,235,.45)]" : "border-slate-300/90 bg-white/78 shadow-[0_18px_40px_-28px_rgba(71,85,105,.35)]"} backdrop-blur-2xl`}>
            <p className={`text-center text-[10px] font-bold uppercase tracking-[0.2em] ${currentPlayer === "self" ? "text-blue-600" : "text-slate-600"}`}>Nu spelar</p>
            <div className="mt-2 flex items-center justify-center gap-3"><PlayerAvatar name={activeName} url={activeAvatar} side={activeSide} active /><div><p className={`font-display text-4xl leading-none ${currentPlayer === "self" ? "text-blue-700" : "text-slate-700"}`}>{activeName}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{currentPlayer === "self" ? `${running} träffar` : `${friendRunning} träffar`}</p></div></div>
          </section>
        ) : null}

        <div className={`mt-3 rounded-2xl border p-3 ${glass}`}>
          <div className="mb-2 flex items-center justify-between"><span className={`text-[9px] font-bold uppercase tracking-[0.14em] ${withFriend && currentPlayer === "friend" ? "text-slate-600" : "text-blue-600"}`}>{withFriend ? `${activeName} · progress` : "Progress"}</span><span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{Math.min(activeShots.length, total)}/{total}</span></div>
          <div className="flex gap-1.5">{prompts.map((_, i) => <div key={i} className={`h-3 flex-1 rounded-full ${shotTone(activeShots[i], i === activeProgressIndex)}`} />)}</div>
        </div>

        <section className={`mt-3 flex h-[158px] flex-col items-center justify-center rounded-3xl border px-4 text-center ${introGlass}`}>{prompt?.tag ? <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{prompt.tag}</p> : null}<p className="mt-2 font-display text-4xl leading-none">{prompt?.primary}</p>{prompt?.secondary ? <p className="mt-2 text-sm font-semibold text-blue-600">{prompt.secondary}</p> : null}</section>

        <div className={`mt-4 grid gap-3 ${props.optionCols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>{props.options.map((option) => {
          const hit = props.hitMissColors && option.value > 0;
          const miss = props.hitMissColors && option.value === 0;
          const tone = hit ? "border-emerald-500/35 bg-emerald-500/[0.09] text-emerald-700 active:border-emerald-600 active:bg-emerald-500/35" : miss ? "border-red-500/35 bg-red-500/[0.08] text-red-600 active:border-red-600 active:bg-red-500/35" : "border-slate-300/85 bg-white/76 text-primary";
          return <button key={option.label} onClick={() => register(option.value)} className={`flex h-[112px] flex-col items-center justify-center rounded-3xl border px-3 text-center shadow-[0_14px_28px_-24px_rgba(15,23,42,0.42)] backdrop-blur-xl transition-all active:scale-[0.97] ${tone}`}><span className="font-display text-2xl leading-none">{option.label}</span>{option.hint ? <span className="mt-2 max-w-[15ch] text-[10px] font-semibold leading-snug opacity-75">{option.hint}</span> : null}</button>;
        })}</div>

        {!withFriend ? <div className={`mt-3 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${glass}`}><span className="text-muted-foreground">{props.runningLabel ?? "Hittills"}</span><span className="font-semibold tabular-nums">{running}</span></div> : null}
        {(shots.length > 0 || friendShots.length > 0) ? <button onClick={undo} className="mt-3 self-center text-xs font-semibold text-muted-foreground">↶ Ändra föregående slag</button> : null}
      </main>
    );
  }

  const analysis = props.analyze(shots, prompts, variant);
  const friendAnalysis = withFriend ? props.analyze(friendShots, prompts, variant) : null;
  const category = categoryForTest(props.selfTo);
  const friendName = selectedFriend?.other.displayName ?? "Kompis";

  return (
    <main style={LIGHT_SURFACE} className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-16 pt-6 text-foreground">
      <header className="flex items-center justify-between"><div className="flex items-center gap-3"><Link to={props.backTo} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${glass}`}><ArrowLeft className="h-4 w-4" /></Link><div><h1 className="text-lg font-semibold leading-tight">{props.title}</h1><p className="text-xs text-muted-foreground">Resultat{club ? ` · ${club}` : ""}</p></div></div><Link to={props.historyTo} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold text-muted-foreground ${glass}`}><BarChart3 className="h-3.5 w-3.5" /> Progress</Link></header>

      {withFriend && friendAnalysis ? (
        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-blue-200/80 bg-white/78 p-4 text-center shadow-[0_20px_46px_-34px_rgba(37,99,235,.45)] backdrop-blur-2xl"><div className="flex justify-center"><PlayerAvatar name={selfName} url={selfProfile.photo} side="self" size="sm" /></div><p className="mt-2 truncate text-sm font-bold text-blue-700">{selfName}</p><p className="mt-2 font-display text-5xl text-blue-600">{analysis.headline.value}</p></div>
          <div className="rounded-3xl border border-slate-300/85 bg-white/78 p-4 text-center shadow-[0_20px_46px_-34px_rgba(71,85,105,.35)] backdrop-blur-2xl"><div className="flex justify-center"><PlayerAvatar name={friendName} url={selectedFriend?.other.avatarUrl} side="friend" size="sm" /></div><p className="mt-2 truncate text-sm font-bold text-slate-700">{friendName}</p><p className="mt-2 font-display text-5xl text-slate-700">{friendAnalysis.headline.value}</p></div>
        </section>
      ) : (
        <section className="mt-5 rounded-[30px] border border-slate-300/85 bg-white/80 p-6 text-center shadow-[0_22px_52px_-34px_rgba(15,23,42,.4)] backdrop-blur-2xl"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{analysis.headline.label}</p><p className="mt-2 font-display text-6xl leading-none text-blue-600">{analysis.headline.value}</p>{analysis.headline.hint ? <p className="mt-2 text-xs text-muted-foreground">{analysis.headline.hint}</p> : null}</section>
      )}

      {analysis.metrics.length ? <section className="mt-3 grid grid-cols-2 gap-3">{analysis.metrics.map((m) => <div key={m.label} className="rounded-3xl border border-slate-300/80 bg-white/74 p-4 shadow-[0_18px_44px_-32px_rgba(15,23,42,.32)] backdrop-blur-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p><p className="mt-1.5 font-display text-2xl leading-none">{m.value}</p>{m.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{m.hint}</p> : null}</div>)}</section> : null}

      <AnalysisSections sections={analysis.sections} liquidGlass={props.liquidGlass} />
      <div className="mt-6 grid gap-3"><button onClick={() => { setShots([]); setFriendShots([]); setPhase("intro"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><RotateCcw className="h-4 w-4" /> Kör igen</button><Link to={props.historyTo} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold ${glass}`}><BarChart3 className="h-4 w-4" /> Se progress</Link><Link to="/traning" search={{ category: category.id }} className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold text-muted-foreground ${glass}`}><ArrowLeft className="h-4 w-4" /> Tillbaka till {category.label}</Link></div>
    </main>
  );
}

export function AnalysisSections({ sections, liquidGlass = false }: { sections: Analysis["sections"]; liquidGlass?: boolean }): ReactNode {
  return <>{sections.map((section) => <section key={section.title} className={`mt-3 rounded-3xl border p-4 ${liquidGlass ? "border-slate-300/80 bg-white/72 shadow-[0_18px_44px_-32px_rgba(15,23,42,.3)] backdrop-blur-2xl" : "border-border bg-card"}`}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.title}</p><div className="mt-3 space-y-2.5">{section.rows.map((row) => <div key={row.label}><div className="flex items-center justify-between text-[13px]"><span className="text-muted-foreground">{row.label}</span><span className="font-semibold tabular-nums">{row.value}</span></div>{typeof row.ratio === "number" ? <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(1, row.ratio)) * 100}%` }} /></div> : null}</div>)}</div>{section.note ? <p className="mt-3 text-[11px] text-muted-foreground">{section.note}</p> : null}</section>)}</>;
}
