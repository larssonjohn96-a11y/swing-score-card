import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
  LayoutDashboard,
  MoreHorizontal,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/coach")({ component: CoachPage });

const db = supabase as any;
type CoachView = "overview" | "players" | "focus" | "progress" | "more";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean; created_at?: string };
type TrainingSession = { id: string; test_id: string; category: string; played_at: string; score: number | null; test_handicap: number | null; metrics: Record<string, unknown> | null };
type PlayerRow = { relationship: Relationship; name: string; snapshot?: { est_hcp?: number | null; test_count?: number } };
type FocusBlock = {
  id: string;
  relationship_id: string;
  player_id: string;
  coach_id: string;
  primary_focus: string;
  secondary_focus: string | null;
  why_text: string | null;
  coach_note: string | null;
  recommendations: string[];
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "extended";
  extended_from: string | null;
  created_at: string;
};

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

const DEMO_BLOCKS: FocusBlock[] = [
  { id: "demo-block-emma-2", relationship_id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", primary_focus: "Around the Green", secondary_focus: "Putting", why_text: "Få jämnare kontakt och bättre längdkontroll runt green.", coach_note: "Tänk på händerna framför bollen när du chippar.", recommendations: ["8-bollar", "Upp & in", "Around the Green HCP-test"], start_date: "2026-09-02", end_date: "2026-10-14", status: "active", extended_from: null, created_at: "2026-09-02T10:00:00Z" },
  { id: "demo-block-emma-1", relationship_id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", primary_focus: "Approach 100–150 m", secondary_focus: null, why_text: "Stabilare startlinje och längdkontroll.", coach_note: "Prioritera rytm framför fart.", recommendations: ["Approach Precision", "Random Approach"], start_date: "2026-07-01", end_date: "2026-08-20", status: "completed", extended_from: null, created_at: "2026-07-01T10:00:00Z" },
  { id: "demo-block-oskar-1", relationship_id: "demo-rel-oskar", player_id: "demo-oskar", coach_id: "demo-john", primary_focus: "Off the Tee", secondary_focus: "Speed", why_text: "Behåll bollhastigheten men minska spridningen.", coach_note: "Låt tempot styra. Jaga inte extra fart i varje slag.", recommendations: ["Driver med konsekvens", "Fairway Streak"], start_date: "2026-08-25", end_date: "2026-10-06", status: "active", extended_from: null, created_at: "2026-08-25T10:00:00Z" },
  { id: "demo-block-sara-1", relationship_id: "demo-rel-sara", player_id: "demo-sara", coach_id: "demo-john", primary_focus: "Putting", secondary_focus: "Around the Green", why_text: "Bygg trygghet från korta avstånd och runt green.", coach_note: "Håll samma rutin på varje putt.", recommendations: ["Klock-putt", "Putting Streak", "8-bollar"], start_date: "2026-08-12", end_date: "2026-09-23", status: "active", extended_from: null, created_at: "2026-08-12T10:00:00Z" },
];

const glass = "border border-slate-200/95 bg-white/96 shadow-[0_18px_42px_-24px_rgba(30,41,59,.28),0_2px_8px_-4px_rgba(30,41,59,.16),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[22px] dark:border-white/12 dark:bg-white/[0.10]";

function CoachPage() {
  useHideBottomNav(true);
  const { user, displayName, loading } = useAuth();
  const isJohnMaster = (displayName ?? "").trim().toLowerCase() === "john";
  const [view, setView] = useState<CoachView>("overview");
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sessions, setSessions] = useState<Record<string, TrainingSession[]>>({});
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const hasRealCoachStudents = players.some((player) => player.relationship.id !== "preview-self-john");
  const visiblePlayers = isJohnMaster && !hasRealCoachStudents ? [...players, ...DEMO_PLAYERS] : players;
  const visibleSessions = isJohnMaster && !hasRealCoachStudents ? { ...DEMO_SESSIONS, ...sessions } : sessions;
  const visibleBlocks = isJohnMaster && !hasRealCoachStudents ? [...focusBlocks, ...DEMO_BLOCKS] : focusBlocks;
  const effectiveProfile = profile ?? (isJohnMaster ? { user_id: user?.id ?? "demo-john", display_name: "Coach John", club_name: null, invite_code: "JOHN" } : null);
  const selectedPlayer = useMemo(() => visiblePlayers.find((p) => p.relationship.player_id === selectedPlayerId) ?? visiblePlayers[0] ?? null, [visiblePlayers, selectedPlayerId]);

  useEffect(() => { if (user) void loadCoachData(); }, [user]);
  useEffect(() => { if (!selectedPlayerId && visiblePlayers.length) setSelectedPlayerId(visiblePlayers[0].relationship.player_id); }, [visiblePlayers, selectedPlayerId]);

  async function loadCoachData() {
    if (!user) return;
    const [{ data: coachProfile }, { data: rels }, { data: blocks }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("coach_relationships").select("*").eq("coach_id", user.id).eq("status", "accepted"),
      db.from("coach_focus_blocks").select("*").eq("coach_id", user.id).order("start_date", { ascending: false }).limit(100),
    ]);
    setProfile(coachProfile ?? null);
    setFocusBlocks(((blocks ?? []) as FocusBlock[]).map((block) => ({ ...block, recommendations: Array.isArray(block.recommendations) ? block.recommendations : [] })));

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
    if (nextView) setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createFocusBlock(input: Omit<FocusBlock, "id" | "relationship_id" | "player_id" | "coach_id" | "status" | "extended_from" | "created_at">) {
    if (!user || !selectedPlayer) return;
    const preview = selectedPlayer.relationship.id === "preview-self-john" || selectedPlayer.relationship.id.startsWith("demo-");
    const existingActive = focusBlocks.find((block) => block.player_id === selectedPlayer.relationship.player_id && block.status === "active");

    if (preview) {
      setFocusBlocks((current) => [
        { id: `preview-block-${Date.now()}`, relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, status: "active", extended_from: null, created_at: new Date().toISOString(), ...input },
        ...current.map((block) => block.player_id === selectedPlayer.relationship.player_id && block.status === "active" ? { ...block, status: "completed" as const } : block),
      ]);
      setMessage("Preview: nytt fokusblock skapat.");
      return;
    }

    if (existingActive) await db.from("coach_focus_blocks").update({ status: "completed" }).eq("id", existingActive.id);
    const { data, error } = await db.from("coach_focus_blocks").insert({
      relationship_id: selectedPlayer.relationship.id,
      player_id: selectedPlayer.relationship.player_id,
      coach_id: user.id,
      ...input,
    }).select("*").single();
    if (!error && data) {
      setFocusBlocks((current) => [data as FocusBlock, ...current.map((block) => existingActive?.id === block.id ? { ...block, status: "completed" as const } : block)]);
      setMessage("Fokusblocket är sparat.");
    }
  }

  async function finishBlock(block: FocusBlock) {
    const preview = block.id.startsWith("demo-") || block.id.startsWith("preview-");
    if (!preview) await db.from("coach_focus_blocks").update({ status: "completed" }).eq("id", block.id);
    setFocusBlocks((current) => current.map((item) => item.id === block.id ? { ...item, status: "completed" } : item));
    setMessage("Fokusperioden är avslutad.");
  }

  async function extendBlock(block: FocusBlock) {
    if (!user || !selectedPlayer) return;
    const durationDays = Math.max(14, Math.round((+new Date(`${block.end_date}T00:00:00`) - +new Date(`${block.start_date}T00:00:00`)) / 86400000) + 1);
    const start = new Date(`${block.end_date}T00:00:00`);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays - 1);
    const next = { primary_focus: block.primary_focus, secondary_focus: block.secondary_focus, why_text: block.why_text, coach_note: block.coach_note, recommendations: block.recommendations, start_date: dateInput(start), end_date: dateInput(end) };
    const preview = block.id.startsWith("demo-") || block.id.startsWith("preview-") || selectedPlayer.relationship.id === "preview-self-john";

    if (preview) {
      setFocusBlocks((current) => [
        { id: `preview-block-${Date.now()}`, relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, status: "active", extended_from: block.id, created_at: new Date().toISOString(), ...next },
        ...current.map((item) => item.id === block.id ? { ...item, status: "extended" as const } : item),
      ]);
      setMessage("Preview: fokusperioden är förlängd.");
      return;
    }

    await db.from("coach_focus_blocks").update({ status: "extended" }).eq("id", block.id);
    const { data, error } = await db.from("coach_focus_blocks").insert({ relationship_id: block.relationship_id, player_id: block.player_id, coach_id: block.coach_id, extended_from: block.id, ...next }).select("*").single();
    if (!error && data) {
      setFocusBlocks((current) => [data as FocusBlock, ...current.map((item) => item.id === block.id ? { ...item, status: "extended" as const } : item)]);
      setMessage("Fokusperioden är förlängd.");
    }
  }

  if (loading) return <main className="min-h-screen bg-[#e9edf1] p-5 text-slate-900 dark:bg-[#101419] dark:text-slate-100">Laddar…</main>;
  if (!user) return <main className="min-h-screen bg-[#e9edf1] p-5 dark:bg-[#101419]"><Link to="/konto" className="font-medium text-sky-700 dark:text-sky-300">Logga in för att använda coachvyn →</Link></main>;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e9edf1] text-slate-900 dark:bg-[#101419] dark:text-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-sky-100/20 blur-3xl dark:bg-sky-500/8" />
      <div className="pointer-events-none absolute -right-28 top-64 h-72 w-72 rounded-full bg-slate-200/30 blur-3xl dark:bg-slate-700/15" />
      <div className="relative mx-auto w-full max-w-md px-5 pb-32 pt-6">
        <header className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-slate-600 dark:text-slate-400">SG4</p><span className="mt-0.5 block text-[22px] font-semibold tracking-[-.04em]">Coach</span></div>
          <div className="relative">
            <button type="button" onClick={() => setRoleMenuOpen((open) => !open)} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-slate-800 transition active:scale-[.98] dark:text-slate-200 ${glass}`}>{isJohnMaster ? "Coach John" : effectiveProfile?.display_name ?? "Coach"}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} /></button>
            {roleMenuOpen ? <div className={`absolute right-0 z-50 mt-2 w-48 rounded-[22px] p-1.5 ${glass}`}><Link to="/" onClick={() => setRoleMenuOpen(false)} className="flex w-full items-center rounded-2xl px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Byt till spelarvy</Link></div> : null}
          </div>
        </header>

        {message ? <p className={`mt-4 rounded-[22px] px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${glass}`}>{message}</p> : null}

        {view === "overview" ? <OverviewView players={visiblePlayers} sessions={visibleSessions} blocks={visibleBlocks} effectiveProfile={effectiveProfile} isJohnMaster={isJohnMaster} onPlayer={(id) => choosePlayer(id, "players")} onFocus={(id) => choosePlayer(id, "focus")} /> : null}
        {view === "players" ? <PlayersView players={visiblePlayers} selectedPlayerId={selectedPlayerId} sessions={visibleSessions} blocks={visibleBlocks} onPlayer={(id) => choosePlayer(id)} onFocus={(id) => choosePlayer(id, "focus")} /> : null}
        {view === "focus" ? <FocusView players={visiblePlayers} selectedPlayer={selectedPlayer} selectedPlayerId={selectedPlayerId} blocks={visibleBlocks} setSelectedPlayerId={setSelectedPlayerId} onCreate={createFocusBlock} onFinish={finishBlock} onExtend={extendBlock} /> : null}
        {view === "progress" ? <ProgressView players={visiblePlayers} sessions={visibleSessions} blocks={visibleBlocks} onPlayer={(id) => choosePlayer(id, "players")} /> : null}
        {view === "more" ? <MoreView profile={effectiveProfile} isJohnMaster={isJohnMaster} /> : null}
      </div>
      <CoachNav view={view} onChange={setView} />
    </main>
  );
}

function OverviewView({ players, sessions, blocks, effectiveProfile, isJohnMaster, onPlayer, onFocus }: { players: PlayerRow[]; sessions: Record<string, TrainingSession[]>; blocks: FocusBlock[]; effectiveProfile: CoachProfile | null; isJohnMaster: boolean; onPlayer: (id: string) => void; onFocus: (id: string) => void }) {
  const attention = players.map((player) => {
    const active = activeBlockFor(player.relationship.player_id, blocks);
    if (!active) return { player, text: "Saknar aktivt fokus", action: "focus" as const };
    const daysLeft = daysUntil(active.end_date);
    if (daysLeft <= 7) return { player, text: daysLeft < 0 ? "Fokusperioden har löpt ut" : `${daysLeft} dagar kvar av fokusperioden`, action: "focus" as const };
    return null;
  }).filter(Boolean).slice(0, 4) as { player: PlayerRow; text: string; action: "focus" }[];

  const activeCount = players.filter((player) => activeBlockFor(player.relationship.player_id, blocks)).length;
  return <>
    <section className={`mt-6 overflow-hidden rounded-[34px] p-6 ${glass}`}>
      <div className="flex items-center justify-between"><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-900">Översikt</span><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sky-800 shadow-sm"><LayoutDashboard className="h-4.5 w-4.5" /></span></div>
      <h1 className="mt-5 text-[38px] font-medium leading-[.98] tracking-[-.055em]">Riktning, inte detaljstyrning.</h1>
      <p className="mt-3 max-w-[300px] text-[14px] leading-6 text-slate-600">Sätt vad eleven bör fokusera på. Eleven bestämmer själv när och hur mycket den tränar.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-300/80 pt-4"><Metric label="Elever" value={String(players.length)} /><Metric label="Aktiva fokus" value={String(activeCount)} /><Metric label="Fokusblock" value={String(blocks.length)} /></div>
      {effectiveProfile ? <div className="mt-4 text-right"><span className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-500">Elevkod </span><span className="text-sm font-semibold tracking-[.08em]">{isJohnMaster ? "JOHN" : effectiveProfile.invite_code}</span></div> : null}
    </section>

    <section className="mt-7"><SectionTitle eyebrow="Att göra" title="Fokus att följa upp" right={`${attention.length}`} />
      <div className="space-y-2.5">{attention.length ? attention.map(({ player, text }) => <button key={player.relationship.id} onClick={() => onFocus(player.relationship.player_id)} className={`flex w-full items-center justify-between rounded-[24px] p-4 text-left ${glass}`}><span><span className="block text-[14px] font-medium">{player.name}</span><span className="mt-1 block text-xs text-slate-600">{text}</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>) : <div className={`rounded-[24px] p-4 text-sm text-slate-600 ${glass}`}>Alla elever har ett aktuellt fokus.</div>}</div>
    </section>

    <section className="mt-8"><SectionTitle eyebrow="Elever" title="Aktuellt fokus" /><div className="space-y-2.5">{players.map((player) => <PlayerFocusCard key={player.relationship.id} player={player} block={activeBlockFor(player.relationship.player_id, blocks)} sessions={sessions[player.relationship.player_id] ?? []} onClick={() => onPlayer(player.relationship.player_id)} />)}</div></section>
  </>;
}

function PlayersView({ players, selectedPlayerId, sessions, blocks, onPlayer, onFocus }: { players: PlayerRow[]; selectedPlayerId: string | null; sessions: Record<string, TrainingSession[]>; blocks: FocusBlock[]; onPlayer: (id: string) => void; onFocus: (id: string) => void }) {
  const selected = players.find((p) => p.relationship.player_id === selectedPlayerId) ?? players[0];
  const selectedSessions = selected ? sessions[selected.relationship.player_id] ?? [] : [];
  const selectedBlocks = selected ? blocks.filter((block) => block.player_id === selected.relationship.player_id).sort((a, b) => b.start_date.localeCompare(a.start_date)) : [];
  const active = selectedBlocks.find((block) => block.status === "active") ?? null;
  const progress = selected ? getProgress(selected, selectedSessions) : null;

  return <>
    <section className="mt-7"><SectionTitle eyebrow="Elever" title="Alla spelare" /><div className="space-y-2.5">{players.map((player) => <PlayerFocusCard key={player.relationship.id} player={player} block={activeBlockFor(player.relationship.player_id, blocks)} sessions={sessions[player.relationship.player_id] ?? []} active={selected?.relationship.player_id === player.relationship.player_id} onClick={() => onPlayer(player.relationship.player_id)} />)}</div></section>

    {selected ? <>
      <section className="mt-8"><SectionTitle eyebrow="Elevprofil" title={selected.name} right={relationshipAge(selected.relationship)} />
        <div className={`rounded-[30px] p-5 ${glass}`}>
          <div className="grid grid-cols-3 gap-2"><Metric label="Start" value={progress?.start !== null && progress?.start !== undefined ? formatNumber(progress.start) : "–"} /><Metric label="Nu" value={progress?.current !== null && progress?.current !== undefined ? formatNumber(progress.current) : "–"} /><Metric label="Förändring" value={progress?.improvement !== null && progress?.improvement !== undefined ? `${progress.improvement > 0 ? "−" : "+"}${formatNumber(Math.abs(progress.improvement))}` : "–"} positive={Boolean(progress && progress.improvement > 0)} /></div>
          <div className="mt-5 border-t border-slate-300/80 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Samarbete</p><p className="mt-1 text-sm text-slate-700">{relationshipText(selected.relationship)}</p><p className="mt-2 text-xs text-slate-500">{selectedBlocks.length} fokusblock tillsammans</p></div>
        </div>
      </section>

      <section className="mt-8"><SectionTitle eyebrow="Från tränaren" title="Aktuellt fokus" />{active ? <FocusBlockCard block={active} /> : <div className={`rounded-[28px] p-5 ${glass}`}><p className="text-sm text-slate-600">Inget aktivt fokus just nu.</p></div>}<button onClick={() => onFocus(selected.relationship.player_id)} className="mt-3 w-full rounded-[20px] bg-sky-700 py-3.5 text-sm font-medium text-white">{active ? "Hantera fokus" : "Skapa fokus"}</button></section>

      <section className="mt-8"><SectionTitle eyebrow="Historik" title="Fokusblock" right={`${selectedBlocks.length} st`} /><div className="space-y-3">{selectedBlocks.length ? selectedBlocks.map((block) => <FocusHistoryRow key={block.id} block={block} />) : <div className={`rounded-[24px] p-4 text-sm text-slate-500 ${glass}`}>Ingen fokushistorik ännu.</div>}</div></section>

      <section className="mt-8"><SectionTitle eyebrow="Underlag" title="Senaste träningsdata" right={`${selectedSessions.length} pass`} /><div className={`rounded-[28px] p-5 ${glass}`}><p className="text-sm leading-6 text-slate-600">Träningsdata finns här som stöd för din bedömning, inte som en att-göra-lista för coachen.</p><div className="mt-4 space-y-3">{selectedSessions.slice(0, 3).map((session) => <SessionSummary key={session.id} session={session} />)}{!selectedSessions.length ? <p className="text-sm text-slate-500">Ingen träningsdata ännu.</p> : null}</div></div></section>
    </> : null}
  </>;
}

function FocusView({ players, selectedPlayer, selectedPlayerId, blocks, setSelectedPlayerId, onCreate, onFinish, onExtend }: { players: PlayerRow[]; selectedPlayer: PlayerRow | null; selectedPlayerId: string | null; blocks: FocusBlock[]; setSelectedPlayerId: (id: string) => void; onCreate: (input: Omit<FocusBlock, "id" | "relationship_id" | "player_id" | "coach_id" | "status" | "extended_from" | "created_at">) => void; onFinish: (block: FocusBlock) => void; onExtend: (block: FocusBlock) => void }) {
  const active = selectedPlayer ? activeBlockFor(selectedPlayer.relationship.player_id, blocks) : null;
  const history = selectedPlayer ? blocks.filter((block) => block.player_id === selectedPlayer.relationship.player_id).sort((a, b) => b.start_date.localeCompare(a.start_date)) : [];
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [why, setWhy] = useState("");
  const [note, setNote] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [weeks, setWeeks] = useState(6);

  function save() {
    if (!primary.trim()) return;
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + weeks * 7 - 1);
    onCreate({ primary_focus: primary.trim(), secondary_focus: secondary.trim() || null, why_text: why.trim() || null, coach_note: note.trim() || null, recommendations: recommendations.split("\n").map((item) => item.trim()).filter(Boolean), start_date: dateInput(start), end_date: dateInput(end) });
    setPrimary(""); setSecondary(""); setWhy(""); setNote(""); setRecommendations("");
  }

  return <>
    <section className="mt-7"><SectionTitle eyebrow="Fokus" title="Styr riktningen" /><div className={`rounded-[30px] p-5 ${glass}`}><p className="text-sm leading-6 text-slate-600">Sätt vad eleven bör prioritera de kommande veckorna. Ingen dagsplanering och inga hårda resultatkrav.</p><label className="mt-5 block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Elev</label><select value={selectedPlayerId ?? ""} onChange={(e) => setSelectedPlayerId(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none">{players.map((player) => <option key={player.relationship.id} value={player.relationship.player_id}>{player.name}</option>)}</select></div></section>

    {active ? <section className="mt-8"><SectionTitle eyebrow="Aktivt" title="Nuvarande fokus" right={`${daysUntil(active.end_date)} dagar kvar`} /><FocusBlockCard block={active} /><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => onExtend(active)} className="rounded-[18px] border border-sky-300 bg-sky-50 py-3 text-sm font-medium text-sky-900">Förläng fokus</button><button onClick={() => onFinish(active)} className="rounded-[18px] border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700">Avsluta</button></div></section> : null}

    <section className="mt-8"><SectionTitle eyebrow={active ? "Byt riktning" : "Nytt fokus"} title={active ? "Skapa nästa fokusperiod" : "Skapa fokusperiod"} /><div className={`rounded-[30px] p-5 ${glass}`}>
      <FieldLabel>Huvudfokus</FieldLabel><input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="Ex. Around the Green" className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
      <FieldLabel className="mt-4">Sekundärt fokus</FieldLabel><input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="Valfritt, ex. Putting" className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
      <FieldLabel className="mt-4">Varför detta fokus?</FieldLabel><textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder="Kort riktning, inte ett hårt mål." className="mt-2 w-full resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
      <FieldLabel className="mt-4">Coachens kommentar</FieldLabel><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ex. Tänk på händerna framför bollen när du chippar." className="mt-2 w-full resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
      <FieldLabel className="mt-4">Rekommenderade tester & övningar</FieldLabel><textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={3} placeholder={"En per rad\n8-bollar\nUpp & in"} className="mt-2 w-full resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400" />
      <FieldLabel className="mt-4">Period</FieldLabel><div className="mt-2 grid grid-cols-4 gap-2">{[2,4,6,8].map((value) => <button key={value} onClick={() => setWeeks(value)} className={`rounded-[16px] border py-2.5 text-xs font-medium ${weeks === value ? "border-sky-400 bg-sky-100 text-sky-900" : "border-slate-300 bg-white text-slate-600"}`}>{value} v</button>)}</div>
      <button onClick={save} disabled={!selectedPlayer || !primary.trim()} className="mt-5 w-full rounded-[20px] bg-sky-700 py-3.5 text-sm font-medium text-white disabled:opacity-40">{active ? "Starta nytt fokus" : "Skapa fokus"}</button>
    </div></section>

    <section className="mt-8"><SectionTitle eyebrow="Gemensam resa" title="Fokushistorik" right={`${history.length} block`} /><div className="space-y-3">{history.map((block) => <FocusHistoryRow key={block.id} block={block} />)}{!history.length ? <div className={`rounded-[24px] p-4 text-sm text-slate-500 ${glass}`}>När ni avslutar fokusperioder byggs historiken upp här.</div> : null}</div></section>
  </>;
}

function ProgressView({ players, sessions, blocks, onPlayer }: { players: PlayerRow[]; sessions: Record<string, TrainingSession[]>; blocks: FocusBlock[]; onPlayer: (id: string) => void }) {
  const improving = players.filter((player) => { const x = getProgress(player, sessions[player.relationship.player_id] ?? []); return x.improvement !== null && x.improvement > 0; }).length;
  return <>
    <section className={`mt-6 rounded-[34px] p-6 ${glass}`}><div className="flex items-center justify-between"><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-900">Utveckling</span><BarChart3 className="h-5 w-5 text-sky-800" /></div><h1 className="mt-5 text-[34px] font-medium leading-none tracking-[-.05em]">Data som underlag.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Se om riktningen verkar fungera utan att göra varje fokusperiod till ett prestationskrav.</p><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Elever" value={String(players.length)} /><Metric label="Positiv trend" value={String(improving)} positive={improving > 0} /><Metric label="Block" value={String(blocks.length)} /></div></section>
    <section className="mt-8"><SectionTitle eyebrow="Start → nu" title="Elevutveckling" /><div className="space-y-3">{players.map((player) => { const progress = getProgress(player, sessions[player.relationship.player_id] ?? []); const count = blocks.filter((block) => block.player_id === player.relationship.player_id).length; return <button key={player.relationship.id} onClick={() => onPlayer(player.relationship.player_id)} className={`w-full rounded-[28px] p-5 text-left ${glass}`}><div className="flex items-center justify-between"><div><p className="text-[15px] font-medium">{player.name}</p><p className="mt-1 text-xs text-slate-500">{count} fokusblock · {relationshipText(player.relationship)}</p></div><ChevronRight className="h-4 w-4 text-slate-500" /></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Start" value={progress.start !== null ? formatNumber(progress.start) : "–"} /><Metric label="Nu" value={progress.current !== null ? formatNumber(progress.current) : "–"} /><Metric label="Trend" value={progress.improvement !== null ? `${progress.improvement > 0 ? "−" : "+"}${formatNumber(Math.abs(progress.improvement))}` : "–"} positive={Boolean(progress.improvement && progress.improvement > 0)} /></div></button>; })}</div></section>
  </>;
}

function MoreView({ profile, isJohnMaster }: { profile: CoachProfile | null; isJohnMaster: boolean }) {
  return <section className="mt-7"><SectionTitle eyebrow="Mer" title="Coachinställningar" /><div className={`rounded-[30px] p-5 ${glass}`}><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Elevkod</p><p className="mt-2 text-3xl font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : profile?.invite_code ?? "–"}</p><p className="mt-2 text-sm leading-6 text-slate-600">Elever använder koden för att koppla sitt SG4-konto till dig.</p></div><div className={`mt-3 rounded-[24px] p-4 ${glass}`}><p className="text-sm font-medium">Coachprincip</p><p className="mt-1 text-xs leading-5 text-slate-600">Sätt riktning och fokus. Eleven äger tempo, träningsmängd och vardagsplanering.</p></div><Link to="/" className={`mt-3 flex items-center justify-between rounded-[24px] px-4 py-4 text-sm font-medium ${glass}`}><span>Byt till spelarvy</span><ChevronRight className="h-4 w-4 text-slate-500" /></Link></section>;
}

function CoachNav({ view, onChange }: { view: CoachView; onChange: (view: CoachView) => void }) {
  const items = [["overview", "Översikt", LayoutDashboard], ["players", "Elever", Users], ["focus", "Fokus", Target], ["progress", "Utveckling", BarChart3], ["more", "Mer", MoreHorizontal]] as const;
  return <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="grid grid-cols-5 rounded-[30px] border border-slate-200 bg-white/98 px-1.5 py-2 shadow-[0_18px_48px_-16px_rgba(30,41,59,.40)] backdrop-blur-2xl">{items.map(([key, label, Icon]) => { const active = view === key; return <button key={key} onClick={() => { onChange(key); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-1 py-2 transition ${active ? "bg-sky-100 text-sky-900" : "text-slate-500"}`}><Icon className="h-[19px] w-[19px]" /><span className="truncate text-[9px] font-semibold">{label}</span></button>; })}</div></nav>;
}

