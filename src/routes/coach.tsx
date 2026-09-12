import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, MessageCircle, Target, ThumbsUp, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/coach")({ component: CoachPage });

const db = supabase as any;
type Tab = "player" | "coach";
type ActionType = "focus" | "goal" | "session" | "comment" | "reaction";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean };
type CoachAction = { id: string; action_type: ActionType; title: string; body: string | null; route: string | null; session_id: string | null; completed_at: string | null; created_at: string };
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

function CoachPage() {
  const { user, displayName, loading } = useAuth();
  const isJohnMaster = (displayName ?? "").trim().toLowerCase() === "john";
  const [tab, setTab] = useState<Tab>("player");
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [myCoach, setMyCoach] = useState<CoachProfile | null>(null);
  const [actions, setActions] = useState<CoachAction[]>([]);
  const [mySessions, setMySessions] = useState<TrainingSession[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerSessions, setPlayerSessions] = useState<Record<string, TrainingSession[]>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [clubName, setClubName] = useState("");
  const [actionType, setActionType] = useState<ActionType>("focus");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const visiblePlayers = isJohnMaster && players.length === 0 ? DEMO_PLAYERS : players;
  const visibleSessions = isJohnMaster && players.length === 0 ? DEMO_SESSIONS : playerSessions;
  const effectiveCoachProfile: CoachProfile | null = coachProfile ?? (isJohnMaster ? { user_id: user?.id ?? "demo-john", display_name: "Coach John", club_name: "SG4 Coach Preview", invite_code: "JOHN-DEMO" } : null);
  const selectedPlayer = useMemo(() => visiblePlayers.find((p) => p.relationship.player_id === selectedPlayerId) ?? null, [visiblePlayers, selectedPlayerId]);
  const selectedPlayerSessions = selectedPlayerId ? visibleSessions[selectedPlayerId] ?? [] : [];
  const generalActions = actions.filter((a) => !a.session_id);
  const usingDemoCoach = isJohnMaster && players.length === 0;

  useEffect(() => { if (user) void loadAll(); }, [user]);
  useEffect(() => { setSelectedSessionId(null); }, [selectedPlayerId]);
  useEffect(() => {
    if (!isJohnMaster) return;
    setTab("coach");
    if (!selectedPlayerId) setSelectedPlayerId(DEMO_PLAYERS[0].relationship.player_id);
  }, [isJohnMaster]);

  async function loadAll() {
    if (!user) return;
    const [{ data: cp }, { data: rels }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("coach_relationships").select("*").or(`player_id.eq.${user.id},coach_id.eq.${user.id}`).eq("status", "accepted"),
    ]);
    setCoachProfile(cp ?? null);
    const allRels = (rels ?? []) as Relationship[];
    const playerRel = allRels.find((r) => r.player_id === user.id) ?? null;

    if (playerRel) {
      const [{ data: coach }, { data: myActions }, { data: sessions }] = await Promise.all([
        db.from("coach_profiles").select("*").eq("user_id", playerRel.coach_id).maybeSingle(),
        db.from("coach_actions").select("*").eq("relationship_id", playerRel.id).order("created_at", { ascending: false }),
        db.from("test_sessions").select("id,test_id,category,played_at,score,test_handicap,metrics").eq("user_id", user.id).eq("test_type", "training").order("played_at", { ascending: false }).limit(12),
      ]);
      setMyCoach(coach ?? null);
      setActions(myActions ?? []);
      setMySessions(sessions ?? []);
    } else {
      setMyCoach(null);
      setActions([]);
      setMySessions([]);
    }

    const coachRels = allRels.filter((r) => r.coach_id === user.id);
    if (!coachRels.length) {
      setPlayers([]);
      setPlayerSessions({});
      if (isJohnMaster) setSelectedPlayerId(DEMO_PLAYERS[0].relationship.player_id);
      else setSelectedPlayerId(null);
      return;
    }

    const ids = coachRels.map((r) => r.player_id);
    const [{ data: profiles }, { data: snapshots }, { data: sessions }] = await Promise.all([
      db.from("profiles").select("id,display_name").in("id", ids),
      db.from("player_snapshots").select("*").in("user_id", ids),
      db.from("test_sessions").select("id,user_id,test_id,category,played_at,score,test_handicap,metrics").in("user_id", ids).eq("test_type", "training").order("played_at", { ascending: false }).limit(60),
    ]);

    const rows = coachRels.map((relationship) => ({
      relationship,
      name: profiles?.find((p: any) => p.id === relationship.player_id)?.display_name ?? "Spelare",
      snapshot: snapshots?.find((s: any) => s.user_id === relationship.player_id),
    }));
    const grouped: Record<string, TrainingSession[]> = {};
    for (const session of sessions ?? []) {
      if (!grouped[session.user_id]) grouped[session.user_id] = [];
      if (grouped[session.user_id].length < 12) grouped[session.user_id].push(session);
    }
    setPlayers(rows);
    setPlayerSessions(grouped);
    setSelectedPlayerId((current) => current && ids.includes(current) ? current : ids[0] ?? null);
  }

  async function connectCoach() {
    if (!user || !inviteCode.trim()) return;
    setMessage(null);
    const { data: coach } = await db.from("coach_profiles").select("*").eq("invite_code", inviteCode.trim().toUpperCase()).maybeSingle();
    if (!coach) { setMessage("Ingen coach hittades med den koden."); return; }
    if (coach.user_id === user.id) { setMessage("Du kan inte lägga till dig själv som coach."); return; }
    const { error } = await db.from("coach_relationships").upsert({ player_id: user.id, coach_id: coach.user_id, status: "accepted", share_training_data: true }, { onConflict: "player_id,coach_id" });
    if (error) { setMessage("Kunde inte koppla coachen."); return; }
    setInviteCode(""); setMessage("Coach tillagd."); await loadAll();
  }

  async function createCoachProfile() {
    if (!user) return;
    const code = `${(displayName ?? "COACH").replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase() || "COACH"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { error } = await db.from("coach_profiles").upsert({ user_id: user.id, display_name: displayName ?? user.email?.split("@")[0] ?? "Coach", club_name: clubName.trim() || null, invite_code: code });
    if (!error) { setMessage("Coachprofil skapad."); await loadAll(); }
  }

  function prepareSessionFeedback(session: TrainingSession, type: "comment" | "reaction") {
    setSelectedSessionId(session.id);
    setActionType(type);
    setTitle(type === "reaction" ? "Grymt jobbat!" : "Feedback på passet");
    setBody("");
  }

  async function addAction() {
    if (!user || !selectedPlayer || !title.trim()) return;
    if (usingDemoCoach) {
      setTitle("");
      setBody("");
      setSelectedSessionId(null);
      setMessage("Preview: skickat till spelaren.");
      return;
    }
    const { error } = await db.from("coach_actions").insert({
      relationship_id: selectedPlayer.relationship.id,
      player_id: selectedPlayer.relationship.player_id,
      coach_id: user.id,
      action_type: actionType,
      title: title.trim(),
      body: body.trim() || null,
      session_id: selectedSessionId,
    });
    if (!error) {
      setTitle("");
      setBody("");
      setSelectedSessionId(null);
      setMessage("Skickat till spelaren.");
      await loadAll();
    }
  }

  async function completeAction(id: string, completed: boolean) {
    await db.from("coach_actions").update({ completed_at: completed ? null : new Date().toISOString() }).eq("id", id);
    await loadAll();
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-md p-5">Laddar…</main>;
  if (!user) return <main className="mx-auto min-h-screen max-w-md p-5"><Link to="/konto" className="font-semibold text-primary">Logga in för att använda coachfunktionen →</Link></main>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/" aria-label="Tillbaka till spelarvy" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="text-right"><span className="block text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">SG4 Coach</span>{isJohnMaster ? <span className="mt-1 block text-sm font-semibold text-foreground">Coach John</span> : null}</div>
      </div>
      <section className="mt-5 rounded-[30px] border border-border bg-card p-5"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Coach + spelare</p><h1 className="mt-2 font-display text-4xl leading-none">Bättre mellan lektionerna.</h1><p className="mt-3 text-sm text-muted-foreground">Fokus → träning → resultat → nästa fokus.</p></section>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
        <button onClick={() => setTab("player")} className={`rounded-xl py-3 text-sm font-semibold ${tab === "player" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Min coach</button>
        <button onClick={() => setTab("coach")} className={`rounded-xl py-3 text-sm font-semibold ${tab === "coach" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Coachvy</button>
      </div>

      {message ? <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">{message}</p> : null}

      {tab === "player" ? (
        <section className="mt-5 space-y-5">
          {myCoach ? (
            <>
              <div className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div><div><p className="font-semibold">{myCoach.display_name}</p><p className="text-xs text-muted-foreground">{myCoach.club_name ?? "Din coach"}</p></div></div><p className="mt-4 text-xs text-muted-foreground">Dina träningstester delas med coachen så länge kopplingen är aktiv.</p></div>
              {generalActions.length ? <div><h2 className="mb-3 font-display text-2xl">Från din coach</h2><div className="space-y-3">{generalActions.map((a) => <ActionCard key={a.id} action={a} onComplete={completeAction} />)}</div></div> : null}
              <div><h2 className="mb-3 font-display text-2xl">Senaste träningen</h2><div className="space-y-3">{mySessions.length ? mySessions.map((session) => { const feedback = actions.filter((a) => a.session_id === session.id); return <div key={session.id} className="rounded-3xl border border-border bg-card p-4"><SessionSummary session={session} />{feedback.length ? <div className="mt-3 space-y-2 border-t border-border pt-3">{feedback.map((a) => <div key={a.id} className="rounded-2xl bg-muted p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{labelFor(a.action_type)}</p><p className="mt-1 text-sm font-semibold">{a.title}</p>{a.body ? <p className="mt-1 text-xs text-muted-foreground">{a.body}</p> : null}</div>)}</div> : null}</div>; }) : <p className="text-sm text-muted-foreground">Inga synkade träningstester ännu.</p>}</div></div>
            </>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-5"><h2 className="font-display text-2xl">Lägg till coach</h2><p className="mt-2 text-sm text-muted-foreground">Be din coach om SG4-koden.</p><input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="COACH-AB12" className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3 uppercase" /><button onClick={connectCoach} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Lägg till coach</button></div>
          )}
        </section>
      ) : (
        <section className="mt-5 space-y-5">
          {!effectiveCoachProfile ? (
            <div className="rounded-3xl border border-border bg-card p-5"><h2 className="font-display text-2xl">Skapa coachprofil</h2><p className="mt-2 text-sm text-muted-foreground">För PGA-pros och tränare som vill följa sina elever mellan lektionerna.</p><input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Klubb / verksamhet (valfritt)" className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3" /><button onClick={createCoachProfile} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Aktivera coachvy</button></div>
          ) : (
            <>
              <div className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Coach</p><p className="mt-1 font-display text-3xl">{effectiveCoachProfile.display_name}</p><p className="mt-1 text-xs text-muted-foreground">{effectiveCoachProfile.club_name}</p></div>{usingDemoCoach ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Preview</span> : null}</div><div className="mt-4 border-t border-border pt-4"><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Din elevkod</p><p className="mt-1 font-display text-3xl tracking-wider">{effectiveCoachProfile.invite_code}</p></div></div>

              <div><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">Elever</h2><span className="text-xs text-muted-foreground">{visiblePlayers.length}</span></div><div className="space-y-2">{visiblePlayers.map((p) => <button key={p.relationship.id} onClick={() => setSelectedPlayerId(p.relationship.player_id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selectedPlayerId === p.relationship.player_id ? "border-primary bg-primary/5" : "border-border bg-card"}`}><span><span className="block font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{p.snapshot?.test_count ?? 0} tester · HCP {p.snapshot?.est_hcp ?? "–"}</span></span><ChevronRight className="h-4 w-4" /></button>)}</div></div>

              {selectedPlayer ? <>
                <div><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">Senaste träningen</h2><span className="text-xs text-muted-foreground">{selectedPlayerSessions.length} pass</span></div><div className="space-y-3">{selectedPlayerSessions.length ? selectedPlayerSessions.map((session) => <div key={session.id} className={`rounded-3xl border bg-card p-4 ${selectedSessionId === session.id ? "border-primary" : "border-border"}`}><SessionSummary session={session} /><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => prepareSessionFeedback(session, "comment")} className="flex items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-sm font-semibold"><MessageCircle className="h-4 w-4" />Kommentera</button><button onClick={() => prepareSessionFeedback(session, "reaction")} className="flex items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-sm font-semibold"><ThumbsUp className="h-4 w-4" />Peppa</button></div></div>) : <p className="text-sm text-muted-foreground">Eleven har inga synkade träningstester ännu.</p>}</div></div>

                <div className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-semibold">Styr nästa steg för {selectedPlayer.name}</h3></div>{selectedSessionId ? <button onClick={() => setSelectedSessionId(null)} className="mt-3 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Feedback på valt träningspass · ta bort koppling ×</button> : null}<div className="mt-4 grid grid-cols-5 gap-1">{(["focus","goal","session","comment","reaction"] as ActionType[]).map((type) => <button key={type} onClick={() => { setActionType(type); if (type !== "comment" && type !== "reaction") setSelectedSessionId(null); }} className={`rounded-xl px-2 py-2 text-[10px] font-bold ${actionType === type ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{shortLabel(type)}</button>)}</div><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(actionType)} className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3" /><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kort kommentar (valfritt)" rows={3} className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3" /><button onClick={addAction} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Skicka till spelaren</button></div>
              </> : null}
            </>
          )}
        </section>
      )}
    </main>
  );
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return <div><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{categoryLabel(session.category)}</p><p className="mt-1 font-semibold">{testLabel(session.test_id)}</p></div><span className="shrink-0 text-xs text-muted-foreground">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div><div className="mt-3 flex gap-2">{session.score !== null ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Score {formatNumber(session.score)}</span> : null}{session.test_handicap !== null ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Test-HCP {formatNumber(session.test_handicap)}</span> : null}</div></div>;
}

function ActionCard({ action, onComplete }: { action: CoachAction; onComplete: (id: string, completed: boolean) => void }) {
  return <div className="rounded-3xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{labelFor(action.action_type)}</p><p className="mt-1 font-semibold">{action.title}</p>{action.body ? <p className="mt-1 text-sm text-muted-foreground">{action.body}</p> : null}</div>{action.action_type === "session" || action.action_type === "goal" ? <button onClick={() => onComplete(action.id, Boolean(action.completed_at))} className={`flex h-9 w-9 items-center justify-center rounded-full border ${action.completed_at ? "bg-primary text-primary-foreground" : "bg-background"}`}><Check className="h-4 w-4" /></button> : null}</div></div>;
}

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function labelFor(type: ActionType) { return ({ focus: "Veckans fokus", goal: "Mål", session: "Tilldelat pass", comment: "Coachkommentar", reaction: "Uppmuntran" })[type]; }
function shortLabel(type: ActionType) { return ({ focus: "Fokus", goal: "Mål", session: "Pass", comment: "Kommentar", reaction: "Pepp" })[type]; }
function placeholderFor(type: ActionType) { return ({ focus: "Ex. Approach 100–150 m", goal: "Ex. 70 % inom 10 m", session: "Ex. 18 slag Approach", comment: "Ex. Bra utveckling i dagens pass", reaction: "Ex. Grymt jobbat!" })[type]; }
