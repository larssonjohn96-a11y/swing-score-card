import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, MessageCircle, Target, ThumbsUp, Users } from "lucide-react";
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

const glass = "border border-white/65 bg-white/54 shadow-[0_20px_60px_-30px_rgba(61,84,120,.32),inset_0_1px_0_rgba(255,255,255,.92)] backdrop-blur-[28px] dark:border-white/10 dark:bg-white/[0.07]";

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

  if (loading) return <main className="min-h-screen bg-[#edf1f4] p-5 text-slate-900 dark:bg-[#101419] dark:text-slate-100">Laddar…</main>;
  if (!user) return <main className="min-h-screen bg-[#edf1f4] p-5 dark:bg-[#101419]"><Link to="/konto" className="font-medium text-sky-700 dark:text-sky-300">Logga in för att använda coachvyn →</Link></main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#edf1f4] text-slate-900 dark:bg-[#101419] dark:text-slate-100">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-200/70 blur-3xl dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute -right-24 top-52 h-80 w-80 rounded-full bg-blue-100/80 blur-3xl dark:bg-blue-400/10" />
      <div className="pointer-events-none absolute bottom-16 left-1/4 h-64 w-64 rounded-full bg-slate-200/90 blur-3xl dark:bg-slate-700/20" />

      <div className="relative mx-auto w-full max-w-md px-5 pb-12 pt-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-slate-500 dark:text-slate-400">SG4</p>
            <span className="mt-0.5 block text-[22px] font-semibold tracking-[-.04em]">Coach</span>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setRoleMenuOpen((open) => !open)} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-slate-700 transition active:scale-[.98] dark:text-slate-200 ${glass}`}>
              {isJohnMaster ? "Coach John" : effectiveProfile?.display_name ?? "Coach"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {roleMenuOpen ? (
              <div className={`absolute right-0 z-50 mt-2 w-48 rounded-[22px] p-1.5 ${glass}`}>
                <Link to="/" onClick={() => setRoleMenuOpen(false)} className="flex w-full items-center rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10">Byt till spelarvy</Link>
              </div>
            ) : null}
          </div>
        </header>

        <section className={`mt-6 overflow-hidden rounded-[34px] p-6 ${glass}`}>
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-sky-200/70 bg-sky-100/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-800 dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-200">Coachdashboard</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/50 text-sky-700 shadow-sm dark:border-white/10 dark:bg-white/[.06] dark:text-sky-300"><Users className="h-4.5 w-4.5" /></span>
          </div>
          <h1 className="mt-5 text-[38px] font-medium leading-[.98] tracking-[-.055em]">Dina spelare.</h1>
          <p className="mt-3 max-w-[280px] text-[14px] leading-6 text-slate-500 dark:text-slate-400">Följ träning, ge feedback och styr nästa fokus.</p>
          <div className="mt-6 flex items-end justify-between border-t border-white/60 pt-4 dark:border-white/10">
            <div><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Elever</p><p className="mt-1 text-2xl font-medium tracking-[-.04em]">{visiblePlayers.length}</p></div>
            {effectiveProfile ? <div className="text-right"><p className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Elevkod</p><p className="mt-1 text-lg font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : effectiveProfile.invite_code}</p></div> : null}
          </div>
        </section>

        {message ? <p className={`mt-4 rounded-[22px] px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${glass}`}>{message}</p> : null}

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between px-1">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Spelare</p><h2 className="mt-1 text-xl font-medium tracking-[-.035em]">Dina elever</h2></div>
            <span className="text-xs text-slate-400">{visiblePlayers.length} st</span>
          </div>
          <div className="space-y-2.5">
            {visiblePlayers.map((player) => {
              const active = selectedPlayerId === player.relationship.player_id;
              return (
                <button key={player.relationship.id} onClick={() => setSelectedPlayerId(player.relationship.player_id)} className={`flex w-full items-center justify-between rounded-[24px] px-4 py-4 text-left transition-all active:scale-[.99] ${active ? "border border-sky-200/80 bg-sky-100/55 shadow-[0_14px_36px_-24px_rgba(14,116,144,.5),inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-2xl dark:border-sky-400/20 dark:bg-sky-400/10" : glass}`}>
                  <span className="flex min-w-0 items-center gap-3.5">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${active ? "bg-sky-600 text-white" : "bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>{player.name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0"><span className="block truncate text-[15px] font-medium tracking-[-.02em]">{player.name}</span><span className="mt-1 block text-xs text-slate-400">{player.snapshot?.test_count ?? 0} tester · HCP {player.snapshot?.est_hcp ?? "–"}</span></span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${active ? "text-sky-700 dark:text-sky-300" : "text-slate-400"}`} />
                </button>
              );
            })}
          </div>
        </section>

        {selectedPlayer ? <>
          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between px-1">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">{selectedPlayer.name}</p><h2 className="mt-1 text-xl font-medium tracking-[-.035em]">Senaste träningen</h2></div>
              <span className="text-xs text-slate-400">{selectedSessions.length} pass</span>
            </div>
            <div className="space-y-3">
              {selectedSessions.length ? selectedSessions.map((session) => (
                <div key={session.id} className={`rounded-[28px] p-4 transition ${selectedSessionId === session.id ? "border border-sky-200/90 bg-sky-100/55 shadow-[0_18px_48px_-28px_rgba(14,116,144,.5)] backdrop-blur-2xl dark:border-sky-400/20 dark:bg-sky-400/10" : glass}`}>
                  <SessionSummary session={session} />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => prepareFeedback(session, "comment")} className="flex items-center justify-center gap-2 rounded-[18px] border border-white/70 bg-white/45 py-2.5 text-[13px] font-medium text-slate-600 transition active:scale-[.98] dark:border-white/10 dark:bg-white/[.05] dark:text-slate-300"><MessageCircle className="h-4 w-4" />Kommentera</button>
                    <button onClick={() => prepareFeedback(session, "reaction")} className="flex items-center justify-center gap-2 rounded-[18px] border border-sky-200/60 bg-sky-100/45 py-2.5 text-[13px] font-medium text-sky-800 transition active:scale-[.98] dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-200"><ThumbsUp className="h-4 w-4" />Peppa</button>
                  </div>
                </div>
              )) : <div className={`rounded-[26px] p-5 text-sm text-slate-400 ${glass}`}>Inga synkade träningspass ännu.</div>}
            </div>
          </section>

          <section className={`mt-8 rounded-[32px] p-5 ${glass}`}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/70 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"><Target className="h-4 w-4" /></span>
              <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Nästa steg</p><h3 className="mt-0.5 text-[17px] font-medium tracking-[-.025em]">Styr träningen för {selectedPlayer.name}</h3></div>
            </div>

            {selectedSessionId ? <button onClick={() => setSelectedSessionId(null)} className="mt-4 rounded-full border border-sky-200/70 bg-sky-100/55 px-3 py-1.5 text-xs font-medium text-sky-800 dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-200">Kopplad till valt pass · ta bort ×</button> : null}

            <div className="mt-5 grid grid-cols-5 gap-1.5 rounded-[20px] bg-slate-200/55 p-1.5 dark:bg-black/20">
              {(["focus", "goal", "session", "comment", "reaction"] as ActionType[]).map((type) => (
                <button key={type} onClick={() => { setActionType(type); if (type !== "comment" && type !== "reaction") setSelectedSessionId(null); }} className={`rounded-[14px] px-1.5 py-2 text-[10px] font-medium transition ${actionType === type ? "bg-white text-sky-800 shadow-sm dark:bg-white/10 dark:text-sky-200" : "text-slate-500 dark:text-slate-400"}`}>{shortLabel(type)}</button>
              ))}
            </div>

            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(actionType)} className="mt-4 w-full rounded-[20px] border border-white/70 bg-white/48 px-4 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:border-white/10 dark:bg-white/[.05] dark:text-slate-100" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kort kommentar (valfritt)" rows={3} className="mt-2 w-full resize-none rounded-[20px] border border-white/70 bg-white/48 px-4 py-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:border-white/10 dark:bg-white/[.05] dark:text-slate-100" />
            <button onClick={addAction} className="mt-3 w-full rounded-[20px] border border-sky-500/20 bg-sky-600 py-3.5 text-sm font-medium text-white shadow-[0_14px_28px_-16px_rgba(2,132,199,.75)] transition active:scale-[.99] dark:bg-sky-500">Skicka till spelaren</button>
          </section>
        </> : null}
      </div>
    </main>
  );
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">{categoryLabel(session.category)}</p>
          <p className="mt-1.5 text-[15px] font-medium tracking-[-.02em] text-slate-800 dark:text-slate-100">{testLabel(session.test_id)}</p>
        </div>
        <span className="shrink-0 text-[11px] text-slate-400">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span>
      </div>
      <div className="mt-3 flex gap-2">
        {session.score !== null ? <span className="rounded-full border border-sky-200/60 bg-sky-100/45 px-3 py-1 text-[11px] font-medium text-sky-800 dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-200">Score {formatNumber(session.score)}</span> : null}
        {session.test_handicap !== null ? <span className="rounded-full border border-white/60 bg-white/40 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[.05] dark:text-slate-300">Test-HCP {formatNumber(session.test_handicap)}</span> : null}
      </div>
    </div>
  );
}

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function shortLabel(type: ActionType) { return ({ focus: "Fokus", goal: "Mål", session: "Pass", comment: "Kommentar", reaction: "Pepp" })[type]; }
function placeholderFor(type: ActionType) { return ({ focus: "Ex. Approach 100–150 m", goal: "Ex. 70 % inom 10 m", session: "Ex. 18 slag Approach", comment: "Ex. Bra utveckling i dagens pass", reaction: "Ex. Grymt jobbat!" })[type]; }