function PlayerFocusCard({ player, block, sessions, active, onClick }: { player: PlayerRow; block: FocusBlock | null; sessions: TrainingSession[]; active?: boolean; onClick: () => void }) {
  const progress = getProgress(player, sessions);
  return <button onClick={onClick} className={`w-full rounded-[24px] p-4 text-left transition-all ${active ? "border border-sky-300 bg-white shadow-[0_12px_28px_-20px_rgba(14,116,144,.45)]" : glass}`}><div className="flex items-center justify-between"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${active ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-700 ring-1 ring-slate-300"}`}>{player.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-[15px] font-medium">{player.name}</p><p className="mt-1 truncate text-xs text-slate-500">{block ? block.primary_focus : "Inget aktivt fokus"}</p></div></div><ChevronRight className="h-4 w-4 text-slate-500" /></div><div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500"><span>{block ? `${formatDate(block.start_date)}–${formatDate(block.end_date)}` : "Skapa nästa riktning"}</span><span>HCP {progress.current !== null ? formatNumber(progress.current) : "–"}</span></div></button>;
}

function FocusBlockCard({ block }: { block: FocusBlock }) {
  return <div className={`rounded-[30px] p-5 ${glass}`}><div className="flex items-center justify-between"><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-sky-900">Fokus från tränaren</span><span className="text-[11px] font-medium text-slate-500">{formatDate(block.start_date)} – {formatDate(block.end_date)}</span></div><h3 className="mt-5 text-[26px] font-medium tracking-[-.04em]">{block.primary_focus}</h3>{block.secondary_focus ? <p className="mt-1 text-sm text-slate-600">Sekundärt: {block.secondary_focus}</p> : null}{block.why_text ? <div className="mt-5"><MiniLabel>Riktning</MiniLabel><p className="mt-1 text-sm leading-6 text-slate-700">{block.why_text}</p></div> : null}{block.recommendations.length ? <div className="mt-5"><MiniLabel>Rekommenderat</MiniLabel><div className="mt-2 flex flex-wrap gap-2">{block.recommendations.map((item) => <span key={item} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">{item}</span>)}</div></div> : null}{block.coach_note ? <div className="mt-5 rounded-[20px] border border-sky-200 bg-sky-50 p-4"><MiniLabel>Coachens kommentar</MiniLabel><p className="mt-1 text-sm leading-6 text-slate-800">“{block.coach_note}”</p></div> : null}</div>;
}

