import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/min-coach")({ component: PlayerCoachPage });

const db = supabase as any;
type ActionType = "focus" | "goal" | "session" | "comment" | "reaction";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean };
type CoachAction = { id: string; action_type: ActionType; title: string; body: string | null; route: string | null; session_id: string | null; completed_at: string | null; created_at: string };
type TrainingSession = { id: string; test_id: string; category: string; played_at: string; score: number | null; test_handicap: number | null };

function PlayerCoachPage() {
  const { user, loading } = useAuth();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [actions, setActions] = useState<CoachAction[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { if (user) void loadPlayerCoach(); }, [user]);

  async function loadPlayerCoach() {
    if (!user) return;
    const { data: rel } = await db
      .from("coach_relationships")
      .select("*")
      .eq("player_id", user.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentRelationship = (rel ?? null) as Relationship | null;
    setRelationship(currentRelationship);
    if (!currentRelationship) {
      setCoach(null);
      setActions([]);
      setSessions([]);
      return;
    }

    const [{ data: coachProfile }, { data: coachActions }, { data: training }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", currentRelationship.coach_id).maybeSingle(),
      db.from("coach_actions").select("*").eq("relationship_id", currentRelationship.id).order("created_at", { ascending: false }),
      db.from("test_sessions").select("id,test_id,category,played_at,score,test_handicap").eq("user_id", user.id).eq("test_type", "training").order("played_at", { ascending: false }).limit(12),
    ]);

    setCoach(coachProfile ?? null);
    setActions(coachActions ?? []);
    setSessions(training ?? []);
  }

  async function connectCoach() {
    if (!user || !inviteCode.trim()) return;
    setMessage(null);
    const code = inviteCode.trim().toUpperCase();
    const { data: foundCoach } = await db.from("coach_profiles").select("*").eq("invite_code", code).maybeSingle();
    if (!foundCoach) { setMessage("Ingen coach hittades med den koden."); return; }
    if (foundCoach.user_id === user.id) { setMessage("Du kan inte lägga till dig själv som coach."); return; }

    const { error } = await db.from("coach_relationships").upsert({
      player_id: user.id,
      coach_id: foundCoach.user_id,
      status: "accepted",
      share_training_data: true,
    }, { onConflict: "player_id,coach_id" });

    if (error) { setMessage("Kunde inte lägga till coachen."); return; }
    setInviteCode("");
    setMessage(`${foundCoach.display_name} tillagd.`);
    await loadPlayerCoach();
  }

  async function completeAction(action: CoachAction) {
    await db.from("coach_actions").update({ completed_at: action.completed_at ? null : new Date().toISOString() }).eq("id", action.id);
    await loadPlayerCoach();
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-md p-5">Laddar…</main>;
  if (!user) return <main className="mx-auto min-h-screen max-w-md p-5"><Link to="/konto" className="font-semibold text-primary">Logga in för att använda Min coach →</Link></main>;

  const generalActions = actions.filter((action) => !action.session_id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/konto" aria-label="Tillbaka" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
        <span className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Spelarvy</span>
      </div>

      <section className="mt-5 rounded-[30px] border border-border bg-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Min coach</p>
        <h1 className="mt-2 font-display text-4xl leading-none">Träna mellan lektionerna.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Se fokus, mål och feedback från din coach.</p>
      </section>

      {message ? <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">{message}</p> : null}

      {!relationship || !coach ? (
        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Lägg till coach</h2>
          <p className="mt-2 text-sm text-muted-foreground">Ange koden du fått från din coach.</p>
          <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="COACH-KOD" className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3 uppercase" />
          <button onClick={connectCoach} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Lägg till coach</button>
        </section>
      ) : (
        <div className="mt-5 space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
              <div><p className="font-semibold">{coach.display_name}</p><p className="text-xs text-muted-foreground">{coach.club_name ?? "Din coach"}</p></div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-2xl">Från din coach</h2>
            <div className="space-y-3">
              {generalActions.length ? generalActions.map((action) => (
                <div key={action.id} className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{labelFor(action.action_type)}</p><p className="mt-1 font-semibold">{action.title}</p>{action.body ? <p className="mt-1 text-sm text-muted-foreground">{action.body}</p> : null}</div>
                    {action.action_type === "session" || action.action_type === "goal" ? <button onClick={() => completeAction(action)} className={`flex h-9 w-9 items-center justify-center rounded-full border ${action.completed_at ? "bg-primary text-primary-foreground" : "bg-background"}`}><Check className="h-4 w-4" /></button> : null}
                  </div>
                </div>
              )) : <p className="text-sm text-muted-foreground">Inget fokus eller mål från coachen ännu.</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-2xl">Senaste träningen</h2>
            <div className="space-y-3">
              {sessions.length ? sessions.map((session) => {
                const feedback = actions.filter((action) => action.session_id === session.id);
                return <div key={session.id} className="rounded-3xl border border-border bg-card p-4"><SessionSummary session={session} />{feedback.length ? <div className="mt-3 space-y-2 border-t border-border pt-3">{feedback.map((action) => <div key={action.id} className="rounded-2xl bg-muted p-3"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{labelFor(action.action_type)}</p><p className="mt-1 text-sm font-semibold">{action.title}</p>{action.body ? <p className="mt-1 text-xs text-muted-foreground">{action.body}</p> : null}</div>)}</div> : null}</div>;
              }) : <p className="text-sm text-muted-foreground">Inga synkade träningspass ännu.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return <div><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{categoryLabel(session.category)}</p><p className="mt-1 font-semibold">{testLabel(session.test_id)}</p></div><span className="shrink-0 text-xs text-muted-foreground">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div><div className="mt-3 flex gap-2">{session.score !== null ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Score {formatNumber(session.score)}</span> : null}{session.test_handicap !== null ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">Test-HCP {formatNumber(session.test_handicap)}</span> : null}</div></div>;
}

function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function labelFor(type: ActionType) { return ({ focus: "Veckans fokus", goal: "Mål", session: "Tilldelat pass", comment: "Coachkommentar", reaction: "Uppmuntran" })[type]; }
