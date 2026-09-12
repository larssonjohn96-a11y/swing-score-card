import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Target, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/coach")({ component: CoachPage });

const db = supabase as any;
type Tab = "player" | "coach";
type ActionType = "focus" | "goal" | "session" | "comment" | "reaction";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean };
type CoachAction = { id: string; action_type: ActionType; title: string; body: string | null; route: string | null; completed_at: string | null; created_at: string };
type PlayerRow = { relationship: Relationship; name: string; snapshot?: { est_hcp?: number | null; approach_hcp?: number | null; driving_hcp?: number | null; around_green_hcp?: number | null; putting_hcp?: number | null; test_count?: number } };

function CoachPage() {
  const { user, displayName, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("player");
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [myCoach, setMyCoach] = useState<CoachProfile | null>(null);
  const [actions, setActions] = useState<CoachAction[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [clubName, setClubName] = useState("");
  const [actionType, setActionType] = useState<ActionType>("focus");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selectedPlayer = useMemo(() => players.find((p) => p.relationship.player_id === selectedPlayerId) ?? null, [players, selectedPlayerId]);

  useEffect(() => { if (user) void loadAll(); }, [user]);

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
      const [{ data: coach }, { data: myActions }] = await Promise.all([
        db.from("coach_profiles").select("*").eq("user_id", playerRel.coach_id).maybeSingle(),
        db.from("coach_actions").select("*").eq("relationship_id", playerRel.id).order("created_at", { ascending: false }),
      ]);
      setMyCoach(coach ?? null);
      setActions(myActions ?? []);
    } else { setMyCoach(null); setActions([]); }

    const coachRels = allRels.filter((r) => r.coach_id === user.id);
    if (coachRels.length) {
      const ids = coachRels.map((r) => r.player_id);
      const [{ data: profiles }, { data: snapshots }] = await Promise.all([
        db.from("profiles").select("id,display_name").in("id", ids),
        db.from("player_snapshots").select("*").in("user_id", ids),
      ]);
      const rows = coachRels.map((relationship) => ({
        relationship,
        name: profiles?.find((p: any) => p.id === relationship.player_id)?.display_name ?? "Spelare",
        snapshot: snapshots?.find((s: any) => s.user_id === relationship.player_id),
      }));
      setPlayers(rows);
      setSelectedPlayerId((current) => current && ids.includes(current) ? current : ids[0] ?? null);
    } else { setPlayers([]); setSelectedPlayerId(null); }
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

  async function addAction() {
    if (!user || !selectedPlayer || !title.trim()) return;
    const { error } = await db.from("coach_actions").insert({
      relationship_id: selectedPlayer.relationship.id,
      player_id: selectedPlayer.relationship.player_id,
      coach_id: user.id,
      action_type: actionType,
      title: title.trim(),
      body: body.trim() || null,
    });
    if (!error) { setTitle(""); setBody(""); setMessage("Skickat till spelaren."); }
  }

  async function completeAction(id: string, completed: boolean) {
    await db.from("coach_actions").update({ completed_at: completed ? null : new Date().toISOString() }).eq("id", id);
    await loadAll();
  }

  if (loading) return <main className="mx-auto min-h-screen max-w-md p-5">Laddar…</main>;
  if (!user) return <main className="mx-auto min-h-screen max-w-md p-5"><Link to="/konto" className="font-semibold text-primary">Logga in för att använda coachfunktionen →</Link></main>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <div className="flex items-center justify-between"><Link to="/konto" aria-label="Tillbaka" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link><span className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">SG4 Coach</span></div>
      <section className="mt-5 rounded-[30px] border border-border bg-card p-5"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Coach + spelare</p><h1 className="mt-2 font-display text-4xl leading-none">Bättre mellan lektionerna.</h1><p className="mt-3 text-sm text-muted-foreground">Fokus → träning → resultat → nästa fokus.</p></section>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1">
        <button onClick={() => setTab("player")} className={`rounded-xl py-3 text-sm font-semibold ${tab === "player" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Min coach</button>
        <button onClick={() => setTab("coach")} className={`rounded-xl py-3 text-sm font-semibold ${tab === "coach" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Coachvy</button>
      </div>

      {message ? <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm">{message}</p> : null}

      {tab === "player" ? (
        <section className="mt-5 space-y-4">
          {myCoach ? (
            <>
              <div className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div><div><p className="font-semibold">{myCoach.display_name}</p><p className="text-xs text-muted-foreground">{myCoach.club_name ?? "Din coach"}</p></div></div><p className="mt-4 text-xs text-muted-foreground">Träningsdata delas med coachen så länge kopplingen är aktiv.</p></div>
              <div><h2 className="mb-3 font-display text-2xl">Från din coach</h2><div className="space-y-3">{actions.length ? actions.map((a) => <div key={a.id} className="rounded-3xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">{labelFor(a.action_type)}</p><p className="mt-1 font-semibold">{a.title}</p>{a.body ? <p className="mt-1 text-sm text-muted-foreground">{a.body}</p> : null}</div>{a.action_type === "session" || a.action_type === "goal" ? <button onClick={() => completeAction(a.id, Boolean(a.completed_at))} className={`flex h-9 w-9 items-center justify-center rounded-full border ${a.completed_at ? "bg-primary text-primary-foreground" : "bg-background"}`}><Check className="h-4 w-4" /></button> : null}</div></div>) : <p className="text-sm text-muted-foreground">Inga fokus, mål eller pass ännu.</p>}</div></div>
            </>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-5"><h2 className="font-display text-2xl">Lägg till coach</h2><p className="mt-2 text-sm text-muted-foreground">Be din coach om SG4-koden.</p><input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="COACH-AB12" className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3 uppercase" /><button onClick={connectCoach} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Lägg till coach</button></div>
          )}
        </section>
      ) : (
        <section className="mt-5 space-y-4">
          {!coachProfile ? (
            <div className="rounded-3xl border border-border bg-card p-5"><h2 className="font-display text-2xl">Skapa coachprofil</h2><p className="mt-2 text-sm text-muted-foreground">För PGA-pros och tränare som vill följa sina elever mellan lektionerna.</p><input value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Klubb / verksamhet (valfritt)" className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3" /><button onClick={createCoachProfile} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Aktivera coachvy</button></div>
          ) : (
            <>
              <div className="rounded-3xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Din elevkod</p><p className="mt-2 font-display text-4xl tracking-wider">{coachProfile.invite_code}</p><p className="mt-2 text-xs text-muted-foreground">Eleven anger koden under Min coach.</p></div>
              <div><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl">Elever</h2><span className="text-xs text-muted-foreground">{players.length}</span></div><div className="space-y-2">{players.map((p) => <button key={p.relationship.id} onClick={() => setSelectedPlayerId(p.relationship.player_id)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selectedPlayerId === p.relationship.player_id ? "border-primary bg-primary/5" : "border-border bg-card"}`}><span><span className="block font-semibold">{p.name}</span><span className="text-xs text-muted-foreground">{p.snapshot?.test_count ?? 0} tester · HCP {p.snapshot?.est_hcp ?? "–"}</span></span><ChevronRight className="h-4 w-4" /></button>)}</div></div>
              {selectedPlayer ? <div className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-semibold">Styr nästa steg för {selectedPlayer.name}</h3></div><div className="mt-4 grid grid-cols-5 gap-1">{(["focus","goal","session","comment","reaction"] as ActionType[]).map((type) => <button key={type} onClick={() => setActionType(type)} className={`rounded-xl px-2 py-2 text-[10px] font-bold ${actionType === type ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{shortLabel(type)}</button>)}</div><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderFor(actionType)} className="mt-4 w-full rounded-2xl border border-border bg-background px-4 py-3" /><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Kort kommentar (valfritt)" rows={3} className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3" /><button onClick={addAction} className="mt-3 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Skicka till spelaren</button></div> : null}
            </>
          )}
        </section>
      )}
    </main>
  );
}

function labelFor(type: ActionType) { return ({ focus: "Veckans fokus", goal: "Mål", session: "Tilldelat pass", comment: "Coachkommentar", reaction: "Uppmuntran" })[type]; }
function shortLabel(type: ActionType) { return ({ focus: "Fokus", goal: "Mål", session: "Pass", comment: "Kommentar", reaction: "Pepp" })[type]; }
function placeholderFor(type: ActionType) { return ({ focus: "Ex. Approach 100–150 m", goal: "Ex. 70 % inom 10 m", session: "Ex. 18 slag Approach", comment: "Ex. Bra utveckling i dagens pass", reaction: "Ex. Grymt jobbat!" })[type]; }