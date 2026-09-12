import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
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
type CoachView = "overview" | "players" | "plan" | "progress" | "more";
type ActionType = "focus" | "goal" | "session" | "comment" | "reaction";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean; created_at?: string };
type TrainingSession = { id: string; test_id: string; category: string; played_at: string; score: number | null; test_handicap: number | null; metrics: Record<string, unknown> | null };
type CoachAction = { id: string; player_id: string; action_type: ActionType; title: string; body: string | null; session_id: string | null; completed_at: string | null; created_at: string };
type PlayerRow = { relationship: Relationship; name: string; snapshot?: { est_hcp?: number | null; test_count?: number } };

const DEMO_PLAYERS: PlayerRow[] = [
  { relationship: { id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", status: "accepted", share_training_data: true, created_at: "2026-03-18T12:00:00Z" }, name: "Emma", snapshot: { est_hcp: 18.4, test_count: 14 } },
  { relationship: { id: "demo-rel-oskar", player_id: "demo-oskar", coach_id: "demo-john", status: "accepted", share_training_data: true, created_at: "2026-01-22T12:00:00Z" }, name: "Oskar", snapshot: { est_hcp: 9.7, test_count: 23 } },
  { relationship: { id: "demo-rel-sara", player_id: "demo-sara", coach_id: "demo-john", status: "accepted", share_training_data: true, created_at: "2026-06-02T12:00:00Z" }, name: "Sara", snapshot: { est_hcp: 27.1, test_count: 8 } },
];

const DEMO_SESSIONS: Record<string, TrainingSession[]> = {
  "demo-emma": [
    { id: "demo-session-emma-1", test_id: "approach-precision", category: "approach", played_at: "2026-09-12T14:30:00Z", score: 72, test_handicap: 17.8, metrics: null },
    { id: "demo-session-emma-2", test_id: "fairway-streak", category: "driving", played_at: "2026-07-10T16:10:00Z", score: 7, test_handicap: 22.1, metrics: null },
  ],
  "demo-oskar": [
    { id: "demo-session-oskar-1", test_id: "driver-konsekvens", category: "driving", played_at: "2026-09-11T17:20:00Z", score: 81, test_handicap: 8.9, metrics: null },
    { id: "demo-session-oskar-2", test_id: "lagputt-ladder", category: "puttning", played_at: "2026-04-09T15:00:00Z", score: 15, test_handicap: 11.8, metrics: null },
  ],
  "demo-sara": [
    { id: "demo-session-sara-1", test_id: "8-bollar", category: "around-the-green", played_at: "2026-09-12T09:45:00Z", score: 11, test_handicap: 25.9, metrics: null },
    { id: "demo-session-sara-2", test_id: "approach-precision", category: "approach", played_at: "2026-06-18T09:45:00Z", score: 48, test_handicap: 30.2, metrics: null },
  ],
};

const DEMO_ACTIONS: CoachAction[] = [
  { id: "demo-action-emma-focus", player_id: "demo-emma", action_type: "focus", title: "Approach 100–150 m", body: "Prioritera startlinje och längdkontroll.", session_id: null, completed_at: null, created_at: "2026-09-08T10:00:00Z" },
  { id: "demo-action-emma-goal", player_id: "demo-emma", action_type: "goal", title: "70 % inom 10 m", body: null, session_id: null, completed_at: null, created_at: "2026-09-08T09:55:00Z" },
  { id: "demo-action-oskar-session", player_id: "demo-oskar", action_type: "session", title: "Driver med konsekvens", body: "Kör två gånger denna vecka.", session_id: null, completed_at: null, created_at: "2026-09-07T10:00:00Z" },
  { id: "demo-action-sara-focus", player_id: "demo-sara", action_type: "focus", title: "Runt green", body: "Fokus på kontakt och landningspunkt.", session_id: null, completed_at: null, created_at: "2026-09-05T10:00:00Z" },
];

const glass = "border border-white/90 bg-white/82 shadow-[0_18px_44px_-28px_rgba(51,65,85,.32),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[24px] dark:border-white/10 dark:bg-white/[0.08]";

function CoachPage() {
  useHideBottomNav(true);
  const { user, displayName, loading } = useAuth();
  const isJohnMaster = (displayName ?? "").trim().toLowerCase() === "john";
  const [view, setView] = useState<CoachView>("overview");
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sessions, setSessions] = useState<Record<string, TrainingSession[]>>({});
  const [actions, setActions] = useState<CoachAction[]>([]);
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
  const visibleActions = isJohnMaster && !hasRealCoachStudents ? [...actions, ...DEMO_ACTIONS] : actions;
  const effectiveProfile = profile ?? (isJohnMaster ? { user_id: user?.id ?? "demo-john", display_name: "Coach John", club_name: null, invite_code: "JOHN" } : null);
  const selectedPlayer = useMemo(() => visiblePlayers.find((p) => p.relationship.player_id === selectedPlayerId) ?? visiblePlayers[0] ?? null, [visiblePlayers, selectedPlayerId]);
  const selectedIsPreview = selectedPlayer?.relationship.id === "preview-self-john" || selectedPlayer?.relationship.id.startsWith("demo-");
  const allRecentSessions = useMemo(() => visiblePlayers.flatMap((player) => (visibleSessions[player.relationship.player_id] ?? []).map((session) => ({ player, session }))).sort((a, b) => +new Date(b.session.played_at) - +new Date(a.session.played_at)).slice(0, 12), [visiblePlayers, visibleSessions]);

  useEffect(() => { if (user) void loadCoachData(); }, [user]);
  useEffect(() => { if (!selectedPlayerId && visiblePlayers.length) setSelectedPlayerId(visiblePlayers[0].relationship.player_id); }, [visiblePlayers, selectedPlayerId]);
  useEffect(() => { setSelectedSessionId(null); }, [selectedPlayerId]);

  async function loadCoachData() {
    if (!user) return;
    const [{ data: coachProfile }, { data: rels }, { data: coachActions }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("coach_relationships").select("*").eq("coach_id", user.id).eq("status", "accepted"),
      db.from("coach_actions").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setProfile(coachProfile ?? null);
    setActions((coachActions ?? []) as CoachAction[]);
    const coachRels = (rels ?? []) as Relationship[];
    const ids = [...new Set([...(isJohnMaster ? [user.id] : []), ...coachRels.map((r) => r.player_id)])];
    if (!ids.length) { setPlayers([]); setSessions({}); return; }

    const [{ data: profiles }, { data: snapshots }, { data: training }] = await Promise.all([
      db.from("profiles").select("id,display_name").in("id", ids),
      db.from("player_snapshots").select("*").in("user_id", ids),
      db.from("test_sessions").select("id,user_id,test_id,category,played_at,score,test_handicap,metrics").in("user_id", ids).eq("test_type", "training").order("played_at", { ascending: false }).limit(100),
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
      if (grouped[session.user_id].length < 20) grouped[session.user_id].push(session);
    }
    setSessions(grouped);
  }

  function choosePlayer(playerId: string, nextView?: CoachView) {
    setSelectedPlayerId(playerId);
    setSelectedSessionId(null);
    if (nextView) setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prepareFeedback(playerId: string, session: TrainingSession, type: "comment" | "reaction") {
    setSelectedPlayerId(playerId);
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
    const payload = { relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, action_type: actionType, title: title.trim(), body: body.trim() || null, session_id: selectedSessionId };
    const { data, error } = await db.from("coach_actions").insert(payload).select("*").single();
    if (!error) {
      if (data) setActions((current) => [data as CoachAction, ...current]);
      setTitle(""); setBody(""); setSelectedSessionId(null); setMessage("Skickat till spelaren.");
    }
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

        {view === "overview" ? <OverviewView players={visiblePlayers} sessions={visibleSessions} actions={visibleActions} recent={allRecentSessions} effectiveProfile={effectiveProfile} isJohnMaster={isJohnMaster} onPlayer={(id) => choosePlayer(id, "players")} onPlan={(id) => choosePlayer(id, "plan")} /> : null}
        {view === "players" ? <PlayersView players={visiblePlayers} selectedPlayerId={selectedPlayerId} sessions={visibleSessions} actions={visibleActions} selectedSessionId={selectedSessionId} onPlayer={(id) => choosePlayer(id)} onSession={setSelectedSessionId} onPlan={(id) => choosePlayer(id, "plan")} onFeedback={prepareFeedback} /> : null}
        {view === "plan" ? <PlanView players={visiblePlayers} selectedPlayer={selectedPlayer} selectedPlayerId={selectedPlayerId} selectedSessionId={selectedSessionId} actions={visibleActions} actionType={actionType} title={title} body={body} setSelectedPlayerId={setSelectedPlayerId} setSelectedSessionId={setSelectedSessionId} setActionType={setActionType} setTitle={setTitle} setBody={setBody} addAction={addAction} /> : null}
        {view === "progress" ? <ProgressView players={visiblePlayers} sessions={visibleSessions} onPlayer={(id) => choosePlayer(id, "players")} /> : null}
        {view === "more" ? <MoreView profile={effectiveProfile} isJohnMaster={isJohnMaster} /> : null}
      </div>
      <CoachNav view={view} onChange={setView} />
    </main>
  );
}

function OverviewView({ players, sessions, actions, recent, effectiveProfile, isJohnMaster, onPlayer, onPlan }: { players: PlayerRow[]; sessions: Record<string, TrainingSession[]>; actions: CoachAction[]; recent: { player: PlayerRow; session: TrainingSession }[]; effectiveProfile: CoachProfile | null; isJohnMaster: boolean; onPlayer: (id: string) => void; onPlan: (id: string) => void }) {
  const attention = players.map((player) => {
    const playerSessions = sessions[player.relationship.player_id] ?? [];
    const last = playerSessions[0];
    const days = last ? daysSince(last.played_at) : null;
    const openAction = actions.find((a) => a.player_id === player.relationship.player_id && !a.completed_at && ["focus", "goal", "session"].includes(a.action_type));
    const latestHasFeedback = last ? actions.some((a) => a.player_id === player.relationship.player_id && a.session_id === last.id && ["comment", "reaction"].includes(a.action_type)) : false;
    if (!last) return { player, text: "Ingen träning registrerad ännu", kind: "activity" as const };
    if (days !== null && days >= 14) return { player, text: `${days} dagar sedan senaste träningen`, kind: "activity" as const };
    if (!latestHasFeedback) return { player, text: "Nytt pass väntar på återkoppling", kind: "feedback" as const };
    if (!openAction) return { player, text: "Saknar aktivt fokus eller mål", kind: "plan" as const };
    return null;
  }).filter(Boolean).slice(0, 4) as { player: PlayerRow; text: string; kind: "activity" | "feedback" | "plan" }[];

  return <>
    <section className={`mt-6 overflow-hidden rounded-[34px] p-6 ${glass}`}>
      <div className="flex items-center justify-between"><span className="rounded-full border border-sky-200/60 bg-sky-50/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-800">Översikt</span><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-sky-700"><LayoutDashboard className="h-4.5 w-4.5" /></span></div>
      <h1 className="mt-5 text-[38px] font-medium leading-[.98] tracking-[-.055em]">Dina spelare.</h1>
      <p className="mt-3 max-w-[290px] text-[14px] leading-6 text-slate-500">Se vad som hänt, vem som behöver dig och vad som ska hända härnäst.</p>
      <div className="mt-6 flex items-end justify-between border-t border-slate-200/70 pt-4"><div><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Elever</p><p className="mt-1 text-2xl font-medium">{players.length}</p></div>{effectiveProfile ? <div className="text-right"><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Elevkod</p><p className="mt-1 text-lg font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : effectiveProfile.invite_code}</p></div> : null}</div>
    </section>

    <section className="mt-7"><SectionTitle eyebrow="Att göra" title="Kräver uppmärksamhet" right={`${attention.length}`} />
      <div className="space-y-2.5">{attention.length ? attention.map(({ player, text, kind }) => <button key={`${player.relationship.id}-${kind}`} onClick={() => kind === "plan" ? onPlan(player.relationship.player_id) : onPlayer(player.relationship.player_id)} className={`flex w-full items-center justify-between rounded-[24px] p-4 text-left ${glass}`}><span><span className="block text-[14px] font-medium">{player.name}</span><span className="mt-1 block text-xs text-slate-500">{text}</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>) : <div className={`rounded-[24px] p-4 text-sm text-slate-500 ${glass}`}>Inget akut just nu.</div>}</div>
    </section>

    <section className="mt-8"><SectionTitle eyebrow="Elever" title="Snabböversikt" /><div className="space-y-2.5">{players.slice(0, 3).map((player) => <PlayerCard key={player.relationship.id} player={player} active={false} sessions={sessions[player.relationship.player_id] ?? []} onClick={() => onPlayer(player.relationship.player_id)} />)}</div></section>
    <section className="mt-8"><SectionTitle eyebrow="Senaste" title="Aktivitet" /><div className="space-y-3">{recent.slice(0, 3).map(({ player, session }) => <button onClick={() => onPlayer(player.relationship.player_id)} key={`${player.relationship.id}-${session.id}`} className={`w-full rounded-[26px] p-4 text-left ${glass}`}><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{player.name}</p><SessionSummary session={session} /></button>)}</div></section>
  </>;
}

function PlayersView({ players, selectedPlayerId, sessions, actions, selectedSessionId, onPlayer, onSession, onPlan, onFeedback }: { players: PlayerRow[]; selectedPlayerId: string | null; sessions: Record<string, TrainingSession[]>; actions: CoachAction[]; selectedSessionId: string | null; onPlayer: (id: string) => void; onSession: (id: string | null) => void; onPlan: (id: string) => void; onFeedback: (playerId: string, session: TrainingSession, type: "comment" | "reaction") => void }) {
  const selected = players.find((p) => p.relationship.player_id === selectedPlayerId) ?? players[0];
  const selectedSessions = selected ? sessions[selected.relationship.player_id] ?? [] : [];
  const selectedActions = selected ? actions.filter((a) => a.player_id === selected.relationship.player_id) : [];
  const progress = selected ? getProgress(selected, selectedSessions) : null;
  const activeFocus = selectedActions.find((a) => a.action_type === "focus" && !a.completed_at);
  const activeGoal = selectedActions.find((a) => a.action_type === "goal" && !a.completed_at);
  const activeSession = selectedActions.find((a) => a.action_type === "session" && !a.completed_at);
  const openSession = selectedSessions.find((session) => session.id === selectedSessionId) ?? null;

  return <>
    <section className="mt-7"><SectionTitle eyebrow="Elever" title="Alla spelare" /><div className="space-y-2.5">{players.map((player) => <PlayerCard key={player.relationship.id} player={player} active={selected?.relationship.player_id === player.relationship.player_id} sessions={sessions[player.relationship.player_id] ?? []} onClick={() => onPlayer(player.relationship.player_id)} />)}</div></section>

    {selected ? <>
      <section className="mt-8"><SectionTitle eyebrow="Elevprofil" title={selected.name} right={relationshipAge(selected.relationship)} />
        <div className={`rounded-[30px] p-5 ${glass}`}>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Start" value={progress?.start !== null && progress?.start !== undefined ? formatNumber(progress.start) : "–"} />
            <Metric label="Nu" value={progress?.current !== null && progress?.current !== undefined ? formatNumber(progress.current) : "–"} />
            <Metric label="Förändring" value={progress?.improvement !== null && progress?.improvement !== undefined ? `${progress.improvement > 0 ? "−" : "+"}${formatNumber(Math.abs(progress.improvement))}` : "–"} positive={Boolean(progress && progress.improvement > 0)} />
          </div>
          <div className="mt-5 border-t border-slate-200/70 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Samarbete</p><p className="mt-1 text-sm text-slate-600">{relationshipText(selected.relationship)}</p></div>
        </div>
      </section>

      <section className="mt-8"><SectionTitle eyebrow="Aktuellt" title="Fokus & träningsblock" /><div className={`rounded-[28px] p-5 ${glass}`}>
        <PlanLine label="Fokus" value={activeFocus?.title ?? "Inget aktivt fokus"} />
        <PlanLine label="Mål" value={activeGoal?.title ?? "Inget aktivt mål"} />
        <PlanLine label="Tilldelat pass" value={activeSession?.title ?? "Inget tilldelat pass"} />
        <button onClick={() => onPlan(selected.relationship.player_id)} className="mt-4 w-full rounded-[18px] border border-sky-200 bg-sky-50 py-3 text-sm font-medium text-sky-800">Planera nästa steg</button>
      </div></section>

      <section className="mt-8"><SectionTitle eyebrow={selected.name} title="Senaste träningen" right={`${selectedSessions.length} pass`} /><div className="space-y-3">{selectedSessions.length ? selectedSessions.map((session) => <button key={session.id} onClick={() => onSession(selectedSessionId === session.id ? null : session.id)} className={`w-full rounded-[28px] p-4 text-left transition ${selectedSessionId === session.id ? "border border-sky-200 bg-[#f8fbfd]" : glass}`}><SessionSummary session={session} />{selectedSessionId === session.id ? <ChevronDown className="mt-3 h-4 w-4 text-sky-700" /> : null}</button>) : <div className={`rounded-[26px] p-5 text-sm text-slate-400 ${glass}`}>Inga synkade träningspass ännu.</div>}</div></section>

      {openSession ? <section className="mt-4"><div className={`rounded-[28px] p-5 ${glass}`}><SectionTitle eyebrow="Passdetalj" title={testLabel(openSession.test_id)} right={new Date(openSession.played_at).toLocaleDateString("sv-SE")} /><div className="grid grid-cols-2 gap-2"><Metric label="Score" value={openSession.score !== null ? formatNumber(openSession.score) : "–"} /><Metric label="Test-HCP" value={openSession.test_handicap !== null ? formatNumber(openSession.test_handicap) : "–"} /></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => onFeedback(selected.relationship.player_id, openSession, "comment")} className="flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 py-2.5 text-[13px] font-medium text-slate-600"><MessageCircle className="h-4 w-4" />Kommentera</button><button onClick={() => onFeedback(selected.relationship.player_id, openSession, "reaction")} className="flex items-center justify-center gap-2 rounded-[18px] border border-sky-200 bg-sky-50 py-2.5 text-[13px] font-medium text-sky-800"><ThumbsUp className="h-4 w-4" />Peppa</button></div></div></section> : null}

      <section className="mt-8"><SectionTitle eyebrow="Historik" title="Mål & fokus" /><div className="space-y-2.5">{selectedActions.filter((a) => ["focus", "goal", "session"].includes(a.action_type)).slice(0, 6).map((action) => <div key={action.id} className={`rounded-[22px] p-4 ${glass}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">{shortLabel(action.action_type)}</p><p className="mt-1 text-sm font-medium">{action.title}</p>{action.body ? <p className="mt-1 text-xs leading-5 text-slate-500">{action.body}</p> : null}</div><span className="text-[10px] text-slate-400">{new Date(action.created_at).toLocaleDateString("sv-SE")}</span></div></div>)}{!selectedActions.some((a) => ["focus", "goal", "session"].includes(a.action_type)) ? <div className={`rounded-[22px] p-4 text-sm text-slate-400 ${glass}`}>Ingen planhistorik ännu.</div> : null}</div></section>
    </> : null}
  </>;
}

function PlanView({ players, selectedPlayer, selectedPlayerId, selectedSessionId, actions, actionType, title, body, setSelectedPlayerId, setSelectedSessionId, setActionType, setTitle, setBody, addAction }: any) {
  const playerActions = selectedPlayer ? actions.filter((a: CoachAction) => a.player_id === selectedPlayer.relationship.player_id) : [];
  return <><section className="mt-7"><SectionTitle eyebrow="Planera" title="Nästa steg" /><div className={`rounded-[32px] p-5 ${glass}`}><label className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Elev</label><select value={selectedPlayerId ?? ""} onChange={(e) => { setSelectedPlayerId(e.target.value); setSelectedSessionId(null); }} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none">{players.map((player: PlayerRow) => <option key={player.relationship.id} value={player.relationship.player_id}>{player.name}</option>)}</select><div className="mt-5 grid grid-cols-5 gap-1.5 rounded-[20px] bg-slate-100 p-1.5 ring-1 ring-slate-200/70">{(["focus", "goal", "session", "comment", "reaction"] as ActionType[]).map((type) => <button key={type} onClick={() => { setActionType(type); if (type !== "comment" && type !== "reaction") setSelectedSessionId(null); }} className={`rounded-[14px] px-1.5 py-2 text-[10px] font-medium ${actionType === type ? "bg-white text-sky-800 shadow-sm" : "text-slate-500"}`}>{shortLabel(type)}</button>)}</div>{selectedSessionId ? <button onClick={() => setSelectedSessionId(null)} className="mt-4 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">Kopplad till valt pass · ta bort ×</button> : null}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(actionType)} className="mt-4 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none" /><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kort kommentar (valfritt)" rows={3} className="mt-2 w-full resize-none rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none" /><button onClick={addAction} disabled={!selectedPlayer} className="mt-3 w-full rounded-[20px] bg-sky-600 py-3.5 text-sm font-medium text-white disabled:opacity-40">Skicka till spelaren</button></div></section>
    <section className="mt-8"><SectionTitle eyebrow="Träningsblock" title="Aktuellt upplägg" /><div className={`rounded-[28px] p-5 ${glass}`}><PlanLine label="Fokus" value={playerActions.find((a: CoachAction) => a.action_type === "focus" && !a.completed_at)?.title ?? "Ej satt"} /><PlanLine label="Mål" value={playerActions.find((a: CoachAction) => a.action_type === "goal" && !a.completed_at)?.title ?? "Ej satt"} /><PlanLine label="Pass" value={playerActions.find((a: CoachAction) => a.action_type === "session" && !a.completed_at)?.title ?? "Ej tilldelat"} /><p className="mt-4 text-xs leading-5 text-slate-400">Fokus + mål + tilldelat pass fungerar som elevens aktiva träningsblock mellan lektionerna.</p></div></section>
  </>;
}

function ProgressView({ players, sessions, onPlayer }: { players: PlayerRow[]; sessions: Record<string, TrainingSession[]>; onPlayer: (id: string) => void }) {
  const improving = players.filter((p) => { const x = getProgress(p, sessions[p.relationship.player_id] ?? []); return x.improvement !== null && x.improvement > 0; }).length;
  return <>
    <section className={`mt-6 rounded-[34px] p-6 ${glass}`}><div className="flex items-center justify-between"><span className="rounded-full border border-sky-200/60 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-800">Utveckling</span><BarChart3 className="h-5 w-5 text-sky-700" /></div><h1 className="mt-5 text-[34px] font-medium leading-none tracking-[-.05em]">Blir eleverna bättre?</h1><p className="mt-3 text-sm leading-6 text-slate-500">Jämför första registrerade nivån med nuläget och öppna eleven för mer kontext.</p><div className="mt-5 grid grid-cols-2 gap-2"><Metric label="Elever" value={String(players.length)} /><Metric label="Förbättras" value={String(improving)} positive={improving > 0} /></div></section>
    <section className="mt-8"><SectionTitle eyebrow="Start → nu" title="Elevutveckling" /><div className="space-y-3">{players.map((player) => { const progress = getProgress(player, sessions[player.relationship.player_id] ?? []); return <button key={player.relationship.id} onClick={() => onPlayer(player.relationship.player_id)} className={`w-full rounded-[28px] p-5 text-left ${glass}`}><div className="flex items-center justify-between"><div><p className="text-[15px] font-medium">{player.name}</p><p className="mt-1 text-xs text-slate-400">{relationshipText(player.relationship)}</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Start" value={progress.start !== null ? formatNumber(progress.start) : "–"} /><Metric label="Nu" value={progress.current !== null ? formatNumber(progress.current) : "–"} /><Metric label="Utveckling" value={progress.improvement !== null ? `${progress.improvement > 0 ? "−" : "+"}${formatNumber(Math.abs(progress.improvement))}` : "–"} positive={Boolean(progress.improvement && progress.improvement > 0)} /></div></button>; })}</div></section>
  </>;
}

function MoreView({ profile, isJohnMaster }: { profile: CoachProfile | null; isJohnMaster: boolean }) {
  return <section className="mt-7"><SectionTitle eyebrow="Mer" title="Coachinställningar" /><div className={`rounded-[30px] p-5 ${glass}`}><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Elevkod</p><p className="mt-2 text-3xl font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : profile?.invite_code ?? "–"}</p><p className="mt-2 text-sm leading-6 text-slate-500">Elever använder koden för att koppla sitt SG4-konto till dig.</p></div><Link to="/" className={`mt-3 flex items-center justify-between rounded-[24px] px-4 py-4 text-sm font-medium ${glass}`}><span>Byt till spelarvy</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link></section>;
}

function CoachNav({ view, onChange }: { view: CoachView; onChange: (view: CoachView) => void }) {
  const items = [
    ["overview", "Översikt", LayoutDashboard],
    ["players", "Elever", Users],
    ["plan", "Planera", ClipboardList],
    ["progress", "Utveckling", BarChart3],
    ["more", "Mer", MoreHorizontal],
  ] as const;
  return <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="grid grid-cols-5 rounded-[30px] border border-white/90 bg-white/92 px-1.5 py-2 shadow-[0_18px_50px_-18px_rgba(51,65,85,.35)] backdrop-blur-2xl">{items.map(([key, label, Icon]) => { const active = view === key; return <button key={key} onClick={() => { onChange(key); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-1 py-2 transition ${active ? "bg-sky-50 text-sky-700" : "text-slate-400"}`}><Icon className="h-[19px] w-[19px]" /><span className="truncate text-[9px] font-semibold">{label}</span></button>; })}</div></nav>;
}

function PlayerCard({ player, active, sessions, onClick }: { player: PlayerRow; active: boolean; sessions: TrainingSession[]; onClick: () => void }) {
  const isRealJohn = player.relationship.id === "preview-self-john";
  const progress = getProgress(player, sessions);
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-[24px] px-4 py-4 text-left transition-all ${active ? "border border-sky-200/80 bg-[#f8fbfd]" : glass}`}><span className="flex min-w-0 items-center gap-3.5"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>{player.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-[15px] font-medium">{player.name}</span>{isRealJohn ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-sky-700 ring-1 ring-sky-100">Live data</span> : null}</span><span className="mt-1 block text-xs text-slate-400">HCP {progress.current !== null ? formatNumber(progress.current) : "–"}{progress.improvement !== null && progress.improvement > 0 ? ` · −${formatNumber(progress.improvement)} sedan start` : ""}</span></span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></button>;
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="rounded-[18px] border border-slate-200/70 bg-slate-50/80 px-3 py-3"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-400">{label}</p><p className={`mt-1 text-[17px] font-medium tracking-[-.03em] ${positive ? "text-emerald-600" : "text-slate-800"}`}>{value}</p></div>;
}

function PlanLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 py-3 first:pt-0 last:border-0 last:pb-0"><span className="text-xs text-slate-400">{label}</span><span className="max-w-[65%] text-right text-sm font-medium text-slate-700">{value}</span></div>;
}

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: string }) {
  return <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">{eyebrow}</p><h2 className="mt-1 text-xl font-medium tracking-[-.035em]">{title}</h2></div>{right ? <span className="text-xs text-slate-400">{right}</span> : null}</div>;
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return <div><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{categoryLabel(session.category)}</p><p className="mt-1.5 text-[15px] font-medium tracking-[-.02em] text-slate-800">{testLabel(session.test_id)}</p></div><span className="shrink-0 text-[11px] text-slate-400">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div><div className="mt-3 flex gap-2">{session.score !== null ? <span className="rounded-full border border-sky-200/60 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-800">Score {formatNumber(session.score)}</span> : null}{session.test_handicap !== null ? <span className="rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">Test-HCP {formatNumber(session.test_handicap)}</span> : null}</div></div>;
}

function getProgress(player: PlayerRow, sessions: TrainingSession[]) {
  const hcpSessions = [...sessions].filter((session) => session.test_handicap !== null).sort((a, b) => +new Date(a.played_at) - +new Date(b.played_at));
  const start = hcpSessions[0]?.test_handicap ?? null;
  const latestMeasured = hcpSessions[hcpSessions.length - 1]?.test_handicap ?? null;
  const current = player.snapshot?.est_hcp ?? latestMeasured;
  const improvement = start !== null && current !== null && current !== undefined ? start - current : null;
  return { start, current: current ?? null, improvement };
}

function relationshipAge(relationship: Relationship) {
  if (!relationship.created_at) return "Live-konto";
  const days = Math.max(0, Math.floor((Date.now() - +new Date(relationship.created_at)) / 86400000));
  if (days < 31) return `${days} dagar`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} mån`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} år ${rest} mån` : `${years} år`;
}

function relationshipText(relationship: Relationship) {
  if (!relationship.created_at) return "Live-data från spelarens konto. Ingen faktisk coachrelation finns ännu.";
  return `Elev sedan ${new Date(relationship.created_at).toLocaleDateString("sv-SE")} · ${relationshipAge(relationship)} tillsammans`;
}

function daysSince(date: string) { return Math.max(0, Math.floor((Date.now() - +new Date(date)) / 86400000)); }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function shortLabel(type: ActionType) { return ({ focus: "Fokus", goal: "Mål", session: "Pass", comment: "Kommentar", reaction: "Pepp" })[type]; }
function placeholderFor(type: ActionType) { return ({ focus: "Ex. Approach 100–150 m", goal: "Ex. 70 % inom 10 m", session: "Ex. 18 slag Approach", comment: "Ex. Bra utveckling i dagens pass", reaction: "Ex. Grymt jobbat!" })[type]; }
