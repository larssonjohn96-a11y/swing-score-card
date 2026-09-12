import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, MessageCircle, Target, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/coach")({ component: CoachPage });

const db = supabase as any;
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

function CoachPage() {
  useHideBottomNav(true);
  const { user, displayName, loading } = useAuth();
  const isJohnMaster = (displayName ?? "").trim().toLowerCase() === "john";
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

  const visiblePlayers = isJohnMaster && players.length === 0 ? DEMO_PLAYERS : players;
  const visibleSessions = isJohnMaster && players.length === 0 ? DEMO_SESSIONS : sessions;
  const effectiveProfile = profile ?? (isJohnMaster ? { user_id: user?.id ?? "demo-john", display_name: "Coach John", club_name: null, invite_code: "JOHN" } : null);
  const selectedPlayer = useMemo(() => visiblePlayers.find((p) => p.relationship.player_id === selectedPlayerId) ?? null, [visiblePlayers, selectedPlayerId]);
  const selectedSessions = selectedPlayerId ? visibleSessions[selectedPlayerId] ?? [] : [];
  const usingDemo = isJohnMaster && players.length === 0;

  useEffect(() => { if (user) void loadCoachData(); }, [user]);
  useEffect(() => {
    if (!selectedPlayerId && visiblePlayers.length) setSelectedPlayerId(visiblePlayers[0].relationship.player_id);
  }, [visiblePlayers, selectedPlayerId]);
  useEffect(() => { setSelectedSessionId(null); }, [selectedPlayerId]);

  async function loadCoachData() {
    if (!user) return;
    const [{ data: coachProfile }, { data: rels }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("coach_relationships").select("*").eq("coach_id", user.id).eq("status", "accepted"),
    ]);
    setProfile(coachProfile ?? null);
    const coachRels = (rels ?? []) as Relationship[];
    if (!coachRels.length) {
      setPlayers([]);
      setSessions({});
      return;
    }

    const ids = coachRels.map((r) => r.player_id);
    const [{ data: profiles }, { data: snapshots }, { data: training }] = await Promise.all([
      db.from("profiles").select("id,display_name").in("id", ids),
      db.from("player_snapshots").select("*").in("user_id", ids),
      db.from("test_sessions").select("id,user_id,test_id,category,played_at,score,test_handicap,metrics").in("user_id", ids).eq("test_type", "training").order("played_at", { ascending: false }).limit(60),
    ]);

    setPlayers(coachRels.map((relationship) => ({
      relationship,
      name: profiles?.find((p: any) => p.id === relationship.player_id)?.display_name ?? "Spelare",
      snapshot: snapshots?.find((s: any) => s.user_id === relationship.player_id),
    })));

    const grouped: Record<string, TrainingSession[]> = {};
    for (const session of training ?? []) {
      if (!grouped[session.user_id]) grouped[session.user_id] = [];
      if (grouped[session.user_id].length < 12) grouped[session.user_id].push(session);
    }
    setSessions(grouped);
  }

  function prepareFeedback(session: TrainingSession, type: "comment" | "reaction") {
    setSelectedSessionId(session.id);
    setActionType(type);
    setTitle(type === "reaction" ? "Grymt jobbat!" : "Feedback på passet");
    setBody("");
  }

  async function addAction() {
    if (!user || !selectedPlayer || !title.trim()) return;
    if (usingDemo) {
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
    }
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-md p-5">Laddar…</main>;
  if (!user) return <main className="mx-auto min-h-screen max-w-md p-5"><Link to="/konto" className="font-semibold text-primary">Logga in för att använda coachvyn →</Link></main>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl leading-none tracking-wide">SG4 Coach</span>
        <div className="relative">
          <button type="button" onClick={() => setRoleMenuOpen((open) => !open)} className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold">
            {isJohnMaster ? "Coach John" : effectiveProfile?.display_name ?? "Coach"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {roleMenuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-44 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
              <Link to="/" onClick={() => setRoleMenuOpen(false)} className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-muted">Byt till spelarvy</Link>
            </div>
          ) : null}
        </div>
      </div>

      <section className="mt-6 rounded-[30px] border border-border bg-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Coachdashboard</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Dina spelare.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Följ träning, ge feedback och styr nästa fokus.</p>
      </section>

      {effectiveProfile ? <div className="mt-4 rounded-3xl border border-border bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Elevkod</p><p className="mt-1 font-display text-3xl tracking-wider">{isJohnMaster ? "JOHN" : effectiveProfile.invite_code}</p></div> : null}
      {message ? <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">{message}</p> : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">Elever</h2><span className="text-xs text-muted-foreground">{visiblePlayers.length}</span></div>
        <div className="space-y-2">
          {visiblePlayers.map((player) => (
            <button key={player.relationship.id} onClick={() => setSelectedPlayerId(player.relationship.player_id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selectedPlayerId === player.relationship.player_id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <span><span className="block font-semibold">{player.name}</span><span className="text-xs text-muted-foreground">{player.snapshot?.test_count ?? 0} tester · HCP {player.snapshot?.est_hcp ?? "–"}</span></span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </section>

      {selectedPlayer ? <>
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">Senaste träningen</h2><span className="text-xs text-muted-foreground">{selectedSessions.length} pass</span></div>
          <div className="space-y-3">
            {selectedSessions.length ? selectedSessions.map((session) => (
              <div key={session.id} className={`rounded-3xl border bg-card p-4 ${selectedSessionId === session.id ? "border-primary" : "border-border"}`}>
                <SessionSummary session={session} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => prepareFeedback(session, "comment")} className="flex items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-sm font-semibold"><MessageCircle className="h-4 w-4" />Kommentera</button>
                  <button onClick={() => prepareFeedback(session, "reaction")} className="flex items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-sm font-semibold"><ThumbsUp className="h-4 w-4" />Peppa</button>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Inga synkade träningspass ännu.</p>}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-semibold">Styr nästa steg för {selectedPlayer.name}</h3></div>
          {selectedSessionId ? <button onClick={() => setSelectedSessionId(null)} className="mt-3 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Feedback på valt pass · ta bort ×</button> : null}
          <div className="mt-4 grid grid-cols-5 gap-1">
            {(["focus", "goal", "session", "comment", "reaction"] as ActionType[]).map((type) => <button key={type} onClick={() => { setActionType(type); if (type !== "comment" && type !== "reaction") setSelectedSessionId(null); }} className={`rounded-xl px-2 py-2 text-[10px] font-bold ${actionType === type ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{shortLabel(type)}</button>)}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(actionType)} className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kort kommentar (valfritt)" rows={3} className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3" />
          <button onClick={addAction} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Skicka till spelaren</button>
        </section>
      </> : null}
    </main>
  );
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return <div><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{categoryLabel(session.category)}</p><p className="mt-1 font-semibold">{testLabel(session.test_id)}</p></div><span className="shrink-0 text-xs text-muted-foreground">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div><div className="mt-3 flex gap-2">{session.score !== null ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Score {formatNumber(session.score)}</span> : null}{session.test_handicap !== null ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Test-HCP {formatNumber(session.test_handicap)}</span> : null}</div></div>;
}

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function shortLabel(type: ActionType) { return ({ focus: "Fokus", goal: "Mål", session: "Pass", comment: "Kommentar", reaction: "Pepp" })[type]; }
function placeholderFor(type: ActionType) { return ({ focus: "Ex. Approach 100–150 m", goal: "Ex. 70 % inom 10 m", session: "Ex. 18 slag Approach", comment: "Ex. Bra utveckling i dagens pass", reaction: "Ex. Grymt jobbat!" })[type]; }