function FocusHistoryRow({ block }: { block: FocusBlock }) {
  return <div className={`rounded-[24px] p-4 ${glass}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{statusLabel(block.status)}</p><p className="mt-1 text-sm font-medium text-slate-900">{block.primary_focus}</p>{block.secondary_focus ? <p className="mt-1 text-xs text-slate-600">+ {block.secondary_focus}</p> : null}</div><span className="text-[10px] text-slate-500">{formatDate(block.start_date)}–{formatDate(block.end_date)}</span></div></div>;
}

function SessionSummary({ session }: { session: TrainingSession }) {
  return <div className="border-b border-slate-200 pb-3 last:border-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{categoryLabel(session.category)}</p><p className="mt-1 text-sm font-medium text-slate-900">{testLabel(session.test_id)}</p></div><span className="text-[11px] text-slate-500">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div></div>;
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 shadow-[0_5px_14px_-10px_rgba(30,41,59,.28)]"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p><p className={`mt-1 text-[17px] font-medium tracking-[-.03em] ${positive ? "text-emerald-700" : "text-slate-900"}`}>{value}</p></div>;
}

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: string }) {
  return <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{eyebrow}</p><h2 className="mt-1 text-xl font-medium tracking-[-.035em] text-slate-900">{title}</h2></div>{right ? <span className="text-xs text-slate-500">{right}</span> : null}</div>;
}

function FieldLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <label className={`block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 ${className}`}>{children}</label>; }
function MiniLabel({ children }: { children: React.ReactNode }) { return <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{children}</p>; }

function activeBlockFor(playerId: string, blocks: FocusBlock[]) { return blocks.filter((block) => block.player_id === playerId && block.status === "active").sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null; }
function getProgress(player: PlayerRow, sessions: TrainingSession[]) { const hcpSessions = [...sessions].filter((session) => session.test_handicap !== null).sort((a, b) => +new Date(a.played_at) - +new Date(b.played_at)); const start = hcpSessions[0]?.test_handicap ?? null; const latestMeasured = hcpSessions[hcpSessions.length - 1]?.test_handicap ?? null; const current = player.snapshot?.est_hcp ?? latestMeasured; const improvement = start !== null && current !== null && current !== undefined ? start - current : null; return { start, current: current ?? null, improvement }; }
function relationshipAge(relationship: Relationship) { if (!relationship.created_at) return "Live-konto"; const days = Math.max(0, Math.floor((Date.now() - +new Date(relationship.created_at)) / 86400000)); if (days < 31) return `${days} dagar`; const months = Math.floor(days / 30.44); if (months < 12) return `${months} mån`; const years = Math.floor(months / 12); const rest = months % 12; return rest ? `${years} år ${rest} mån` : `${years} år`; }
function relationshipText(relationship: Relationship) { if (!relationship.created_at) return "Live-data från spelarens konto. Ingen faktisk coachrelation finns ännu."; return `Elev sedan ${new Date(relationship.created_at).toLocaleDateString("sv-SE")} · ${relationshipAge(relationship)} tillsammans`; }
function daysUntil(date: string) { return Math.ceil((+new Date(`${date}T23:59:59`) - Date.now()) / 86400000); }
function dateInput(date: Date) { return date.toISOString().slice(0, 10); }
function formatDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }); }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function statusLabel(status: FocusBlock["status"]) { return status === "active" ? "Aktivt" : status === "extended" ? "Förlängt" : "Avslutat"; }
function categoryLabel(category: string) { return ({ driving: "Off the Tee", approach: "Approach", "around-the-green": "Around the Green", puttning: "Putting", speed: "Speed" } as Record<string, string>)[category] ?? category; }
function testLabel(testId: string) { return testId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
