import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Target,
  ThumbsUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/coach")({ component: CoachPage });

const db = supabase as any;
type CoachView = "overview" | "players" | "plan" | "feedback" | "more";
type ActionType = "focus" | "goal" | "session" | "comment" | "reaction";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean };
type TrainingSession = { id: string; test_id: string; category: string; played_at: string; score: number | null; test_handicap: number | null; metrics: Record<string, unknown> | null };
type PlayerRow = { relationship: Relationship; name: string; snapshot?: { est_hcp?: number | null; test_count?: number } };

const DEMO_PLAYERS: PlayerRow[] = [
  { relationship: { id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", status: "accepted", share_training_data: true }, name: "Emma", snapshot: { est_hcp: 18.4, test_count: 14 } },
  { relationship: { id: "demo-rel-oskar", player_id: "demo-oskar", coach_id: "demo-john", status: "accepted", share_training_data: true }, name: "Oskar", snapshot: { est_hcp: 9.7, test_count: 23 } },
  { relationship: { id: "demo-rel-sara", player_id: "demo-sara", coach_id: "demo-john", status: "accepted", share_training_data: true }, name: "Sara", snapshot: { est_hcp: 27.1, test_count: 8 } },
];

const DEMO_SESSIONS: Record<string, TrainingSession[]> = {
  "demo-emma": [
    { id: "demo-session-emma-1", test_id: "approach-precision", category: "approach", played_at: "2026-09-12T14:30:00Z", score: 72, test_handicap: 17.8, metrics: null },
    { id: "demo-session-emma-2", test_id: "fairway-streak", category: "driving", played_at: "2026-09-10T16:10:00Z", score: 7, test_handicap: null, metrics: null },
  ],
  "demo-oskar": [
    { id: "demo-session-oskar-1", test_id: "driver-konsekvens", category: "driving", played_at: "2026-09-11T17:20:00Z", score: 81, test_handicap: 8.9, metrics: null },
    { id: "demo-session-oskar-2", test_id: "lagputt-ladder", category: "puttning", played_at: "2026-09-09T15:00:00Z", score: 15, test_handicap: null, metrics: null },
  ],
  "demo-sara": [
    { id: "demo-session-sara-1", test_id: "8-bollar", category: "around-the-green", played_at: "2026-09-12T09:45:00Z", score: 11, test_handicap: 25.9, metrics: null },
  ],
};

const glass = "border border-white/90 bg-white/82 shadow-[0_18px_44px_-28px_rgba(51,65,85,.32),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[24px] dark:border-white/10 dark:bg-white/[0.08]";

function CoachPage() {
  useHideBottomNav(true);
  const { user, displayName, loading } = useAuth();
  const isJohnMaster = (displayName ?? "").trim().toLowerCase() === "john";
  const [view, setView] = useState<CoachView>("overview");
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sessions, setSessions] = useState<Record<string, TrainingSession[]>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType>("focus");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const hasRealCoachStudents = players.some((player) => player.relationship.id !== "preview-self-john");
  const visiblePlayers = isJohnMaster && !hasRealCoachStudents ? [...players, ...DEMO_PLAYERS] : players;
  const visibleSessions = isJohnMaster && !hasRealCoachStudents ? { ...DEMO_SESSIONS, ...sessions } : sessions;
  const effectiveProfile = profile ?? (isJohnMaster ? { user_id: user?.id ?? "demo-john", display_name: "Coach John", club_name: null, invite_code: "JOHN" } : null);
  const selectedPlayer = useMemo(() => visiblePlayers.find((p) => p.relationship.player_id === selectedPlayerId) ?? null, [visiblePlayers, selectedPlayerId]);
  const selectedSessions = selectedPlayerId ? visibleSessions[selectedPlayerId] ?? [] : [];
  const selectedIsPreview = selectedPlayer?.relationship.id === "preview-self-john" || selectedPlayer?.relationship.id.startsWith("demo-");
  const allRecentSessions = useMemo(() => visiblePlayers.flatMap((player) => (visibleSessions[player.relationship.player_id] ?? []).map((session) => ({ player, session }))).sort((a, b) => +new Date(b.session.played_at) - +new Date(a.session.played_at)).slice(0, 8), [visiblePlayers, visibleSessions]);

  useEffect(() => { if (user) void loadCoachData(); }, [user]);
  useEffect(() => { if (!selectedPlayerId && visiblePlayers.length) setSelectedPlayerId(visiblePlayers[0].relationship.player_id); }, [visiblePlayers, selectedPlayerId]);
  useEffect(() => { setSelectedSessionId(null); }, [selectedPlayerId]);

  async function loadCoachData() {
    if (!user) return;
    const [{ data: coachProfile }, { data: rels }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("coach_relationships").select("*").eq("coach_id", user.id).eq("status", "accepted"),
    ]);
    setProfile(coachProfile ?? null);
    const coachRels = (rels ?? []) as Relationship[];
    const ids = [...new Set([...(isJohnMaster ? [user.id] : []), ...coachRels.map((r) => r.player_id)])];
    if (!ids.length) { setPlayers([]); setSessions({}); return; }

    const [{ data: profiles }, { data: snapshots }, { data: training }] = await Promise.all([
      db.from("profiles").select("id,display_name").in("id", ids),
      db.from("player_snapshots").select("*").in("user_id", ids),
      db.from("test_sessions").select("id,user_id,test_id,category,played_at,score,test_handicap,metrics").in("user_id", ids).eq("test_type", "training").order("played_at", { ascending: false }).limit(60),
    ]);

    const realStudents = coachRels.map((relationship) => ({
      relationship,
      name: profiles?.find((p: any) => p.id === relationship.player_id)?.display_name ?? "Spelare",
      snapshot: snapshots?.find((s: any) => s.user_id === relationship.player_id),
    }));
    const johnPreview: PlayerRow[] = isJohnMaster ? [{
      relationship: { id: "preview-self-john", player_id: user.id, coach_id: user.id, status: "accepted", share_training_data: true },
      name: profiles?.find((p: any) => p.id === user.id)?.display_name ?? displayName ?? "John",
      snapshot: snapshots?.find((s: any) => s.user_id === user.id),
    }] : [];
    setPlayers([...johnPreview, ...realStudents]);

    const grouped: Record<string, TrainingSession[]> = {};
    for (const session of training ?? []) {
      if (!grouped[session.user_id]) grouped[session.user_id] = [];
      if (grouped[session.user_id].length < 12) grouped[session.user_id].push(session);
    }
    setSessions(grouped);
  }

  function choosePlayer(playerId: string, nextView?: CoachView) {
    setSelectedPlayerId(playerId);
    if (nextView) setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prepareFeedback(session: TrainingSession, type: "comment" | "reaction") {
    setSelectedSessionId(session.id);
    setActionType(type);
    setTitle(type === "reaction" ? "Grymt jobbat!" : "Feedback på passet");
    setBody("");
    setView("plan");
  }

  async function addAction() {
    if (!user || !selectedPlayer || !title.trim()) return;
    if (selectedIsPreview) {
      setTitle(""); setBody(""); setSelectedSessionId(null);
      setMessage(selectedPlayer.relationship.id === "preview-self-john" ? "Preview: åtgärden mot John sparas inte som coachmeddelande." : "Preview: skickat till spelaren.");
      return;
    }
    const { error } = await db.from("coach_actions").insert({ relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, action_type: actionType, title: title.trim(), body: body.trim() || null, session_id: selectedSessionId });
    if (!error) { setTitle(""); setBody(""); setSelectedSessionId(null); setMessage("Skickat till spelaren."); }
  }

  if (loading) return <main className="min-h-screen bg-[#f2f3f5] p-5 text-slate-900 dark:bg-[#101419] dark:text-slate-100">Laddar…</main>;
  if (!user) return <main className="min-h-screen bg-[#f2f3f5] p-5 dark:bg-[#101419]"><Link to="/konto" className="font-medium text-sky-700 dark:text-sky-300">Logga in för att använda coachvyn →</Link></main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f2f3f5] text-slate-900 dark:bg-[#101419] dark:text-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-sky-100/35 blur-3xl dark:bg-sky-500/8" />
      <div className="pointer-events-none absolute -right-28 top-64 h-72 w-72 rounded-full bg-slate-200/45 blur-3xl dark:bg-slate-700/15" />
      <div className="relative mx-auto w-full max-w-md px-5 pb-32 pt-6">
        <header className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-slate-500 dark:text-slate-400">SG4</p><span className="mt-0.5 block text-[22px] font-semibold tracking-[-.04em]">Coach</span></div>
          <div className="relative">
            <button type="button" onClick={() => setRoleMenuOpen((open) => !open)} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 transition active:scale-[.98] dark:text-slate-200 ${glass}`}>{isJohnMaster ? "Coach John" : effectiveProfile?.display_name ?? "Coach"}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} /></button>
            {roleMenuOpen ? <div className={`absolute right-0 z-50 mt-2 w-48 rounded-[22px] p-1.5 ${glass}`}><Link to="/" onClick={() => setRoleMenuOpen(false)} className="flex w-full items-center rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100/70 dark:text-slate-200 dark:hover:bg-white/10">Byt till spelarvy</Link></div> : null}
          </div>
        </header>

        {message ? <p className={`mt-4 rounded-[22px] px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${glass}`}>{message}</p> : null}

        {view === "overview" ? <OverviewView players={visiblePlayers} recent={allRecentSessions} effectiveProfile={effectiveProfile} isJohnMaster={isJohnMaster} onPlayer={(id) => choosePlayer(id, "players")} /> : null}
        {view === "players" ? <PlayersView players={visiblePlayers} selectedPlayerId={selectedPlayerId} sessions={visibleSessions} onPlayer={(id) => choosePlayer(id)} /> : null}
        {view === "plan" ? <PlanView players={visiblePlayers} selectedPlayer={selectedPlayer} selectedPlayerId={selectedPlayerId} selectedSessionId={selectedSessionId} actionType={actionType} title={title} body={body} setSelectedPlayerId={setSelectedPlayerId} setSelectedSessionId={setSelectedSessionId} setActionType={setActionType} setTitle={setTitle} setBody={setBody} addAction={addAction} /> : null}
        {view === "feedback" ? <FeedbackView recent={allRecentSessions} onPlayer={setSelectedPlayerId} onFeedback={prepareFeedback} /> : null}
        {view === "more" ? <MoreView profile={effectiveProfile} isJohnMaster={isJohnMaster} /> : null}
      </div>

      <CoachNav view={view} onChange={setView} />
    </main>
  );
}

function OverviewView({ players, recent, effectiveProfile, isJohnMaster, onPlayer }: { players: PlayerRow[]; recent: { player: PlayerRow; session: TrainingSession }[]; effectiveProfile: CoachProfile | null; isJohnMaster: boolean; onPlayer: (id: string) => void }) {
  return <>
    <section className={`mt-6 overflow-hidden rounded-[34px] p-6 ${glass}`}>
      <div className="flex items-center justify-between"><span className="rounded-full border border-sky-200/60 bg-sky-50/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-800">Översikt</span><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-sky-700"><LayoutDashboard className="h-4.5 w-4.5" /></span></div>
      <h1 className="mt-5 text-[38px] font-medium leading-[.98] tracking-[-.055em]">Dina spelare.</h1>
      <p className="mt-3 max-w-[280px] text-[14px] leading-6 text-slate-500">Se vad som hänt och vem som behöver nästa fokus.</p>
      <div className="mt-6 flex items-end justify-between border-t border-slate-200/70 pt-4"><div><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Elever</p><p className="mt-1 text-2xl font-medium">{players.length}</p></div>{effectiveProfile ? <div className="text-right"><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Elevkod</p><p className="mt-1 text-lg font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : effectiveProfile.invite_code}</p></div> : null}</div>
    </section>
    <section className="mt-7"><SectionTitle eyebrow="Elever" title="Snabböversikt" /><div className="space-y-2.5">{players.slice(0, 3).map((player) => <PlayerCard key={player.relationship.id} player={player} active={false} onClick={() => onPlayer(player.relationship.player_id)} />)}</div></section>
    <section className="mt-8"><SectionTitle eyebrow="Senaste" title="Aktivitet" /><div className="space-y-3">{recent.slice(0, 3).map(({ player, session }) => <div key={`${player.relationship.id}-${session.id}`} className={`rounded-[26px] p-4 ${glass}`}><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{player.name}</p><SessionSummary session={session} /></div>)}</div></section>
  </>;
}

function PlayersView({ players, selectedPlayerId, sessions, onPlayer }: { players: PlayerRow[]; selectedPlayerId: string | null; sessions: Record<string, TrainingSession[]>; onPlayer: (id: string) => void }) {
  const selected = players.find((p) => p.relationship.player_id === selectedPlayerId) ?? players[0];
  const selectedSessions = selected ? sessions[selected.relationship.player_id] ?? [] : [];
  return <><section className="mt-7"><SectionTitle eyebrow="Elever" title="Alla spelare" /><div className="space-y-2.5">{players.map((player) => <PlayerCard key={player.relationship.id} player={player} active={selected?.relationship.player_id === player.relationship.player_id} onClick={() => onPlayer(player.relationship.player_id)} />)}</div></section>{selected ? <section className="mt-8"><SectionTitle eyebrow={selected.name} title="Senaste träningen" right={`${selectedSessions.length} pass`} /><div className="space-y-3">{selectedSessions.length ? selectedSessions.map((session) => <div key={session.id} className={`rounded-[28px] p-4 ${glass}`}><SessionSummary session={session} /></div>) : <div className={`rounded-[26px] p-5 text-sm text-slate-400 ${glass}`}>Inga synkade träningspass ännu.</div>}</div></section> : null}</>;
}

function PlanView({ players, selectedPlayer, selectedPlayerId, selectedSessionId, actionType, title, body, setSelectedPlayerId, setSelectedSessionId, setActionType, setTitle, setBody, addAction }: any) {
  return <><section className="mt-7"><SectionTitle eyebrow="Planera" title="Nästa steg" /><div className={`rounded-[32px] p-5 ${glass}`}><label className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Elev</label><select value={selectedPlayerId ?? ""} onChange={(e) => setSelectedPlayerId(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none">{players.map((player) => <option key={player.relationship.id} value={player.relationship.player_id}>{player.name}</option>)}</select><div className="mt-5 grid grid-cols-5 gap-1.5 rounded-[20px] bg-slate-100 p-1.5 ring-1 ring-slate-200/70">{(["focus", "goal", "session", "comment", "reaction"] as ActionType[]).map((type) => <button key={type} onClick={() => { setActionType(type); if (type !== "comment" && type !== "reaction") setSelectedSessionId(null); }} className={`rounded-[14px] px-1.5 py-2 text-[10px] font-medium ${actionType === type ? "bg-white text-sky-800 shadow-sm" : "text-slate-500"}`}>{shortLabel(type)}</button>)}</div>{selectedSessionId ? <button onClick={() => setSelectedSessionId(null)} className="mt-4 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">Kopplad till valt pass · ta bort ×</button> : null}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(actionType)} className="mt-4 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none" /><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kort kommentar (valfritt)" rows={3} className="mt-2 w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none" /><button onClick={addAction} disabled={!selectedPlayer} className="mt-3 w-full rounded-[20px] bg-sky-600 py-3.5 text-sm font-medium text-white disabled:opacity-40">Skicka till spelaren</button></div></section></>;
}

function FeedbackView({ recent, onPlayer, onFeedback }: { recent: { player: PlayerRow; session: TrainingSession }[]; onPlayer: (id: string) => void; onFeedback: (session: TrainingSession, type: "comment" | "reaction") => void }) {
  return <section className="mt-7"><SectionTitle eyebrow="Feedback" title="Senaste passen" /><div className="space-y-3">{recent.map(({ player, session }) => <div key={`${player.relationship.id}-${session.id}`} className={`rounded-[28px] p-4 ${glass}`}><button onClick={() => onPlayer(player.relationship.player_id)} className="mb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500">{player.name}</button><SessionSummary session={session} /><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => { onPlayer(player.relationship.player_id); onFeedback(session, "comment"); }} className="flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 py-2.5 text-[13px] font-medium text-slate-600"><MessageCircle className="h-4 w-4" />Kommentera</button><button onClick={() => { onPlayer(player.relationship.player_id); onFeedback(session, "reaction"); }} className="flex items-center justify-center gap-2 rounded-[18px] border border-sky-200 bg-sky-50 py-2.5 text-[13px] font-medium text-sky-800"><ThumbsUp className="h-4 w-4" />Peppa</button></div></div>)}</div></section>;
}

function MoreView({ profile, isJohnMaster }: { profile: CoachProfile | null; isJohnMaster: boolean }) {
  return <section className="mt-7"><SectionTitle eyebrow="Mer" title="Coachinställningar" /><div className={`rounded-[30px] p-5 ${glass}`}><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Elevkod</p><p className="mt-2 text-3xl font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : profile?.invite_code ?? "–"}</p><p className="mt-2 text-sm leading-6 text-slate-500">Elever använder koden för att koppla sitt SG4-konto till dig.</p></div><Link to="/" className={`mt-3 flex items-center justify-between rounded-[24px] px-4 py-4 text-sm font-medium ${glass}`}><span>Byt till spelarvy</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link></section>;
}

function CoachNav({ view, onChange }: { view: CoachView; onChange: (view: CoachView) => void }) {
  const items = [
    ["overview", "Översikt", LayoutDashboard],
    ["players", "Elever", Users],
    ["plan", "Planera", ClipboardList],
    ["feedback", "Feedback", MessageCircle],
    ["more", "Mer", MoreHorizontal],
  ] as const;
  return <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="grid grid-cols-5 rounded-[30px] border border-white/90 bg-white/92 px-1.5 py-2 shadow-[0_18px_50px_-18px_rgba(51,65,85,.35)] backdrop-blur-2xl">{items.map(([key, label, Icon]) => { const active = view === key; return <button key={key} onClick={() => { onChange(key); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-1 py-2 transition ${active ? "bg-sky-50 text-sky-700" : "text-slate-400"}`}><Icon className="h-[19px] w-[19px]" /><span className="truncate text-[9px] font-semibold">{label}</span></button>; })}</div></nav>;
}

function PlayerCard({ player, active, onClick }: { player: PlayerRow; active: boolean; onClick: () => void }) {
  const isRealJohn = player.relationship.id === "preview-self-john";
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-[24px] px-4 py-4 text-left transition-all ${active ? "border border-sky-200/80 bg-[#f8fbfd]" : glass}`}><span className="flex min-w-0 items-center gap-3.5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>{player.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-[15px] font-medium">{player.name}</span>{isRealJohn ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-sky-700 ring-1 ring-sky-100">Live data</span> : null}</span><span className="mt-1 block text-xs text-slate-400">{player.snapshot?.test_count ?? 0} tester · HCP {player.snapshot?.est_hcp ?? "–"}</span></span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></button>;
}

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: string }) {
  return <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">{eyebrow}</p><h2 className="mt-1 text-xl font-medium tracking-[-.035em]">{title}</h2></div>{right ? <span className="text-xs text-slate-400">{right}</span> : null}</div>;
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return <div><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{categoryLabel(session.category)}</p><p className="mt-1.5 text-[15px] font-medium tracking-[-.02em] text-slate-800">{testLabel(session.test_id)}</p></div><span className="shrink-0 text-[11px] text-slate-400">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div><div className="mt-3 flex gap-2">{session.score !== null ? <span className="rounded-full border border-sky-200/60 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-800">Score {formatNumber(session.score)}</span> : null}{session.test_handicap !== null ? <span className="rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">Test-HCP {formatNumber(session.test_handicap)}</span> : null}</div></div>;
}

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function shortLabel(type: ActionType) { return ({ focus: "Fokus", goal: "Mål", session: "Pass", comment: "Kommentar", reaction: "Pepp" })[type]; }
function placeholderFor(type: ActionType) { return ({ focus: "Ex. Approach 100–150 m", goal: "Ex. 70 % inom 10 m", session: "Ex. 18 slag Approach", comment: "Ex. Bra utveckling i dagens pass", reaction: "Ex. Grymt jobbat!" })[type]; }
